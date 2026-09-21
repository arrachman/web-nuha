import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function TabJadwal({ kelas, hariAktif }: { kelas: string; hariAktif?: string }) {
  const hari = HARI_LIST.includes(hariAktif ?? '') ? (hariAktif as string) : HARI_LIST[0];

  // Mapel diniyah tampil di tab Diniyah, jadi disingkirkan dari jadwal formal di sini.
  const mapelDiniyah = await prisma.mataPelajaran.findMany({ where: { kurikulum: 'Kurikulum Diniyah' }, select: { nama: true } });
  const namaDiniyah = mapelDiniyah.map((m) => m.nama);

  const jadwal = kelas
    ? await prisma.jadwalPelajaran.findMany({ where: { kelas, hari, mapel: { notIn: namaDiniyah } }, orderBy: { jamKe: 'asc' } })
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {HARI_LIST.map((h) => (
          <Link key={h} href={`/portal/santri?tab=jadwal&hari=${h}`} className={`tab ${h === hari ? 'active' : ''}`}>{h}</Link>
        ))}
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Jadwal pelajaran formal — {hari}</div>
        <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 16 }}>Kelas {kelas || '-'} · semester berjalan.</div>
        {jadwal.length === 0 && <Kosong pesan="Tidak ada jadwal pada hari ini." />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jadwal.map((j) => (
            <div key={j.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 12, border: '1px solid #F0EDE4', borderLeft: '4px solid #0F6B3D', background: '#FAF8F3', flexWrap: 'wrap' }}>
              <div style={{ width: 106, flex: '0 0 auto', fontSize: 12.5, fontWeight: 700, color: '#0F6B3D' }}>{j.waktu}</div>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{j.mapel}</div><div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{j.guru ?? '-'}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
