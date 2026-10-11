import { prisma } from "@/lib/prisma";
import { Card, StatCard, Tabel, Kosong, rp } from "@/components";

/** Piutang: total + per santri (agregat tagihan belum lunas). */
export async function TabPiutang() {
  const rows = await prisma.invoice.findMany({
    include: { santri: { include: { person: true, unit: true } } },
    orderBy: { dueDate: "asc" },
  });
  const terbuka = rows.filter((t) => Number(t.paidAmount) < Number(t.amount));
  const perSantri = new Map<string, { nama: string; unit: string; tagihan: number; dibayar: number }>();
  for (const t of terbuka) {
    const k = String(t.santriId);
    const cur = perSantri.get(k) ?? { nama: t.santri.person.fullName, unit: t.santri.unit?.nama ?? "-", tagihan: 0, dibayar: 0 };
    cur.tagihan += Number(t.amount);
    cur.dibayar += Number(t.paidAmount);
    perSantri.set(k, cur);
  }
  const daftar = [...perSantri.values()]
    .map((r) => ({ ...r, sisa: r.tagihan - r.dibayar }))
    .sort((a, b) => b.sisa - a.sisa)
    .slice(0, 50);
  const totalPiutang = daftar.reduce((s, r) => s + r.sisa, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="grid g4">
        <StatCard label="Total piutang" nilai={rp(totalPiutang)} warna="#B91C1C" />
        <StatCard label="Santri menunggak" nilai={String(daftar.length)} />
        <StatCard label="Invoice belum lunas" nilai={String(terbuka.length)} />
        <StatCard label="Rata-rata per santri" nilai={rp(daftar.length ? Math.round(totalPiutang / daftar.length) : 0)} />
      </section>
      <Card judul={`Rincian piutang per santri (${daftar.length})`} sub="Diurutkan dari sisa terbesar. Prioritas penagihan: hubungi wali via WhatsApp.">
        {daftar.length === 0 ? (
          <Kosong pesan="Tidak ada piutang — semua tagihan lunas." />
        ) : (
          <Tabel kolom={["Santri", "Unit", { label: "Tagihan", num: true }, { label: "Dibayar", num: true }, { label: "Sisa", num: true }]}>
            {daftar.map((r) => (
              <tr key={r.nama}>
                <td style={{ fontWeight: 600 }}>{r.nama}</td>
                <td className="muted">{r.unit}</td>
                <td className="num">{rp(r.tagihan)}</td>
                <td className="num" style={{ color: "#0F6B3D" }}>{rp(r.dibayar)}</td>
                <td className="num" style={{ fontWeight: 700, color: "#B91C1C" }}>{rp(r.sisa)}</td>
              </tr>
            ))}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
