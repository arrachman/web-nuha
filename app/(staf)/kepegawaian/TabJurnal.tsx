import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, UKURAN_HALAMAN } from '@/components';
import { whereUnit, type FilterPegawai } from './filter';

export async function TabJurnal({ f }: { f: FilterPegawai }) {
  const staff = whereUnit(f.unit);
  const jurnal = await prisma.jurnalMengajar.findMany({
    where: staff ? { staff } : {},
    include: { staff: { include: { person: true } } },
    orderBy: [{ tgl: 'desc' }],
    take: UKURAN_HALAMAN,
  });

  return (
    <Card
      judul="Jurnal Mengajar"
      sub="Catatan mengajar per pertemuan. Sumber: PRESENSI DAN JURNAL JULI-AGUSTUS AJARAN BARU 2025 — belum diimpor, menunggu pengumpul data terpisah."
    >
      {jurnal.length === 0 ? (
        <Kosong pesan="Belum ada jurnal mengajar tercatat." />
      ) : (
        <Tabel kolom={['Tanggal', 'Guru', 'Kelas', 'Jam ke', 'Materi', 'Hadir']}>
          {jurnal.map((j) => (
            <tr key={String(j.id)}>
              <td>{j.tgl.toLocaleDateString('id-ID')}</td>
              <td>{j.staff?.person.fullName ?? '-'}</td>
              <td>{j.kelas ?? '-'}</td>
              <td>{j.jamKe ?? '-'}</td>
              <td>{j.materi ?? '-'}</td>
              <td>{j.jumlahHadir ?? '-'}</td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
