import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';
import { nilaiEsai } from './cbt-actions';

/**
 * Esai satu sesi yang menunggu nilai guru. Butir esai tidak dikoreksi mesin,
 * jadi skor peserta bersifat sementara sampai semuanya dinilai di sini.
 */
export async function PanelEsai({ sesiId }: { sesiId: number }) {
  const jawaban = await prisma.jawabanPeserta.findMany({
    where: {
      peserta: { sesiId },
      soal: { tipe: 'Esai' },
      jawaban: { not: null },
    },
    include: {
      soal: { select: { pertanyaan: true, bobot: true } },
      peserta: { include: { santri: { select: { nis: true, person: { select: { fullName: true } } } } } },
    },
    orderBy: [{ dinilaiOleh: 'asc' }, { id: 'asc' }],
    take: 50,
  });

  if (jawaban.length === 0) return null;
  const menunggu = jawaban.filter((j) => !j.dinilaiOleh).length;

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 className="card-judul">Penilaian esai</h3>
      <p className="card-sub">
        {menunggu} dari {jawaban.length} jawaban esai belum dinilai. Skor peserta dihitung ulang setiap
        satu esai dinilai.
      </p>
      {jawaban.length === 0 && <Kosong pesan="Tidak ada esai pada sesi ini." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {jawaban.map((j) => (
          <div key={String(j.id)} style={{ padding: '13px 15px', borderRadius: 12, border: '1px solid #F0EDE4', background: '#FAF8F3' }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {j.peserta.santri.person.fullName} · {j.peserta.santri.nis} · {j.peserta.noPeserta}
            </div>
            <div style={{ fontSize: 12.5, color: '#4B5563', marginTop: 4 }}>{j.soal.pertanyaan}</div>
            <div style={{ fontSize: 13.5, color: '#1F2937', marginTop: 8, whiteSpace: 'pre-wrap' }}>{j.jawaban}</div>
            <form action={nilaiEsai} style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="hidden" name="jawabanId" value={String(j.id)} />
              <input
                name="skor"
                type="number"
                min={0}
                max={Number(j.soal.bobot)}
                step="0.5"
                defaultValue={j.dinilaiOleh ? Number(j.skor) : ''}
                required
                style={{ width: 90, padding: '8px 10px', borderRadius: 10, border: '1px solid #E8E3D9' }}
              />
              <span style={{ fontSize: 12, color: '#6B7280' }}>dari {Number(j.soal.bobot)} poin</span>
              <button className="btn btn-sekunder" style={{ fontSize: 12 }}>Simpan nilai</button>
              {j.dinilaiOleh && (
                <span style={{ fontSize: 11.5, color: '#0F6B3D' }}>Dinilai {j.dinilaiOleh}</span>
              )}
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
