import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, Badge, UKURAN_HALAMAN } from '@/components';
import { whereUnit, type FilterPegawai } from './filter';

export async function TabPresensi({ f }: { f: FilterPegawai }) {
  const staff = whereUnit(f.unit);
  const presensi = await prisma.staffAttendance.findMany({
    where: staff ? { staff } : {},
    include: { staff: { include: { person: true } } },
    orderBy: [{ date: 'desc' }],
    take: UKURAN_HALAMAN,
  });

  return (
    <Card
      judul="Presensi Pegawai"
      sub="Presensi khusus pegawai, terpisah dari presensi santri."
    >
      {presensi.length === 0 ? (
        <Kosong pesan="Belum ada presensi pegawai tercatat." />
      ) : (
        <Tabel kolom={['Tanggal', 'Pegawai', 'Masuk', 'Pulang', 'Status']}>
          {presensi.map((p) => (
            <tr key={String(p.id)}>
              <td>{p.date.toLocaleDateString('id-ID')}</td>
              <td>{p.staff.person.fullName}</td>
              <td>{p.checkIn ?? '-'}</td>
              <td>{p.checkOut ?? '-'}</td>
              <td><Badge status={p.status} /></td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
