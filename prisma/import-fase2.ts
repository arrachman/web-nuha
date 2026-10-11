/**
 * Impor Fase 2 keuangan pondok dari /tmp/fase2-data.json (hasil ekstrak 2 xlsx)
 * + tagihan utilitas September 2026 (dari PDF, di-hardcode setelah verifikasi).
 * Idempoten: aman dijalankan ulang (cek eksistensi per fase).
 * Usage: npx tsx prisma/import-fase2.ts [--dry-run]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry-run");
const norm = (s: string) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();

const UTIL_SEPT: Array<{ sektor: "PLN" | "PDAM"; nama: string; volume: number; total: number }> = [
  { sektor: "PLN", nama: "Ponbel Putra", volume: 1222, total: 1210780 },
  { sektor: "PLN", nama: "Ning Badi’", volume: 442, total: 370512 },
  { sektor: "PLN", nama: "Musholla PI", volume: 425, total: 356300 },
  { sektor: "PLN", nama: "Fatimah", volume: 261, total: 259390 },
  { sektor: "PLN", nama: "Nuha Mart", volume: 297, total: 249292 },
  { sektor: "PLN", nama: "Ndalem Buya", volume: 375, total: 157970 },
  { sektor: "PLN", nama: "Musholla PA", volume: 155, total: 130580 },
  { sektor: "PLN", nama: "Ust. Hafidz", volume: 133, total: 62138 },
  { sektor: "PLN", nama: "Poskes", volume: 23, total: 54539 },
  { sektor: "PLN", nama: "Maqbarah", volume: 0, total: 41498 },
  { sektor: "PLN", nama: "Parkiran Putra", volume: 36, total: 11758 },
  { sektor: "PLN", nama: "Pondok Etan", volume: 0, total: 5950 },
  { sektor: "PDAM", nama: "Ndalem Abah", volume: 34, total: 138400 },
  { sektor: "PDAM", nama: "Ning Badi’", volume: 18, total: 112600 },
  { sektor: "PDAM", nama: "Ndalem Buya", volume: 10, total: 54400 },
  { sektor: "PDAM", nama: "Ust. Hafidz", volume: 9, total: 50200 },
  { sektor: "PDAM", nama: "Aula Belakang (Lama)", volume: 14, total: 46900 },
  { sektor: "PDAM", nama: "Poskes", volume: 2, total: 31400 },
  { sektor: "PDAM", nama: "Quds 2", volume: 0, total: 27100 },
  { sektor: "PDAM", nama: "Aula Belakang", volume: 0, total: 24500 },
  { sektor: "PDAM", nama: "Nuha Mart", volume: 3, total: 24400 },
  { sektor: "PDAM", nama: "Fatimah", volume: 0, total: 13000 },
];

async function main() {
  const data = JSON.parse(readFileSync("/tmp/fase2-data.json", "utf-8"));
  const prisma = new PrismaClient();
  try {
    // ── A. Master santri ──
    const existing = await prisma.santri.findMany({ select: { id: true, person: { select: { fullName: true } } } });
    const byName = new Map(existing.map((s) => [norm(s.person.fullName), s.id]));
    let newSantri = 0;
    const ids = new Map<string, bigint>();
    for (const nama of data.santri as string[]) {
      const k = norm(nama);
      if (byName.has(k)) { ids.set(k, byName.get(k)!); continue; }
      if (!DRY) {
        const person = await prisma.person.create({ data: { fullName: nama, gender: "L" } });
        const santri = await prisma.santri.create({ data: { personId: person.id, status: "Aktif" } });
        byName.set(k, santri.id); ids.set(k, santri.id);
      } else {
        const fake = BigInt(-(newSantri + 1));
        byName.set(k, fake); ids.set(k, fake);
      }
      newSantri++;
    }
    console.log(`A. santri: ${data.santri.length} nama, baru=${newSantri}`);

    // ── B. Invoice tunggakan ──
    let invBaru = 0, invSkip = 0;
    for (const t of data.tunggakan as Array<{ nama: string; terakhirBayar: string | null; bulanLunas: string | null; totalBulan: string | null; nominal: number }>) {
      const sid = ids.get(norm(t.nama)) ?? byName.get(norm(t.nama));
      if (!sid) { console.log(`   ! santri tidak ketemu: ${t.nama}`); continue; }
      const ada = await prisma.invoice.findFirst({ where: { santriId: sid, type: "TUNGGAKAN" } });
      if (ada) { invSkip++; continue; }
      if (!DRY) {
        await prisma.invoice.create({
          data: {
            code: `TUNG-IMP2-${sid}`, santriId: sid, type: "TUNGGAKAN", period: "2026-10",
            amount: t.nominal, paidAmount: 0, dueDate: new Date("2026-10-31T00:00:00"),
            rincian: { sumber: "daftar_tunggakan_2026.xlsx", totalBulan: t.totalBulan, terakhirBayar: t.terakhirBayar, bulanLunas: t.bulanLunas },
          },
        });
      }
      invBaru++;
    }
    const totTung = (data.tunggakan as Array<{ nominal: number }>).reduce((s, t) => s + t.nominal, 0);
    console.log(`B. tunggakan: ${data.tunggakan.length} baris, invoice_baru=${invBaru}, sudah_ada=${invSkip}, total Rp${totTung.toLocaleString("id-ID")}`);

    // ── C. Cash in 2025 ──
    let ciBaru = 0;
    const ciRows = data.cashin2025 as Array<{ nama: string; tanggal: string; total: number; rincian: Record<string, number> }>;
    for (let i = 0; i < ciRows.length; i++) {
      const c = ciRows[i];
      const code = `IMP2-CI25-${String(i + 1).padStart(3, "0")}`;
      const ada = await prisma.cashTransaction.findUnique({ where: { code } });
      if (ada) continue;
      if (!DRY) {
        await prisma.cashTransaction.create({
          data: {
            code, date: new Date(`${c.tanggal}T00:00:00`),
            description: `[Fase2] Cash in 2025 - ${c.nama}`.slice(0, 255),
            category: "Syahriah", method: "Tunai", direction: "Inbound", amount: c.total,
          },
        });
      }
      ciBaru++;
    }
    const totCi = ciRows.reduce((s, c) => s + c.total, 0);
    console.log(`C. cash-in 2025: ${ciRows.length} baris, baru=${ciBaru}, total Rp${totCi.toLocaleString("id-ID")}`);

    // ── D. Jurnal umum Agu 2026 ──
    let juBaru = 0;
    const juRows = data.jurnal as Array<{ transaksi: string; masuk: number; keluar: number; akun: string; nama: string }>;
    for (let i = 0; i < juRows.length; i++) {
      const j = juRows[i];
      const code = `IMP2-JU-${String(i + 1).padStart(2, "0")}`;
      const ada = await prisma.cashTransaction.findUnique({ where: { code } });
      if (ada) continue;
      const inbound = j.masuk > 0;
      if (!DRY) {
        await prisma.cashTransaction.create({
          data: {
            code, date: new Date("2026-08-31T00:00:00"),
            description: `[Fase2] ${j.transaksi}`.slice(0, 255),
            category: (j.akun || "Lainnya").slice(0, 64), method: (j.nama || "Tunai").slice(0, 64),
            direction: inbound ? "Inbound" : "Outbound", amount: inbound ? j.masuk : j.keluar,
          },
        });
      }
      juBaru++;
    }
    console.log(`D. jurnal Agu 2026: ${juRows.length} baris, baru=${juBaru}, masuk Rp${juRows.reduce((s, j) => s + j.masuk, 0).toLocaleString("id-ID")}, keluar Rp${juRows.reduce((s, j) => s + j.keluar, 0).toLocaleString("id-ID")}`);

    // ── E. Utilitas September 2026 ──
    const units = await prisma.utilitasUnit.findMany();
    const unitByKey = new Map(units.map((u) => [`${u.sektor}|${norm(u.nama)}`, u]));
    let utBaru = 0;
    const utTakCocok: string[] = [];
    const sumPln = UTIL_SEPT.filter((u) => u.sektor === "PLN").reduce((s, u) => s + u.total, 0);
    const sumPdam = UTIL_SEPT.filter((u) => u.sektor === "PDAM").reduce((s, u) => s + u.total, 0);
    console.log(`   cek PDF: PLN Rp${sumPln.toLocaleString("id-ID")} (target 2.930.707), PDAM Rp${sumPdam.toLocaleString("id-ID")} (target 522.900)`);
    for (const t of UTIL_SEPT) {
      const unit = unitByKey.get(`${t.sektor}|${norm(t.nama)}`);
      if (!unit) { utTakCocok.push(`${t.sektor}/${t.nama}`); continue; }
      const ada = await prisma.utilitasTagihan.findUnique({ where: { unitId_periode: { unitId: unit.id, periode: "2026-09" } } });
      if (ada) continue;
      if (!DRY) {
        await prisma.utilitasTagihan.create({
          data: { unitId: unit.id, periode: "2026-09", volume: t.volume, total: t.total, status: "Lunas" },
        });
      }
      utBaru++;
    }
    console.log(`E. utilitas 2026-09: ${UTIL_SEPT.length} unit, baru=${utBaru}, tak_cocok=[${utTakCocok.join(", ")}]`);

    console.log(DRY ? "== DRY-RUN selesai (tidak ada yang ditulis) ==" : "== IMPOR SELESAI ==");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error("GAGAL:", e); process.exit(1); });
