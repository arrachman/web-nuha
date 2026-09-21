import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { Card, JudulHalaman, StatCard, Kosong, rp, ChartTren, ChartDonut, ChartBatang } from '@/components';

const WARNA_UNIT = ['#0F6B3D', '#E8973A', '#1D4ED8', '#7C3AED', '#0891B2', '#BE185D'];

export default async function DashboardPage() {
  const session = await requirePage('dashboard');

  const [santri, santriAktif, santriTidakAktif, pegawai, pendaftar, invoices, unit, kas, agenda, pengumuman] =
    await Promise.all([
      prisma.santri.count({ where: { status: 'Aktif' } }),
      prisma.santri.count({ where: { status: 'Aktif' } }),
      prisma.santri.count({ where: { status: 'TidakAktif' } }),
      prisma.staff.count({ where: { status: { notIn: ['Nonaktif', 'Keluar', 'Pensiun'] } } }),
      prisma.applicant.count({ where: { status: { in: ['New', 'Verification', 'Selection'] } } }),
      prisma.invoice.aggregate({ _sum: { amount: true, paidAmount: true } }),
      prisma.unit.findMany({ where: { aktif: true }, orderBy: { id: 'asc' }, include: { _count: { select: { santri: true } } } }),
      prisma.cashTransaction.groupBy({ by: ['direction'], _sum: { amount: true } }),
      prisma.agenda.findMany({ orderBy: { date: 'asc' }, take: 5 }),
      prisma.announcement.findMany({ orderBy: { date: 'desc' }, take: 5 }),
    ]);

  const totalInvoice = Number(invoices._sum.amount ?? 0);
  const totalDibayar = Number(invoices._sum.paidAmount ?? 0);
  const tunggakan = totalInvoice - totalDibayar;
  const pctTertagih = totalInvoice > 0 ? Math.round((totalDibayar / totalInvoice) * 100) : 0;

  const masuk = Number(kas.find((k) => k.direction === 'Inbound')?._sum.amount ?? 0);
  const keluar = Number(kas.find((k) => k.direction === 'Outbound')?._sum.amount ?? 0);

  // Tren dibangun dari tahun masuk yang tercatat — bukan angka konstan.
  const perTahun = await prisma.santri.groupBy({
    by: ['tahunMasuk'],
    where: { tahunMasuk: { not: null }, status: { in: ['Aktif', 'TidakAktif'] } },
    _count: { _all: true },
  });
  const tren = perTahun
    .filter((t) => t.tahunMasuk)
    .sort((a, b) => String(a.tahunMasuk).localeCompare(String(b.tahunMasuk)))
    .slice(-6)
    .map((t) => ({ label: String(t.tahunMasuk), nilai: t._count._all }));

  const donut = [
    { label: 'Santri aktif', nilai: santriAktif, warna: '#0F6B3D' },
    { label: 'Pegawai & asatidz', nilai: pegawai, warna: '#1D4ED8' },
    { label: 'Santri tidak aktif', nilai: santriTidakAktif, warna: '#9CA3AF' },
  ].filter((d) => d.nilai > 0);

  const batang = unit.map((u, i) => ({ label: u.nama, nilai: u._count.santri, warna: WARNA_UNIT[i % WARNA_UNIT.length] }));

  return (
    <>
      <JudulHalaman
        judul="Ringkasan Yayasan"
        sub="Satu identitas untuk seluruh unit — data di bawah ditarik langsung dari basis data terpadu."
      />

      <section className="grid g4">
        <StatCard label="Santri aktif" nilai={santri} sub="Seluruh santri aktif" />
        <StatCard label="Pegawai & asatidz" nilai={pegawai} sub="Tetap, kontrak, honorer & mitra" warna="#1D4ED8" />
        <StatCard label="PPDB perlu diproses" nilai={pendaftar} sub="Baru · verifikasi · seleksi" warna="#E8973A" />
        <StatCard label="Ketertagihan" nilai={`${pctTertagih}%`} sub={`Tunggakan ${rp(tunggakan)}`} pct={pctTertagih} />
      </section>

      <section className="grid g2" style={{ marginTop: 16 }}>
        <Card judul="Tren penerimaan santri" sub="Jumlah santri per tahun masuk">
          {tren.length > 1 ? <ChartTren data={tren} /> : <Kosong pesan="Data tahun masuk belum cukup untuk menggambar tren." />}
        </Card>
        <Card judul="Komposisi individu" sub="Sebaran seluruh orang yang terdata">
          {donut.length > 0 ? <ChartDonut data={donut} judulTengah="orang" /> : <Kosong />}
        </Card>
      </section>

      <section className="grid g2" style={{ marginTop: 16 }}>
        <Card judul="Sebaran santri per unit">
          {batang.length > 0 ? <ChartBatang data={batang} /> : <Kosong />}
        </Card>
        <Card judul="Ringkasan keuangan" sub="Akumulasi kas dan invoices berjalan">
          <div className="grid g2">
            <div className="inset">
              <div className="label">Kas masuk</div>
              <div className="angka-sm" style={{ color: 'var(--hijau)' }}>{rp(masuk)}</div>
            </div>
            <div className="inset">
              <div className="label">Kas keluar</div>
              <div className="angka-sm" style={{ color: '#B91C1C' }}>{rp(keluar)}</div>
            </div>
            <div className="inset">
              <div className="label">Total invoices</div>
              <div className="angka-sm">{rp(totalInvoice)}</div>
            </div>
            <div className="inset">
              <div className="label">Sudah paidAmount</div>
              <div className="angka-sm" style={{ color: 'var(--hijau)' }}>{rp(totalDibayar)}</div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: 14 }}>
            <span style={{ width: `${pctTertagih}%` }} />
          </div>
          <p className="muted" style={{ marginTop: 6 }}>{pctTertagih}% dari total invoices sudah tertagih.</p>
        </Card>
      </section>

      <section className="grid g2" style={{ marginTop: 16 }}>
        <Card judul="Agenda terdekat">
          {agenda.length === 0 ? <Kosong pesan="Belum ada agenda terjadwal." /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agenda.map((a) => (
                <li key={String(a.id)} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                  <span className="pill-agenda" style={{ flex: '0 0 auto' }}>
                    {a.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 13 }}>{a.title}</b>
                    <span className="muted">{a.unit ?? 'Yayasan'}{a.time ? ` · ${a.time}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card judul="Pengumuman terbaru">
          {pengumuman.length === 0 ? <Kosong pesan="Belum ada pengumuman." /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pengumuman.map((p) => (
                <li key={String(p.id)}>
                  <b style={{ display: 'block', fontSize: 13 }}>{p.title}</b>
                  <span className="muted">{p.date.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                  <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--teks-2)' }}>{p.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
