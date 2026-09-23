import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { whereAsetTerlihat, type IzinSarpras } from '@/lib/aset/akses';
import { LABEL_KONDISI, STATUS_KERUSAKAN_TERBUKA, WARNA_KONDISI, rupiah } from '@/lib/aset/konstanta';
import { BarHorizontal, ChartBatang, ChartDonut, ChartTren, Kosong, StatCard, Tabel } from '@/components';
import { BadgeStatus } from './Kembali';

const WARNA_UNIT = ['#0F6B3D', '#1E40AF', '#B45309', '#9D174D', '#0E7490'];

/** Dashboard sarpras (04 §8) — unit scope berlaku lewat whereAsetTerlihat. */
export async function TabDashboard({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const whereAset = { ...(await whereAsetTerlihat(session, izin)), status: { not: 'Dihapus' as const }, deletedAt: null };
  const whereTiket = { OR: [{ asset: whereAset }, { assetId: null }] };
  const tujuhHari = new Date(Date.now() + 7 * 86_400_000);
  const enamBulanLalu = new Date(Date.now() - 183 * 86_400_000);

  const [jumlahAset, nilai, perKondisi, perUnit, units, tiketTerbuka, jatuhTempo, darurat, terlambat, tiket6Bulan, perLokasi, kendaraan] = await Promise.all([
    prisma.asset.count({ where: whereAset }),
    prisma.asset.aggregate({ where: whereAset, _sum: { acquisitionCost: true } }),
    prisma.asset.groupBy({ by: ['condition'], where: whereAset, _count: { _all: true } }),
    prisma.asset.groupBy({ by: ['ownerUnitId'], where: whereAset, _count: { _all: true } }),
    prisma.unit.findMany(),
    prisma.damageReport.count({ where: { ...whereTiket, status: { in: STATUS_KERUSAKAN_TERBUKA } } }),
    prisma.maintenanceTask.count({ where: { status: { in: ['Terjadwal', 'Terlewat'] }, dueDate: { lte: tujuhHari } } }),
    prisma.damageReport.findMany({ where: { ...whereTiket, severity: 'Darurat', status: { in: STATUS_KERUSAKAN_TERBUKA } }, include: { asset: true, location: true }, orderBy: { createdAt: 'asc' }, take: 8 }),
    prisma.assetLoan.findMany({ where: { OR: [{ status: 'Terlambat' }, { status: 'Dipinjam', endAt: { lt: new Date() } }] }, include: { borrower: { include: { person: true } } }, take: 8 }),
    prisma.damageReport.findMany({ where: { ...whereTiket, createdAt: { gte: enamBulanLalu } }, select: { createdAt: true, resolvedAt: true, status: true, cost: true } }),
    prisma.damageReport.groupBy({ by: ['locationId'], where: { ...whereTiket, locationId: { not: null } }, _count: { _all: true }, orderBy: { _count: { locationId: 'desc' } }, take: 6 }),
    prisma.asset.findMany({ where: { ...whereAset, category: { code: { startsWith: 'B.04' } } }, include: { maintenance: { where: { title: { contains: 'Pajak' } }, orderBy: { dueDate: 'asc' }, take: 1 } } }),
  ]);
  const lokasi = await prisma.assetLocation.findMany({ where: { id: { in: perLokasi.map((p) => p.locationId!).filter(Boolean) } } });
  const baik = perKondisi.find((k) => k.condition === 'Baik')?._count._all ?? 0;
  const pctBaik = jumlahAset ? Math.round((baik / jumlahAset) * 100) : 0;

  // Tren 6 bulan: kerusakan masuk vs selesai per bulan.
  const bulan = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d; });
  const kunci = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const labelBulan = (d: Date) => d.toLocaleDateString('id-ID', { month: 'short' });
  const masuk = bulan.map((b) => ({ label: labelBulan(b), nilai: tiket6Bulan.filter((t) => kunci(t.createdAt) === kunci(b)).length }));
  const selesai = bulan.map((b) => ({ label: labelBulan(b), nilai: tiket6Bulan.filter((t) => t.resolvedAt && t.status === 'Selesai' && kunci(t.resolvedAt) === kunci(b)).length }));
  const biaya = tiket6Bulan.reduce((s, t) => s + Number(t.cost ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <StatCard label="Aset aktif" nilai={jumlahAset} sub="di luar yang sudah dihapus" />
        {izin.view_value && <StatCard label="Nilai perolehan" nilai={rupiah(nilai._sum.acquisitionCost)} warna="#1E40AF" />}
        <StatCard label="Kondisi baik" nilai={`${pctBaik}%`} pct={pctBaik} />
        <StatCard label="Kerusakan terbuka" nilai={tiketTerbuka} warna="#B91C1C" sub={`${darurat.length} darurat`} />
        <StatCard label="Pemeliharaan ≤ 7 hari" nilai={jatuhTempo} warna="#B45309" sub="termasuk yang terlewat" />
      </section>

      <section className="grid g2">
        <div className="card">
          <h3 className="card-judul">Kondisi aset</h3>
          <ChartDonut judulTengah={`${jumlahAset}`} data={Object.keys(LABEL_KONDISI).map((k) => ({ label: LABEL_KONDISI[k], nilai: perKondisi.find((p) => p.condition === k)?._count._all ?? 0, warna: WARNA_KONDISI[k] }))} />
        </div>
        <div className="card">
          <h3 className="card-judul">Aset per unit pemilik</h3>
          {perUnit.length ? <ChartBatang data={perUnit.map((p, i) => ({ label: units.find((u) => u.id === p.ownerUnitId)?.nama ?? '-', nilai: p._count._all, warna: WARNA_UNIT[i % WARNA_UNIT.length] }))} /> : <Kosong pesan="Belum ada aset." />}
        </div>
      </section>

      <section className="grid g2">
        <div className="card">
          <h3 className="card-judul">Kerusakan masuk per bulan</h3>
          <ChartTren data={masuk} tinggi={160} />
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Selesai 6 bulan terakhir: {selesai.reduce((s, x) => s + x.nilai, 0)} tiket{izin.view_value ? ` · biaya perbaikan ${rupiah(biaya)}` : ''}
          </p>
        </div>
        <div className="card">
          <h3 className="card-judul">Ruang dengan laporan kerusakan terbanyak</h3>
          {perLokasi.length ? <BarHorizontal satuan="laporan" data={perLokasi.map((p) => ({ label: lokasi.find((l) => l.id === p.locationId)?.name ?? '-', nilai: p._count._all, warna: '#B91C1C' }))} /> : <Kosong pesan="Belum ada laporan." />}
        </div>
      </section>

      <div className="card">
        <h3 className="card-judul">Kerusakan darurat belum selesai</h3>
        {darurat.length === 0 ? <Kosong pesan="Tidak ada kerusakan darurat terbuka." /> : (
          <Tabel kolom={['Kode', 'Aset / ruang', 'Uraian', 'Status', '']}>
            {darurat.map((d) => (
              <tr key={String(d.id)}>
                <td>{d.code}</td>
                <td>{d.asset?.name ?? d.location?.name ?? '-'}</td>
                <td>{d.description}</td>
                <td><BadgeStatus status={d.status} /></td>
                <td><Link className="btn-sekunder" href={`/sarpras?tab=kerusakan&id=${d.id}`}>Tangani</Link></td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>

      <section className="grid g2">
        <div className="card">
          <h3 className="card-judul">Peminjaman terlambat</h3>
          {terlambat.length === 0 ? <Kosong pesan="Tidak ada peminjaman terlambat." /> : (
            <Tabel kolom={['Kode', 'Peminjam', 'Batas kembali']}>
              {terlambat.map((l) => <tr key={String(l.id)}><td>{l.code}</td><td>{l.borrower.person.fullName}</td><td>{l.endAt.toLocaleString('id-ID')}</td></tr>)}
            </Tabel>
          )}
        </div>
        <div className="card">
          <h3 className="card-judul">Pajak kendaraan</h3>
          {kendaraan.length === 0 ? <Kosong pesan="Tidak ada kendaraan terdaftar." /> : (
            <Tabel kolom={['Kendaraan', 'Nopol', 'Jatuh tempo pajak']}>
              {kendaraan.map((k) => {
                const attr = (k.attributes ?? {}) as Record<string, string>;
                const tempo = k.maintenance[0]?.dueDate ?? (attr.tglPajak ? new Date(attr.tglPajak) : null);
                const dekat = tempo && tempo.getTime() - Date.now() < 30 * 86_400_000;
                return (
                  <tr key={String(k.id)}>
                    <td>{k.name}</td><td>{attr.nopol ?? '-'}</td>
                    <td style={{ color: dekat ? '#B91C1C' : undefined, fontWeight: dekat ? 700 : undefined }}>{tempo ? tempo.toLocaleDateString('id-ID') : '-'}</td>
                  </tr>
                );
              })}
            </Tabel>
          )}
        </div>
      </section>
    </div>
  );
}
