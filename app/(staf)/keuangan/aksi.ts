"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePage } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { StatusSantri } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { assertUnit } from "@/lib/unit-scope";

/** Jenis invoice untuk iuran bulanan santri pondok (syariah + komponen). */
const JENIS_IURAN = "IURAN_BULANAN";

const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type HasilAksi = { ok: boolean; pesan: string; paymentId?: string };

const aktor = (s: SessionPayload) => ({ id: s.userId, nama: s.nama });

const keNominal = (v: FormDataEntryValue | null): number => {
  const n = Math.round(Number(String(v ?? "").replace(/[^0-9]/g, "")));
  return Number.isFinite(n) ? n : 0;
};

/** Generate tagihan iuran bulanan untuk semua santri aktif (idempoten). */
export async function generateTagihanBulanan(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  const periode = String(formData.get("periode") ?? "").trim();
  if (!PERIODE_RE.test(periode)) return { ok: false, pesan: "Periode tidak valid (format YYYY-MM)." };

  const [komponen, santri, overrides] = await Promise.all([
    prisma.tarifIuran.findMany({ where: { aktif: true }, orderBy: { id: "asc" } }),
    prisma.santri.findMany({ where: { status: StatusSantri.Aktif }, select: { id: true } }),
    prisma.tarifSantriOverride.findMany(),
  ]);
  if (komponen.length === 0) return { ok: false, pesan: "Master tarif iuran belum di-seed." };
  if (santri.length === 0) return { ok: false, pesan: "Tidak ada santri aktif." };

  const totalStandar = komponen.reduce((s, k) => s + Number(k.nominal), 0);
  const ovMap = new Map(overrides.map((o) => [String(o.santriId), o]));
  const sudah = await prisma.invoice.findMany({
    where: { type: JENIS_IURAN, period: periode },
    select: { santriId: true },
  });
  const sudahSet = new Set(sudah.map((r) => String(r.santriId)));
  const [yy, mm] = periode.split("-").map(Number);
  const jatuhTempo = new Date(yy, mm, 0); // hari terakhir bulan periode

  const data = santri
    .filter((s) => !sudahSet.has(String(s.id)))
    .map((s) => {
      const ov = ovMap.get(String(s.id));
      const nominal = ov ? Number(ov.totalBulanan) : totalStandar;
      const rincian = ov
        ? { override: true, totalBulanan: nominal, keterangan: ov.keterangan }
        : Object.fromEntries(komponen.map((k) => [k.kode, Number(k.nominal)]));
      return {
        code: `IUR-${periode.replace("-", "")}-${s.id}`,
        santriId: s.id,
        type: JENIS_IURAN,
        period: periode,
        amount: nominal,
        dueDate: jatuhTempo,
        rincian,
      };
    });
  if (data.length > 0) await prisma.invoice.createMany({ data, skipDuplicates: true });

  await recordAudit({
    aksi: "generate_tagihan",
    entitas: "invoice",
    ringkasan: `Generate tagihan iuran ${periode}: ${data.length} dibuat (${sudahSet.size} sudah ada).`,
    aktor: aktor(session),
  });
  revalidatePath("/keuangan");
  return { ok: true, pesan: `Tagihan ${periode}: ${data.length} dibuat, ${sudahSet.size} sudah ada.` };
}

/**
 * Catat pembayaran iuran: OTOMATIS 2 pencatatan dalam satu transaksi —
 * (1) Payment = buku syariah masing-masing santri,
 * (2) CashTransaction Inbound = buku bendahara (Maskur).
 */
