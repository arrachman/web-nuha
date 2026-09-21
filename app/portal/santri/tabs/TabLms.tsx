import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

/**
 * Skema tidak punya tabel pendaftaran per-santri untuk KursusLms, jadi katalog
 * kursus & materi ditampilkan apa adanya (satu katalog untuk seluruh pondok),
 * bukan hasil filter berdasarkan santri yang login.
 */
export async function TabLms() {
  const [kursus, materi] = await Promise.all([
    prisma.kursusLms.findMany(),
    prisma.materiLms.findMany({ orderBy: { tgl: 'desc' }, take: 20, include: { kursus: true } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {kursus.length === 0 && <Kosong pesan="Belum ada kursus LMS." />}
        {kursus.map((k) => {
          const pct = k.modul > 0 ? Math.round((k.selesai / k.modul) * 100) : 0;
          return (
            <div key={k.id} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1F2937', lineHeight: 1.35 }}>{k.nama}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{k.guru}</div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}><div style={{ fontSize: 10.5, color: '#6B7280' }}>Nilai</div><div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 20, fontWeight: 600, color: '#0F6B3D' }}>{k.nilai}</div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6B7280', marginBottom: 6 }}><span>{k.selesai}/{k.modul} modul</span><span style={{ fontWeight: 700, color: '#0A4A2B' }}>{pct}%</span></div>
                <div style={{ height: 8, borderRadius: 999, background: '#F0EDE4', overflow: 'hidden' }}><div style={{ height: 8, width: `${pct}%`, background: '#0F6B3D' }} /></div>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 999, background: k.tugasAktif > 0 ? '#FEF3C7' : '#DCF0E3', color: k.tugasAktif > 0 ? '#92400E' : '#0F6B3D', fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>{k.tugasAktif} tugas aktif</span>
            </div>
          );
        })}
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 14 }}>Materi &amp; bahan ajar</div>
        {materi.length === 0 && <Kosong pesan="Belum ada materi." />}
        {materi.map((m) => (
          <div key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '13px 15px', borderRadius: 12, border: '1px solid #F0EDE4', background: '#FAF8F3', flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937' }}>{m.judul}</div>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>{m.kursus.nama} · {m.tipe} · {m.tgl.toLocaleDateString('id-ID')}</div>
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: '#DBEAFE', color: '#1E40AF', fontSize: 11.5, fontWeight: 700 }}>{m.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
