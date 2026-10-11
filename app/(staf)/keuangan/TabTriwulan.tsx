import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { getUnitAktif } from "@/lib/unit-scope";
import { Card, StatCard, Tabel, rp } from "@/components";

const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Output triwulan: pemasukan vs pengeluaran per bulan dalam 3 bulan. */
export async function TabTriwulan({ tw }: { tw: string }) {
  const now = new Date();
  const m = /^(\d{4})-Q([1-4])$/.exec(tw);
  const year = m ? Number(m[1]) : now.getFullYear();
  const q = m ? Number(m[2]) : Math.floor(now.getMonth() / 3) + 1;
  const awalBulan = (q - 1) * 3; // 0-indexed
  const awal = new Date(year, awalBulan, 1);
  const akhir = new Date(year, awalBulan + 3, 1);

  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const unit = unitAktif != null
    ? await prisma.unit.findUnique({ where: { id: unitAktif }, select: { nama: true } })
    : null;

  const rows = await prisma.cashTransaction.findMany({
    where: { date: { gte: awal, lt: akhir }, ...(unitAktif != null ? { unitId: unitAktif } : {}) },
    select: { date: true, direction: true, amount: true },
  });
  const perBulan = [0, 1, 2].map((i) => {
    const bAwal = new Date(year, awalBulan + i, 1);
    const bAkhir = new Date(year, awalBulan + i + 1, 1);
    const rs = rows.filter((r) => r.date >= bAwal && r.date < bAkhir);
    const masuk = rs.filter((r) => r.direction === "Inbound").reduce((s, r) => s + Number(r.amount), 0);
    const keluar = rs.filter((r) => r.direction === "Outbound").reduce((s, r) => s + Number(r.amount), 0);
    return { label: `${NAMA_BULAN[awalBulan + i]} ${year}`, masuk, keluar, selisih: masuk - keluar };
  });
  const totMasuk = perBulan.reduce((s, b) => s + b.masuk, 0);
  const totKeluar = perBulan.reduce((s, b) => s + b.keluar, 0);
  const maks = Math.max(1, ...perBulan.flatMap((b) => [b.masuk, b.keluar]));

  const twSebelum = q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`;
  const twSesudah = q === 4 ? `${year + 1}-Q1` : `${year}-Q${q + 1}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card judul={`Triwulan ${q} — ${year}`} sub={unit ? `Pemasukan vs pengeluaran kas per bulan — unit ${unit.nama}.` : "Pemasukan vs pengeluaran kas per bulan (semua unit)."}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <a className="btn" href={`/keuangan?tab=triwulan&tw=${twSebelum}`}>← {twSebelum}</a>
          <a className="btn" href={`/keuangan?tab=triwulan&tw=${twSesudah}`}>{twSesudah} →</a>
        </div>
        <section className="grid g4" style={{ marginBottom: 12 }}>
          <StatCard label="Pemasukan triwulan" nilai={rp(totMasuk)} warna="#0F6B3D" />
          <StatCard label="Pengeluaran triwulan" nilai={rp(totKeluar)} warna="#B91C1C" />
          <StatCard label="Selisih" nilai={rp(totMasuk - totKeluar)} warna={totMasuk - totKeluar >= 0 ? "#1D4ED8" : "#B91C1C"} />
          <StatCard label="Transaksi" nilai={String(rows.length)} />
        </section>
        <Tabel kolom={["Bulan", { label: "Pemasukan", num: true }, { label: "Pengeluaran", num: true }, { label: "Selisih", num: true }, "Grafik"]}>
          {perBulan.map((b) => (
            <tr key={b.label}>
              <td style={{ fontWeight: 600 }}>{b.label}</td>
              <td className="num" style={{ color: "#0F6B3D" }}>{rp(b.masuk)}</td>
              <td className="num" style={{ color: "#B91C1C" }}>{rp(b.keluar)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{rp(b.selisih)}</td>
              <td style={{ minWidth: 160 }}>
                <div style={{ height: 8, borderRadius: 4, background: "#E9F7EF", marginBottom: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "#0F6B3D", width: `${Math.round((b.masuk / maks) * 100)}%` }} />
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#FDECEC" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "#B91C1C", width: `${Math.round((b.keluar / maks) * 100)}%` }} />
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 700 }}>Total</td>
            <td className="num" style={{ fontWeight: 700, color: "#0F6B3D" }}>{rp(totMasuk)}</td>
            <td className="num" style={{ fontWeight: 700, color: "#B91C1C" }}>{rp(totKeluar)}</td>
            <td className="num" style={{ fontWeight: 700 }}>{rp(totMasuk - totKeluar)}</td>
            <td />
          </tr>
        </Tabel>
      </Card>
    </div>
  );
}
