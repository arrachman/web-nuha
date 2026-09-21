import { prisma } from '@/lib/prisma';
import { Kosong, Tabel } from '@/components';

export async function TabHalaqah() {
  const halaqah = await prisma.studyCircle.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="card">
      <div className="card-judul">Jadwal halaqah &amp; kajian kitab</div>
      {halaqah.length === 0 ? (
        <Kosong pesan="Belum ada jadwal halaqah." />
      ) : (
        <Tabel kolom={['Halaqah', 'Pengampu', 'Waktu', 'Tempat', 'Jenjang', { label: 'Anggota', num: true }]}>
          {halaqah.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.teacher}</td>
              <td>{h.schedule}</td>
              <td>{h.location}</td>
              <td>{h.educationLevel}</td>
              <td className="num"><strong>{h.memberCount}</strong></td>
            </tr>
          ))}
        </Tabel>
      )}
    </div>
  );
}
