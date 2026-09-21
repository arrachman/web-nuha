import { PencarianEntitas } from './PencarianEntitas';
import { requirePage } from '@/lib/access';
import { daftarMaster } from '@/lib/crud/daftar';

export default async function DataPage() {
  const session = await requirePage('dashboard');
  const { persona, kelompok } = await daftarMaster(session.peran);
  const personaKartu = persona.items.map((item) => ({ ...item, ringkas: item.ringkas ?? '', icon: persona.icon }));

  return <>
    <div className="card"><h3>Master data operasional</h3><p className="muted">Di sini Anda bisa menambah, mengubah, dan menghapus data. Daftarnya dikelompokkan per modul, dan Anda hanya melihat data yang menunya boleh Anda akses. Semua perubahan otomatis tercatat di audit log.</p></div>
    <PencarianEntitas persona={personaKartu} kelompok={kelompok} />
  </>;
}
