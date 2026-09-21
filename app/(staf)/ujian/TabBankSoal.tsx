import { prisma } from '@/lib/prisma';
import { Kosong, Tabel } from '@/components';
import { mutuButir } from '@/lib/cbt';

const WARNA_TIPE: Record<string, string> = {
  PG: 'badge-hijau',
  PGK: 'badge-toska',
  BS: 'badge-biru',
  Menjodohkan: 'badge-oranye',
  IsianSingkat: 'badge-kuning',
  Esai: 'badge-pink',
};

const angka = (v: unknown) => (v === null || v === undefined ? '—' : Number(v).toFixed(2));

/**
 * Bank soal dengan hasil analisis butirnya. Guru hanya melihat soal mata
 * pelajaran yang diampunya — kunci jawaban milik mapel lain bukan urusannya.
 */
export async function TabBankSoal({ namaGuru }: { namaGuru: string | null }) {
  const mapelDiampu = namaGuru
    ? await prisma.jadwalPelajaran.findMany({
      where: { guru: namaGuru }, distinct: ['mapel'], select: { mapel: true },
    })
    : [];

  const soal = await prisma.soal.findMany({
    where: namaGuru ? { mapel: { nama: { in: mapelDiampu.map((m) => m.mapel) } } } : {},
    include: {
      mapel: { select: { nama: true } },
      _count: { select: { opsi: true, butir: true } },
    },
    orderBy: [{ mapelId: 'asc' }, { id: 'asc' }],
    take: 200,
  });

  if (soal.length === 0) {
    return (
      <Kosong pesan={
        namaGuru
          ? 'Belum ada soal untuk mata pelajaran yang Anda ampu.'
          : 'Bank soal masih kosong. Tambahkan butir soal lewat Master Data.'
      } />
    );
  }

  const terkalibrasi = soal.filter((s) => s.pDiff !== null).length;

  return (
    <div className="card">
      <h3 className="card-judul">Bank soal</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>
        {soal.length} butir, {terkalibrasi} sudah dianalisis. Tingkat kesukaran (p) mendekati 0 berarti
        sukar; daya beda (D) di bawah 0,20 menandakan butir tidak memisahkan peserta kuat dan lemah.
      </p>
      <Tabel kolom={['Mapel', 'Tipe', 'Level', 'Pertanyaan', 'Opsi', 'Dipakai', 'p', 'D', 'Mutu']}>
        {soal.map((s) => {
          const mutu = s.pDiff !== null && s.dIndex !== null
            ? mutuButir(Number(s.pDiff), Number(s.dIndex))
            : null;
          return (
            <tr key={String(s.id)}>
              <td>{s.mapel.nama}</td>
              <td><span className={`badge ${WARNA_TIPE[s.tipe] ?? 'badge-netral'}`}>{s.tipe}</span></td>
              <td>{s.level}</td>
              <td style={{ maxWidth: 340 }}>
                {s.stimulus && <span className="muted" style={{ fontSize: 12 }}>[stimulus] </span>}
                {s.pertanyaan.length > 90 ? `${s.pertanyaan.slice(0, 90)}…` : s.pertanyaan}
              </td>
              <td className="num">{s._count.opsi || '—'}</td>
              <td className="num">{s._count.butir}</td>
              <td className="num">{angka(s.pDiff)}</td>
              <td className="num">{angka(s.dIndex)}</td>
              <td>
                {mutu
                  ? <span className={`badge badge-${mutu.warna}`}>{mutu.label}</span>
                  : <span className="muted" style={{ fontSize: 12 }}>Belum dianalisis</span>}
              </td>
            </tr>
          );
        })}
      </Tabel>
    </div>
  );
}
