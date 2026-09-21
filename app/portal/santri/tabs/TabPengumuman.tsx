import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

export async function TabPengumuman() {
  const pengumuman = await prisma.announcement.findMany({ orderBy: { date: 'desc' }, take: 30 });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {pengumuman.length === 0 && <Kosong pesan="Belum ada pengumuman." />}
      {pengumuman.map((p) => (
        <div key={String(p.id)} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: '#DBEAFE', color: '#1E40AF', fontSize: 11, fontWeight: 700 }}>{p.target}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: '#9CA3AF' }}>{p.date.toLocaleDateString('id-ID')}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', lineHeight: 1.4 }}>{p.title}</div>
          <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.65 }}>{p.content}</div>
        </div>
      ))}
    </div>
  );
}
