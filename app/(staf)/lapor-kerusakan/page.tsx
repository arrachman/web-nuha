import Link from 'next/link';
import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { laporKerusakan } from '../sarpras/actions';
import { Kembali } from '../sarpras/Kembali';

const TINGKAT = [
  { v: 'Ringan', d: 'Masih bisa dipakai' },
  { v: 'Sedang', d: 'Mengganggu pemakaian' },
  { v: 'Berat', d: 'Tidak bisa dipakai' },
  { v: 'Darurat', d: 'Mengganggu KBM / membahayakan' },
];

/**
 * Lapor kerusakan dari HP (04 §6.2) — 3 kolom: apa yang rusak, tingkat, foto.
 * Dibuka langsung, atau dari hasil pindai QR aset (?aset=) / ruang (?ruang=).
 */
export default async function LaporKerusakanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('sarpras');
  const unitAktif = await getUnitAktif(session);
  const sp = await searchParams;
  const tokenAset = satu(sp.aset);
  const tokenRuang = satu(sp.ruang);
  const [aset, ruang, semuaRuang] = await Promise.all([
    tokenAset ? prisma.asset.findUnique({ where: { qrToken: tokenAset }, include: { location: true } }) : null,
    tokenRuang ? prisma.assetLocation.findUnique({ where: { qrToken: tokenRuang } }) : null,
    !tokenAset && !tokenRuang ? prisma.assetLocation.findMany({ where: { isActive: true, type: { in: ['Ruang', 'Area'] }, ...(unitAktif != null ? { OR: [{ unitId: unitAktif }, { unitId: null }] } : {}) }, orderBy: { name: 'asc' } }) : [],
  ]);
  const kembali = `/lapor-kerusakan${tokenAset ? `?aset=${tokenAset}` : tokenRuang ? `?ruang=${tokenRuang}` : ''}`;

  return (
    <div style={{ maxWidth: 560 }}>
      <JudulHalaman judul="Lapor Kerusakan" sub="Petugas sarpras menerima laporan Anda dan menindaklanjutinya." />
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      {satu(sp.pesan) && <p style={{ fontSize: 13 }}><Link href="/sarpras?tab=kerusakan">Lihat status laporan saya &rarr;</Link></p>}
      <form action={laporKerusakan} className="card">
        <Kembali ke={kembali} />
        {aset ? (
          <div className="field"><label>Aset</label><div data-testid="target-lapor"><b>{aset.name}</b> <span className="muted">· {aset.location?.name ?? '-'}</span></div><input type="hidden" name="asetToken" value={aset.qrToken} /></div>
        ) : ruang ? (
          <div className="field"><label>Ruang</label><div data-testid="target-lapor"><b>{ruang.name}</b></div><input type="hidden" name="ruangToken" value={ruang.qrToken} /></div>
        ) : (
          <div className="field"><label>Ruang / lokasi *</label>
            <select name="locationId" required><option value="">— pilih —</option>{semuaRuang.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </div>
        )}
        <div className="field"><label>Apa yang rusak? *</label><textarea name="description" rows={3} required minLength={5} placeholder="mis. Lampu proyektor mati, tidak menyala sama sekali." /></div>
        <div className="field">
          <label>Tingkat kerusakan *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TINGKAT.map((t) => (
              <label key={t.v} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', border: '1px solid var(--garis)', borderRadius: 10, padding: '9px 10px', fontWeight: 400, cursor: 'pointer' }}>
                <input type="radio" name="severity" value={t.v} required style={{ width: 'auto', height: 'auto', marginTop: 3 }} />
                <span><b style={{ display: 'block', fontSize: 13 }}>{t.v}</b><span className="muted" style={{ fontSize: 11.5 }}>{t.d}</span></span>
              </label>
            ))}
          </div>
        </div>
        <div className="field"><label>Foto (opsional)</label><input type="file" name="foto" accept="image/*" capture="environment" /></div>
        <button type="submit" className="btn" style={{ width: '100%' }}>Kirim laporan</button>
      </form>
    </div>
  );
}
