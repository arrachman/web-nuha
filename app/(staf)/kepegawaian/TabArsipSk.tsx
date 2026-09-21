import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong } from '@/components';
import { whereUnit, type FilterPegawai } from './filter';

export async function TabArsipSk({ f }: { f: FilterPegawai }) {
  const staff = whereUnit(f.unit);
  const arsip = await prisma.decreeArchive.findMany({
    where: staff ? { staff } : {},
    include: { staff: { include: { person: true } } },
    orderBy: [{ date: 'desc' }],
  });

  return (
    <Card
      judul="Arsip SK Kepegawaian"
      sub="Berkas SK disajikan lewat route bergerbang (login wajib), bukan public/ — lihat app/kepegawaian/berkas/[nama]/route.ts."
    >
      {arsip.length === 0 ? (
        <Kosong pesan="Belum ada SK diarsipkan. 5 berkas SK dari client (docs/) belum dipindahkan ke sk-assets/ — perlu konfirmasi nomor & jenis SK sebelum diimpor." />
      ) : (
        <Tabel kolom={['Nomor', 'Judul', 'Tanggal', 'Jenis', 'Pegawai', 'Berkas']}>
          {arsip.map((a) => (
            <tr key={String(a.id)}>
              <td>{a.number}</td>
              <td>{a.title}</td>
              <td>{a.date.toLocaleDateString('id-ID')}</td>
              <td>{a.type}</td>
              <td>{a.staff?.person.fullName ?? '-'}</td>
              <td>
                {a.fileUrl ? (
                  <a href={`/kepegawaian/berkas/${a.fileUrl}`} target="_blank" rel="noreferrer">
                    Unduh
                  </a>
                ) : '-'}
              </td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
