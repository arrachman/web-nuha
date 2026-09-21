import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pesertaSaya } from '@/app/(staf)/ujian/cbt-bersama';
import { selesaikanKerja } from '@/app/(staf)/ujian/peserta-actions';
import { prisma } from '@/lib/prisma';
import { Pengawas } from './Pengawas';
import { KartuSoal } from './KartuSoal';

/**
 * Layar mengerjakan ujian. Naskah soal hanya dikirim ke peserta yang memang
 * berstatus Mengerjakan pada sesi yang sedang Berjalan — kalau tidak, soal
 * bisa dibaca sebelum ujian dibuka. Urutan soal diambil dari
 * `PesertaCbt.urutan` yang sudah dikunci saat masuk.
 */
export default async function KerjakanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { peserta } = await pesertaSaya(BigInt(id));
  const { sesi } = peserta;

  if (peserta.status !== 'Mengerjakan') redirect('/portal/santri?tab=ujian');
  if (sesi.status !== 'Berjalan' || new Date() > sesi.selesai) redirect('/portal/santri?tab=ujian');

  const butir = await prisma.butirPaket.findMany({
    where: { paketId: sesi.paketId },
    include: { soal: { include: { opsi: { select: { label: true, teks: true }, orderBy: { urutan: 'asc' } } } } },
  });
  const urut: string[] = peserta.urutan ? JSON.parse(peserta.urutan) : butir.map((b) => String(b.soalId));
  const perId = new Map(butir.map((b) => [String(b.soalId), b]));
  const soalUrut = urut.map((sid) => perId.get(sid)).filter((b): b is (typeof butir)[number] => Boolean(b));

  const jawaban = await prisma.jawabanPeserta.findMany({
    where: { pesertaId: peserta.id },
    select: { soalId: true, jawaban: true, ragu: true },
  });
  const jawabanPer = new Map(jawaban.map((j) => [String(j.soalId), j]));

  const terjawab = soalUrut.filter((b) => {
    const j = jawabanPer.get(String(b.soalId));
    return Boolean(j?.jawaban && j.jawaban.trim() !== '');
  }).length;

  return (
    <div style={{ minHeight: '100vh', background: '#EDF3EF', padding: '0 0 60px', userSelect: 'none' }}>
      <header style={{ background: 'linear-gradient(180deg,#4E8F72,#5C9C7D 52%,#74B092)', color: '#F3F1E9', padding: '18px 26px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(243,241,233,.72)' }}>
              {sesi.kode} · No. {peserta.noPeserta}
            </div>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 21, fontWeight: 600 }}>{sesi.paket.nama}</div>
            <div style={{ fontSize: 12, color: 'rgba(243,241,233,.8)', marginTop: 3 }}>
              {terjawab}/{soalUrut.length} soal terjawab
            </div>
          </div>
          <div style={{ background: 'rgba(250,248,243,.92)', borderRadius: 14, padding: '12px 16px' }}>
            <Pengawas
              pesertaId={String(peserta.id)}
              batas={sesi.batasPelanggaran}
              sudah={peserta.pelanggaran}
              selesaiIso={sesi.selesai.toISOString()}
            />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sesi.paket.jenis === 'AKM' && (
          <div className="alert alert-info">
            Ujian AKM: beberapa soal berbagi satu stimulus (bacaan). Bacalah stimulus di atas soal sebelum menjawab.
          </div>
        )}

        {soalUrut.map((b, i) => (
          <KartuSoal
            key={String(b.soalId)}
            nomor={i + 1}
            pesertaId={String(peserta.id)}
            soal={{
              id: String(b.soalId),
              tipe: b.soal.tipe,
              stimulus: b.soal.stimulus,
              pertanyaan: b.soal.pertanyaan,
              bobot: Number(b.bobot),
              opsi: b.soal.opsi,
            }}
            jawabanAwal={jawabanPer.get(String(b.soalId))?.jawaban ?? ''}
            raguAwal={jawabanPer.get(String(b.soalId))?.ragu ?? false}
          />
        ))}

        <SelesaiPanel pesertaId={String(peserta.id)} terjawab={terjawab} total={soalUrut.length} />
      </div>
    </div>
  );
}

function SelesaiPanel({ pesertaId, terjawab, total }: { pesertaId: string; terjawab: number; total: number }) {
  return (
    <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600 }}>Selesai mengerjakan?</div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>
          {terjawab} dari {total} soal terjawab. Setelah diakhiri, jawaban tidak dapat diubah.
        </div>
      </div>
      <Link href="/portal/santri?tab=ujian" className="btn btn-sekunder">Kembali nanti</Link>
      <form action={selesaikanKerja}>
        <input type="hidden" name="pesertaId" value={pesertaId} />
        <button type="submit" className="btn">Akhiri ujian</button>
      </form>
    </div>
  );
}
