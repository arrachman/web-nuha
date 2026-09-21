import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';
import type { SantriLengkap } from './types';

// Sama seperti portal wali: skema tidak menyimpan capaian per-juz, jadi progres
// dihitung dari jumlah setoran tercatat terhadap target tahunan.
const TARGET_SETORAN = 60;

export async function TabHafalan({ santri }: { santri: SantriLengkap }) {
  const [setoran, sakit, tazir] = await Promise.all([
    prisma.memorization.findMany({ where: { studentId: santri.id }, orderBy: { date: 'desc' }, take: 15 }),
    prisma.medicalRecord.findMany({ where: { studentId: santri.id }, orderBy: { date: 'desc' }, take: 2 }),
    prisma.discipline.findMany({ where: { studentId: santri.id }, orderBy: { date: 'desc' }, take: 3 }),
  ]);
  const pct = Math.min(100, Math.round((setoran.length / TARGET_SETORAN) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Capaian hafalan</div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 26, color: '#0F6B3D', fontWeight: 600, marginTop: 5 }}>{setoran.length} setoran</div>
          <div style={{ height: 9, borderRadius: 999, background: '#F0EDE4', marginTop: 10, overflow: 'hidden' }}><div style={{ height: 9, width: `${pct}%`, background: '#E8973A' }} /></div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 7 }}>{pct}% dari target {TARGET_SETORAN} setoran/tahun · program {santri.program ?? '-'}</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Catatan kesehatan &amp; ta&apos;zir</div>
          {sakit.map((k) => (
            <div key={String(k.id)} style={{ padding: '11px 13px', borderRadius: 11, background: '#FFFBEB', border: '1px solid #F0CFA4', marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>{k.diagnosis ?? k.complaint} · {k.date.toLocaleDateString('id-ID')}</div>
              <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3 }}>{k.complaint} — {k.followUp ?? '-'}</div>
            </div>
          ))}
          {tazir.map((t) => (
            <div key={String(t.id)} style={{ padding: '11px 13px', borderRadius: 11, background: '#FEF2F2', border: '1px solid #F0BFBF', marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#991B1B' }}>{t.violation} · {t.points} poin</div>
              <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3 }}>{t.sanction ?? '-'}</div>
            </div>
          ))}
          {sakit.length === 0 && tazir.length === 0 && <Kosong pesan="Tidak ada catatan kesehatan maupun ta'zir." />}
        </div>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Riwayat setoran</div>
        {setoran.length === 0 && <Kosong pesan="Belum ada setoran tercatat." />}
        {setoran.map((k) => (
          <div key={String(k.id)} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 15px', borderRadius: 12, border: '1px solid #F0EDE4', background: '#FAF8F3', flexWrap: 'wrap', marginBottom: 9 }}>
            <div style={{ width: 96, fontSize: 12, fontWeight: 700, color: '#0F6B3D' }}>{k.date.toLocaleDateString('id-ID')}</div>
            <div style={{ flex: 1, minWidth: 160 }}><span style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937' }}>{k.chapter}</span> <span style={{ fontSize: 12.5, color: '#6B7280' }}>ayat {k.verses} · {k.type}</span></div>
            <span style={{ padding: '4px 11px', borderRadius: 999, background: '#DCF0E3', color: '#0F6B3D', fontSize: 12, fontWeight: 700 }}>{k.score}</span>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{k.examiner}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
