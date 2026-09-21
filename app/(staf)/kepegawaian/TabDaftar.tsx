import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, Pagination, UKURAN_HALAMAN } from '@/components';
import { wherePegawai, hrefKepegawaian, URUT_PEGAWAI, type FilterPegawai } from './filter';

/**
 * Daftar induk pegawai — satu-satunya layar yang memperlihatkan baris `pegawai`
 * itu sendiri; tab lain semuanya data turunan (piket, jurnal, presensi, dst).
 */
export async function TabDaftar({ f, halaman }: { f: FilterPegawai; halaman: number }) {
  const where = wherePegawai(f);
  const [total, baris] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      include: { person: true, unit: true },
      orderBy: URUT_PEGAWAI[f.urut].orderBy,
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <Card
      judul={`Daftar Pegawai — ${total} orang`}
      sub="Data induk guru & pegawai. Gunakan penjelajah lembaga di atas untuk menyaring per SMP, MA, Pondok, atau Poskestren."
    >
      {baris.length === 0 ? (
        <Kosong pesan="Tidak ada pegawai yang cocok dengan penyaring ini. Coba bersihkan filter atau ganti lembaga." />
      ) : (
        <>
          <Tabel kolom={['Nama', 'NIP', 'Lembaga', 'Jabatan', 'Mapel diampu', 'Status', { label: 'Jam', num: true }]}>
            {baris.map((p) => (
              <tr key={String(p.id)}>
                <td>{p.person.fullName}</td>
                <td>{p.employeeNumber}</td>
                <td>{p.unit ? p.unit.key : <span style={{ opacity: 0.6 }}>—</span>}</td>
                <td>{p.position}</td>
                <td>{p.subjectsTaught ?? <span style={{ opacity: 0.6 }}>—</span>}</td>
                <td><span className="badge badge-netral">{p.status}</span></td>
                <td className="num">{p.teachingHours || '—'}</td>
              </tr>
            ))}
          </Tabel>
          {totalHalaman > 1 && (
            <Pagination
              halaman={halaman}
              totalHalaman={totalHalaman}
              total={total}
              jumlahBaris={baris.length}
              ukuranHalaman={UKURAN_HALAMAN}
              buatHref={(h) => hrefKepegawaian('daftar', f, {}, { halaman: h })}
            />
          )}
        </>
      )}
    </Card>
  );
}