export async function catatPembayaran(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  let invoiceId: bigint;
  try {
    invoiceId = BigInt(String(formData.get("invoiceId") ?? ""));
  } catch {
    return { ok: false, pesan: "ID tagihan tidak valid." };
  }
  const tanggal = new Date(`${String(formData.get("tanggal") ?? "")}T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) return { ok: false, pesan: "Tanggal tidak valid." };
  const nominal = keNominal(formData.get("nominal"));
  const metode = String(formData.get("metode") ?? "Tunai").slice(0, 64) || "Tunai";
  const keterangan = String(formData.get("keterangan") ?? "").trim().slice(0, 64);

  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { santri: { include: { person: true } } },
  });
  if (!inv) return { ok: false, pesan: "Tagihan tidak ditemukan." };
  const sisa = Number(inv.amount) - Number(inv.paidAmount);
  if (nominal <= 0) return { ok: false, pesan: "Nominal harus lebih dari 0." };
  if (nominal > sisa) return { ok: false, pesan: `Nominal melebihi sisa tagihan (Rp${sisa.toLocaleString("id-ID")}).` };

  const nama = inv.santri.person.fullName;
  const pay = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: { invoiceId, date: tanggal, amount: nominal, method: metode, reference: keterangan || null },
    });
    await tx.invoice.update({ where: { id: invoiceId }, data: { paidAmount: { increment: nominal } } });
    const kode = `KAS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0")}`;
    await tx.cashTransaction.create({
      data: {
        code: kode,
        date: tanggal,
        description: `Iuran ${inv.period} — ${nama}${keterangan ? ` (${keterangan})` : ""}`,
        category: "Iuran Santri",
        method: metode,
        direction: "Inbound",
        amount: nominal,
        unitId: inv.santri.unitId,
      },
    });
    return p;
  });

  await recordAudit({
    aksi: "catat_pembayaran",
    entitas: "payment",
    entitasId: String(pay.id),
    ringkasan: `Bayar ${inv.type} ${inv.period} ${nama}: Rp${nominal.toLocaleString("id-ID")} (${metode}).`,
    aktor: aktor(session),
  });
  revalidatePath("/keuangan");
  return { ok: true, pesan: "Tercatat di buku santri & buku bendahara.", paymentId: String(pay.id) };
}

