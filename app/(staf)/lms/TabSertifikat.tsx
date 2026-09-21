import { prisma } from '@/lib/prisma';
import { Card, Tabel, Badge, Kosong } from '@/components';

/**
 * Skema tidak punya model sertifikat/nomor terbit. Sebagai padanan dari data nyata:
 * sertifikat dianggap "Terbit" untuk kursus yang seluruh modulnya sudah tuntas
 * (selesai === modul), "Belum terbit" jika belum — bukan angka atau nomor rekaan.
 */
export async function TabSertifikat() {
  const kursus = await prisma.kursusLms.findMany({ orderBy: { nama: 'asc' } });
  const terbit = kursus.filter((k) => k.modul > 0 && k.selesai >= k.modul).length;

  return (
    <Card
      judul="Penerbitan sertifikat kompetensi"
      sub={`Sertifikat terbit otomatis untuk kursus yang seluruh modulnya tuntas: ${terbit} dari ${kursus.length} kursus.`}
    >
      {kursus.length === 0 ? (
        <Kosong pesan="Belum ada kursus untuk dinilai kelulusannya." />
      ) : (
        <Tabel kolom={['Kursus', 'Pengajar', { label: 'Ketuntasan', num: true }, { label: 'Nilai rata-rata', num: true }, 'Status']}>
          {kursus.map((k) => {
            const lulus = k.modul > 0 && k.selesai >= k.modul;
            return (
              <tr key={k.id}>
                <td style={{ fontWeight: 600 }}>{k.nama}</td>
                <td>{k.guru}</td>
                <td className="num">{k.selesai}/{k.modul} modul</td>
                <td className="num">{k.nilai}</td>
                <td><Badge status={lulus ? 'Terbit' : 'Belum terbit'} /></td>
              </tr>
            );
          })}
        </Tabel>
      )}
    </Card>
  );
}
