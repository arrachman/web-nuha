import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';
import type { SantriLengkap } from './types';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const KOTAK: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 };

export async function TabBeranda({ santri }: { santri: SantriLengkap }) {
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);
  const besok = new Date();
  besok.setDate(besok.getDate() + 1);
  const namaBesok = HARI[besok.getDay()];

  const [presensi, hafalanN, tugasAktifN, nilaiRows, pengumuman, jadwalBesok, kursus] = await Promise.all([
    prisma.attendance.groupBy({ by: ['status'], where: { studentId: santri.id, date: { gte: awalBulan } }, _count: { status: true } }),
    prisma.memorization.count({ where: { studentId: santri.id } }),
    prisma.tugasLms.count({ where: { status: { not: 'Selesai' } } }),
    prisma.nilai.findMany({ where: { santriId: santri.id } }),
    prisma.announcement.findMany({ orderBy: { date: 'desc' }, take: 3 }),
    santri.kelas ? prisma.jadwalPelajaran.findMany({ where: { kelas: santri.kelas.nama, hari: namaBesok }, orderBy: { jamKe: 'asc' } }) : Promise.resolve([]),
    prisma.kursusLms.findMany(),
  ]);

  const totalPresensi = presensi.reduce((n, r) => n + r._count.status, 0);
  const hadir = presensi.find((r) => r.status === 'Present')?._count.status ?? 0;
  const pctHadir = totalPresensi > 0 ? Math.round((hadir / totalPresensi) * 100) : 100;
  const nilaiRata = nilaiRows.length > 0 ? Math.round(nilaiRows.reduce((s, n) => s + Number(n.akhir), 0) / nilaiRows.length) : 0;
  const totalModul = kursus.reduce((s, k) => s + k.modul, 0);
  const totalSelesai = kursus.reduce((s, k) => s + k.selesai, 0);
  const pctLms = totalModul > 0 ? Math.round((totalSelesai / totalModul) * 100) : 0;

  const ringkas = [
    { label: 'Presensi bulan ini', v: `${pctHadir}%`, c: '#0F6B3D', sub: `${totalPresensi} sesi tercatat` },
    { label: 'Setoran hafalan', v: `${hafalanN}`, c: '#E8973A', sub: `Program ${santri.program ?? '-'}` },
    { label: 'Rata-rata nilai', v: `${nilaiRata}`, c: '#1D4ED8', sub: `${nilaiRows.length} mapel dinilai` },
    { label: 'Tugas menunggu', v: `${tugasAktifN}`, c: '#B91C1C', sub: 'Belum tuntas di LMS' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {ringkas.map((r) => (
          <div key={r.label} style={KOTAK}>
            <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>{r.label}</div>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 24, fontWeight: 600, color: r.c, marginTop: 5 }}>{r.v}</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{r.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
        <div style={KOTAK}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Pengumuman terbaru</div>
          {pengumuman.length === 0 && <Kosong pesan="Belum ada pengumuman." />}
          {pengumuman.map((p) => (
            <div key={String(p.id)} style={{ padding: '13px 15px', borderRadius: 12, background: '#FAF8F3', border: '1px solid #F0EDE4', marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937' }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: '#4B5563', marginTop: 3, lineHeight: 1.6 }}>{p.content}</div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 4 }}>{p.date.toLocaleDateString('id-ID')}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={KOTAK}>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Pelajaran besok ({namaBesok})</div>
            {jadwalBesok.length === 0 && <Kosong pesan="Tidak ada jadwal formal besok." />}
            {jadwalBesok.map((j) => (
              <div key={j.id} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 9, borderBottom: '1px solid #F5F2EA' }}>
                <div style={{ width: 92, fontSize: 11.5, fontWeight: 700, color: '#0F6B3D' }}>{j.waktu}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{j.mapel}</div><div style={{ fontSize: 11.5, color: '#6B7280' }}>{j.guru ?? '-'}</div></div>
              </div>
            ))}
          </div>
          <div style={{ ...KOTAK, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 6 }}>Progress LMS</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>{pctLms}% modul tuntas · rata-rata nilai {nilaiRata}</div>
              <div style={{ fontSize: 12, color: '#B91C1C', fontWeight: 600, marginTop: 8 }}>{tugasAktifN} tugas menunggu dikumpulkan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