/** Catat pemasukan/pengeluaran kas manual (di luar iuran santri). */
export async function catatKas(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  const tanggal = new Date(`${String(formData.get("tanggal") ?? "")}T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) return { ok: false, pesan: "Tanggal tidak valid." };
  const uraian = String(formData.get("uraian") ?? "").trim().slice(0, 255);
  const kategori = String(formData.get("kategori") ?? "").trim().slice(0, 64) || "Lainnya";
  const metode = String(formData.get("metode") ?? "Tunai").slice(0, 64) || "Tunai";
  const arah = String(formData.get("arah") ?? "") === "keluar" ? "Outbound" : "Inbound";
  const nominal = keNominal(formData.get("nominal"));
  if (!uraian) return { ok: false, pesan: "Uraian wajib diisi." };
  if (nominal <= 0) return { ok: false, pesan: "Nominal harus lebih dari 0." };
  // Unit pemilik kas: kosong = kas umum/yayasan. Divalidasi terhadap
  // cakupan sesi supaya tidak bisa mencatat atas nama unit lain.
  const unitMentah = String(formData.get("unit") ?? "").trim();
  let unitId: number | null = null;
  if (unitMentah) {
    const n = Number(unitMentah);
    if (!Number.isFinite(n)) return { ok: false, pesan: "Unit tidak valid." };
    try {
      assertUnit(session, n);
    } catch {
      return { ok: false, pesan: "Unit di luar cakupan akses Anda." };
    }
    unitId = n;
  }

  const kode = `KAS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0")}`;
  const row = await prisma.cashTransaction.create({
    data: { code: kode, date: tanggal, description: uraian, category: kategori, method: metode, direction: arah, amount: nominal, unitId },
  });
  await recordAudit({
    aksi: "catat_kas",
    entitas: "cash_transaction",
    entitasId: String(row.id),
    ringkasan: `Kas ${arah === "Inbound" ? "masuk" : "keluar"}: ${uraian} Rp${nominal.toLocaleString("id-ID")} (${metode}).`,
    aktor: aktor(session),
  });
  revalidatePath("/keuangan");
  return { ok: true, pesan: "Transaksi kas tercatat." };
}

/** Simpan tagihan utilitas bulanan (upsert per unit per periode). */
export async function simpanUtilitasBulanan(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  const periode = String(formData.get("periode") ?? "").trim();
  if (!PERIODE_RE.test(periode)) return { ok: false, pesan: "Periode tidak valid (format YYYY-MM)." };

  const units = await prisma.utilitasUnit.findMany({ where: { aktif: true }, select: { id: true } });
  let tersimpan = 0;
  for (const u of units) {
    const id = String(u.id);
    const totalRaw = String(formData.get(`total_${id}`) ?? "").trim();
    if (totalRaw === "") continue; // unit tanpa input = dilewati
    const total = keNominal(totalRaw);
    const volRaw = String(formData.get(`vol_${id}`) ?? "").trim().replace(",", ".");
    const volume = volRaw === "" ? null : Number(volRaw);
    const status = String(formData.get(`status_${id}`) ?? "Belum") === "Lunas" ? "Lunas" : "Belum";
    await prisma.utilitasTagihan.upsert({
      where: { unitId_periode: { unitId: u.id, periode } },
      create: { unitId: u.id, periode, volume: Number.isFinite(volume) ? volume : null, total, status },
      update: { volume: Number.isFinite(volume) ? volume : null, total, status },
    });
    tersimpan++;
  }
  await recordAudit({
    aksi: "simpan_utilitas",
    entitas: "utilitas_tagihan",
    ringkasan: `Simpan tagihan utilitas ${periode}: ${tersimpan} unit.`,
    aktor: aktor(session),
  });
  revalidatePath("/keuangan");
  return { ok: true, pesan: `${tersimpan} tagihan utilitas ${periode} tersimpan.` };
}

/** Set/ubah override tarif iuran untuk satu santri. */
export async function simpanOverride(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  let santriId: bigint;
  try {
    santriId = BigInt(String(formData.get("santriId") ?? ""));
  } catch {
    return { ok: false, pesan: "Santri tidak valid." };
  }
  const total = keNominal(formData.get("total"));
  const keterangan = String(formData.get("keterangan") ?? "").trim().slice(0, 255);
  if (total <= 0) return { ok: false, pesan: "Total bulanan harus lebih dari 0." };
  const santri = await prisma.santri.findUnique({ where: { id: santriId }, include: { person: true } });
  if (!santri) return { ok: false, pesan: "Santri tidak ditemukan." };
  await prisma.tarifSantriOverride.upsert({
    where: { santriId },
    create: { santriId, totalBulanan: total, keterangan: keterangan || null },
    update: { totalBulanan: total, keterangan: keterangan || null },
  });
  await recordAudit({
    aksi: "simpan_override_tarif",
    entitas: "tarif_santri_override",
    entitasId: String(santriId),
    ringkasan: `Override tarif ${santri.person.fullName}: Rp${total.toLocaleString("id-ID")}/bln.`,
    aktor: aktor(session),
  });
  revalidatePath("/keuangan");
  return { ok: true, pesan: `Tarif khusus ${santri.person.fullName} tersimpan.` };
}

/** Hapus override tarif santri (kembali ke tarif standar). */
export async function hapusOverride(formData: FormData): Promise<HasilAksi> {
  const session = await requirePage("keuangan");
  let santriId: bigint;
  try {
    santriId = BigInt(String(formData.get("santriId") ?? ""));
  } catch {
    return { ok: false, pesan: "Santri tidak valid." };
  }
  await prisma.tarifSantriOverride.deleteMany({ where: { santriId } });
  await recordAudit({ aksi: "hapus_override_tarif", entitas: "tarif_santri_override", entitasId: String(santriId), ringkasan: "Override tarif dihapus.", aktor: aktor(session) });
  revalidatePath("/keuangan");
  return { ok: true, pesan: "Override dihapus; kembali ke tarif standar." };
}
