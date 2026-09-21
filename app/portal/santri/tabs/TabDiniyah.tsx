import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

export async function TabDiniyah({ kelas }: { kelas: string }) {
  const mapelDiniyah = await prisma.mataPelajaran.findMany({ where: { kurikulum: 'Kurikulum Diniyah' } });
  const namaDiniyah = mapelDiniyah.map((m) => m.nama);
  const guruByMapel = new Map(mapelDiniyah.map((m) => [m.nama, m.guru]));

  const [jadwalDiniyah, kegiatan] = await Promise.all([
    kelas ? prisma.jadwalPelajaran.findMany({ where: { kelas, mapel: { in: namaDiniyah } }, orderBy: [{ hari: 'asc' }, { jamKe: 'asc' }] }) : Promise.resolve([]),
    prisma.dailyActivity.findMany({ orderBy: { order: 'asc' } }),
  ]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, alignItems: 'start' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Jadwal madrasah diniyah</div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 14 }}>Kehadiran diabsen musyrif tiap majelis.</div>
        {jadwalDiniyah.length === 0 && <Kosong pesan="Belum ada jadwal diniyah untuk kelas ini." />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jadwalDiniyah.map((d) => (
            <div key={d.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #F0EDE4', background: '#FAF8F3' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#E8973A', letterSpacing: 0.3 }}>{d.hari} · {d.waktu}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginTop: 4 }}>{d.mapel}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{d.guru ?? guruByMapel.get(d.mapel) ?? '-'}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Jadwal kegiatan harian</div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 14 }}>Rutinitas santri aktif dari qiyamul lail hingga istirahat malam.</div>
        {kegiatan.length === 0 && <Kosong pesan="Belum ada kegiatan harian." />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {kegiatan.map((k) => (
            <div key={k.id} style={{ display: 'flex', gap: 13, padding: '10px 4px', borderBottom: '1px solid #F5F2EA' }}>
              <div style={{ width: 48, flex: '0 0 auto', fontSize: 12, fontWeight: 700, color: '#0F6B3D' }}>{k.time}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{k.name}</div><div style={{ fontSize: 11.5, color: '#6B7280' }}>{k.note ?? ''}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
