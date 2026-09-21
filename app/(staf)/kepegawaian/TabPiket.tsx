import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong } from '@/components';
import { whereUnit, type FilterPegawai } from './filter';

export async function TabPiket({ f }: { f: FilterPegawai }) {
  // Baris tanpa pegawai terhubung sengaja ikut tersaring keluar saat lembaga
  // dipilih — kita belum tahu ia milik lembaga mana.
  const staff = whereUnit(f.unit);
  const piket = await prisma.jadwalPiket.findMany({
    where: staff ? { staff } : {},
    include: { staff: { include: { person: true } } },
    orderBy: [{ urutan: 'asc' }],
  });

  return (
    <Card
      judul={`Jadwal Guru Piket — ${piket.length} baris`}
      sub="Sumber: jadwal piket mingguan yang dikonfirmasi client (bukan khusus masa orientasi)."
    >
      {piket.length === 0 ? (
        <Kosong pesan="Belum ada jadwal piket. Data foto sumber belum bisa diimpor otomatis karena sebagian besar nama guru belum cocok ke data Pegawai — menunggu konfirmasi client." />
      ) : (
        <Tabel kolom={['Hari', 'Waktu', 'Guru piket']}>
          {piket.map((p) => (
            <tr key={p.id}>
              <td>{p.hari}</td>
              <td>{p.waktuMulai}–{p.waktuSelesai}</td>
              <td>{p.staff?.person.fullName ?? '-'}</td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
