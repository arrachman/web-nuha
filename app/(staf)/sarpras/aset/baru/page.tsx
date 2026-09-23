import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { izinSarpras } from '@/lib/aset/akses';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { registrasiAset } from '../../actions';
import { Kembali } from '../../Kembali';
import { lokasiPilihan, stafPilihan, unitDalamCakupan } from '../../data';
import { FormAset } from '../FormAset';

export default async function RegistrasiAsetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requirePage('sarpras');
  const izin = await izinSarpras(session);
  if (!izin.asset_manage) redirect('/sarpras');
  const sp = await searchParams;
  const [units, kategori, lokasi, dana, vendor, staf] = await Promise.all([
    unitDalamCakupan(session), prisma.assetCategory.findMany({ orderBy: { code: 'asc' } }), lokasiPilihan(session),
    prisma.fundingSource.findMany({ orderBy: { id: 'asc' } }), prisma.vendor.findMany({ orderBy: { name: 'asc' } }), stafPilihan(),
  ]);
  return (
    <>
      <JudulHalaman judul="Registrasi Aset" sub="Kode inventaris & token QR dibangkitkan otomatis saat disimpan." />
      <div style={{ marginBottom: 14 }}><Link href="/sarpras?tab=aset" style={{ fontSize: 13 }}>&larr; Kembali ke daftar aset</Link></div>
      <PesanAksi galat={satu(sp.galat) || undefined} />
      <form action={registrasiAset} className="card">
        <Kembali ke="/sarpras/aset/baru" />
        <FormAset pilihan={{ units, kategori, lokasi, dana, vendor, staf }} />
        <div className="field"><label>Foto aset (JPEG/PNG/WebP, maks 5 MB)</label><input type="file" name="foto" accept="image/*" capture="environment" /></div>
        <button type="submit" className="btn">Simpan &amp; bangkitkan kode</button>
      </form>
    </>
  );
}
