import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

const KOTAK: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16 };

/** Ringkasan anak: presensi bulan berjalan, hafalan terkini, kesehatan, pengumuman pondok. */
export async function TabRingkasan({ santriId, program }: { santriId: bigint; program: string | null }) {
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [presensi, hafalanN, sakit, pengumuman] = await Promise.all([
    prisma.attendance.groupBy({ by: ['status'], where: { studentId: santriId, date: { gte: awalBulan } }, _count: { status: true } }),
    prisma.memorization.count({ where: { studentId: santriId } }),
    prisma.medicalRecord.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' }, take: 2 }),
    prisma.announcement.findMany({ orderBy: { date: 'desc' }, take: 3 }),
  ]);

  const totalPresensi = presensi.reduce((n, r) => n + r._count.status, 0);
  const hadir = presensi.find((r) => r.status === 'Present')?._count.status ?? 0;
  const sakitN = presensi.find((r) => r.status === 'Sick')?._count.status ?? 0;
  const izinN = presensi.find((r) => r.status === 'Excused')?._count.status ?? 0;
  const pctHadir = totalPresensi > 0 ? Math.round((hadir / totalPresensi) * 100) : 100;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={KOTAK}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Presensi bulan ini</div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 26, color: '#0F6B3D', fontWeight: 600 }}>{pctHadir}%</div>
          <div style={{ fontSize: 11.5, color: '#6B7280' }}>{sakitN} hari sakit · {izinN} izin</div>
        </div>
        <div style={KOTAK}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>Hafalan</div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 22, color: '#E8973A', fontWeight: 600 }}>{hafalanN} setoran</div>
          <div style={{ fontSize: 11.5, color: '#6B7280' }}>Program {program ?? '-'}</div>
        </div>
      </div>

      <div style={{ ...KOTAK, marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Catatan kesehatan terbaru</div>
        {sakit.length === 0 && <Kosong pesan="Belum ada catatan kesehatan." />}
        {sakit.map((k) => (
          <div key={String(k.id)} style={{ padding: '12px 13px', borderRadius: 11, background: '#FFFBEB', border: '1px solid #F0CFA4', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>{k.diagnosis ?? k.complaint}</span>
              <span style={{ fontSize: 11.5, color: '#6B7280' }}>{k.date.toLocaleDateString('id-ID')}</span>
            </div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4, lineHeight: 1.55 }}>{k.complaint} · {k.followUp ?? '-'}</div>
          </div>
        ))}
      </div>

      <div style={{ ...KOTAK, marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Pengumuman pondok</div>
        {pengumuman.length === 0 && <Kosong pesan="Belum ada pengumuman." />}
        {pengumuman.map((p) => (
          <div key={String(p.id)} style={{ paddingBottom: 10, borderBottom: '1px solid #F5F2EA', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{p.title}</div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3, lineHeight: 1.55 }}>{p.content}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{p.date.toLocaleDateString('id-ID')}</div>
          </div>
        ))}
      </div>
    </>
  );
}
