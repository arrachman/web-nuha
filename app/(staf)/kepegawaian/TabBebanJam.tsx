import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong } from '@/components';
import { whereUnit, type FilterPegawai } from './filter';

export async function TabBebanJam({ f }: { f: FilterPegawai }) {
  const staff = whereUnit(f.unit);
  const beban = await prisma.teachingLoad.findMany({
    where: staff ? { staff } : {},
    include: { staff: { include: { person: true } }, academicYear: true },
    orderBy: [{ id: 'desc' }],
  });

  return (
    <Card
      judul="Beban Jam Mengajar"
      sub="Struktur data mengikuti SK Pembagian Tugas Guru 2026 — kolom jumlah jam di dokumen sumber KOSONG, belum diisi client. Menunggu data resmi sebelum diimpor."
    >
      {beban.length === 0 ? (
        <Kosong pesan="Belum ada beban jam tercatat — menunggu angka resmi dari client." />
      ) : (
        <Tabel kolom={['Pegawai', 'Tahun ajaran', 'Mapel', { label: 'Jumlah jam', num: true }, 'Keterangan']}>
          {beban.map((b) => (
            <tr key={String(b.id)}>
              <td>{b.staff.person.fullName}</td>
              <td>{b.academicYear ? `${b.academicYear.code} ${b.academicYear.semester}` : '-'}</td>
              <td>{b.subject ?? '-'}</td>
              <td className="num">{b.hours ?? '-'}</td>
              <td>{b.notes ?? '-'}</td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
