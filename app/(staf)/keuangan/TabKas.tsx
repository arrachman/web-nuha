import { prisma } from "@/lib/prisma";
import { isSuperAdmin, readSession } from "@/lib/auth";
import { getUnitAktif } from "@/lib/unit-scope";
import { Card, StatCard, Tabel, Kosong, rp, FormField, Input, Select } from "@/components";
import { FormAksi } from "./FormAksi";
import { catatKas } from "./aksi";

const KATEGORI = ["Iuran Santri", "Listrik & PDAM", "Wifi", "Kebersihan", "Konsumsi", "Gaji & Honor", "Pembangunan", "Sarpras", "Kesehatan", "Lainnya"];

/** Saldo kas + form pencatatan pemasukan/pengeluaran manual — per unit aktif. */
export async function TabKas() {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const saringUnit = unitAktif != null ? { unitId: unitAktif } : {};
  const hariIni = new Date().toISOString().slice(0, 10);
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [grup, grupBulan, rows, semuaUnit] = await Promise.all([
    prisma.cashTransaction.groupBy({ by: ["direction"], where: saringUnit, _sum: { amount: true } }),
    prisma.cashTransaction.groupBy({
      by: ["direction"],
      where: { date: { gte: awalBulan }, ...saringUnit },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.findMany({ where: saringUnit, orderBy: { date: "desc" }, take: 30, include: { unit: { select: { nama: true } } } }),
    prisma.unit.findMany({ where: { aktif: true }, select: { id: true, nama: true }, orderBy: { id: "asc" } }),
  ]);
  const unitBoleh = session && !isSuperAdmin(session) && session.unitIds != null
    ? semuaUnit.filter((u) => session.unitIds!.includes(u.id))
    : semuaUnit;
  const namaUnitAktif = unitAktif != null ? semuaUnit.find((u) => u.id === unitAktif)?.nama ?? null : null;
  const total = (d: string, g: typeof grup) => Number(g.find((x) => x.direction === d)?._sum.amount ?? 0);
  const masuk = total("Inbound", grup);
  const keluar = total("Outbound", grup);
  const masukBulan = total("Inbound", grupBulan);
  const keluarBulan = total("Outbound", grupBulan);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="grid g4">
        <StatCard label={namaUnitAktif ? `Saldo kas ${namaUnitAktif}` : "Saldo kas (semua unit)"} nilai={rp(masuk - keluar)} warna="#1D4ED8" />
        <StatCard label="Masuk bulan ini" nilai={rp(masukBulan)} warna="#0F6B3D" />
        <StatCard label="Keluar bulan ini" nilai={rp(keluarBulan)} warna="#B91C1C" />
        <StatCard label="Total masuk" nilai={rp(masuk)} />
      </section>

      <Card judul="Catat transaksi kas" sub="Pemasukan/pengeluaran di luar iuran santri (mis. bayar listrik, wifi, belanja).">
        <FormAksi action={catatKas} tombol="Catat transaksi">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <FormField label="Tanggal" htmlFor="kas-tanggal" rapat>
              <Input type="date" id="kas-tanggal" name="tanggal" defaultValue={hariIni} required />
            </FormField>
            <FormField label="Arah" htmlFor="kas-arah" rapat>
              <Select id="kas-arah" name="arah">
                <option value="keluar">Pengeluaran</option>
                <option value="masuk">Pemasukan</option>
              </Select>
            </FormField>
            <FormField label="Kategori" htmlFor="kas-kategori" rapat>
              <Select id="kas-kategori" name="kategori">
                {KATEGORI.map((k) => <option key={k}>{k}</option>)}
              </Select>
            </FormField>
            <FormField label="Unit" htmlFor="kas-unit" rapat>
              <Select id="kas-unit" name="unit" defaultValue={unitAktif != null ? String(unitAktif) : ""}>
                <option value="">Umum / Yayasan</option>
                {unitBoleh.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </Select>
            </FormField>
            <FormField label="Metode" htmlFor="kas-metode" rapat>
              <Select id="kas-metode" name="metode">
                <option>Tunai</option>
                <option>Transfer BRI</option>
                <option>QRIS</option>
                <option>Transfer Bank Lain</option>
              </Select>
            </FormField>
            <FormField label="Nominal (Rp)" htmlFor="kas-nominal" rapat style={{ width: 160 }}>
              <Input type="number" id="kas-nominal" name="nominal" min={1} required />
            </FormField>
            <FormField label="Uraian" htmlFor="kas-uraian" rapat style={{ flex: 1, minWidth: 200 }}>
              <Input type="text" id="kas-uraian" name="uraian" placeholder="mis. Bayar listrik pondok Oktober" required />
            </FormField>
          </div>
        </FormAksi>
      </Card>

      <Card judul="Transaksi terakhir" sub={namaUnitAktif ? `30 transaksi kas terbaru — unit ${namaUnitAktif}.` : "30 transaksi kas terbaru (semua unit)."}>
        {rows.length === 0 ? (
          <Kosong pesan="Belum ada transaksi kas." />
        ) : (
          <Tabel kolom={["Tanggal", "Kode", "Uraian", "Unit", "Metode", { label: "Nominal", num: true }]}>
            {rows.map((t) => (
              <tr key={String(t.id)}>
                <td>{t.date.toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
                <td className="muted">{t.code}</td>
                <td>{t.description}<div className="muted" style={{ fontSize: 12 }}>{t.category}</div></td>
                <td className="muted">{t.unit?.nama ?? "Umum"}</td>
                <td className="muted">{t.method}</td>
                <td className="num" style={{ fontWeight: 700, color: t.direction === "Inbound" ? "#0F6B3D" : "#B91C1C" }}>
                  {t.direction === "Inbound" ? "+" : "-"} {rp(Number(t.amount))}
                </td>
              </tr>
            ))}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
