import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

// Skema hafalan tidak menyimpan capaian per-juz (hanya log setoran per surat/ayat),
// jadi progres ditampilkan sebagai jumlah setoran tercatat, bukan pecahan 30 juz.
const TARGET_SETORAN = 60;

export async function TabHafalan({ santriId, program }: { santriId: bigint; program: string | null }) {
  const setoran = await prisma.memorization.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' }, take: 20 });
  const pct = Math.min(100, Math.round((setoran.length / TARGET_SETORAN) * 100));

  return (
    <>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Capaian hafalan</div>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 24, color: '#0F6B3D', fontWeight: 600, marginTop: 4 }}>{setoran.length} setoran</div>
        <div style={{ height: 9, borderRadius: 999, background: '#F0EDE4', marginTop: 10, overflow: 'hidden' }}><div style={{ height: 9, width: `${pct}%`, background: '#E8973A' }} /></div>
        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 6 }}>Program {program ?? '-'} · {pct}% dari target {TARGET_SETORAN} setoran/tahun</div>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Riwayat setoran</div>
        {setoran.length === 0 && <Kosong pesan="Belum ada setoran tercatat." />}
        {setoran.map((k) => (
          <div key={String(k.id)} style={{ padding: '11px 0', borderBottom: '1px solid #F5F2EA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{k.chapter} {k.verses}</span>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: '#DCF0E3', color: '#0F6B3D', fontSize: 11, fontWeight: 700 }}>{k.score}</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{k.date.toLocaleDateString('id-ID')} · {k.type} · {k.examiner}</div>
          </div>
        ))}
      </div>
    </>
  );
}
