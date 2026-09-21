import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';

/** Read-only: TugasLms tidak punya tabel submisi per-santri di skema, jadi status berlaku per kursus, bukan per santri. */
export async function TabTugas() {
  const tugas = await prisma.tugasLms.findMany({ orderBy: { deadline: 'asc' }, include: { kursus: true } });
  const aktif = tugas.filter((t) => t.status !== 'Selesai');
  const now = Date.now();

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Tugas &amp; penilaian</div>
      <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 14 }}>{aktif.length} tugas menunggu di seluruh kursus LMS.</div>
      {tugas.length === 0 && <Kosong pesan="Belum ada tugas." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tugas.map((t) => {
          const sisaJam = Math.round((t.deadline.getTime() - now) / 3600000);
          const mendesak = t.status !== 'Selesai' && sisaJam < 48;
          return (
            <div key={t.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', borderRadius: 12, border: '1px solid #F0EDE4', background: '#FAF8F3', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1F2937' }}>{t.judul}</div>
                <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2 }}>{t.kode} · {t.kursus.nama}</div>
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 12, color: '#4B5563' }}>{t.deadline.toLocaleString('id-ID')}</div>
                {mendesak && <div style={{ fontSize: 11.5, color: '#B91C1C', fontWeight: 700, marginTop: 2 }}>{sisaJam > 0 ? `Sisa ${sisaJam} jam` : 'Lewat tenggat'}</div>}
              </div>
              <Badge status={t.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
