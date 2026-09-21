import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';
import { ajukanIzin } from '../actions';

const JENIS_OPTS = ['Pulang', 'Sakit', 'Keperluan keluarga', 'Lainnya'];
const KOTAK: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 };

export async function TabIzin({ santriId }: { santriId: bigint }) {
  const awalSemester = new Date();
  awalSemester.setMonth(awalSemester.getMonth() - 6);

  const izin = await prisma.leavePermit.findMany({ where: { studentId: santriId }, orderBy: { departedAt: 'desc' } });
  const izinSemester = izin.filter((z) => z.departedAt >= awalSemester);
  const berjalan = izin.filter((z) => z.status === 'Pending' || z.status === 'Approved');
  const stat = [
    { label: 'Total pengajuan', v: izinSemester.length, c: '#0F6B3D' },
    { label: 'Disetujui', v: izinSemester.filter((z) => z.status === 'Approved' || z.status === 'Completed').length, c: '#1D4ED8' },
    { label: 'Menunggu', v: izinSemester.filter((z) => z.status === 'Pending').length, c: '#E8973A' },
    { label: 'Ditolak', v: izinSemester.filter((z) => z.status === 'Rejected').length, c: '#B91C1C' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stat.map((z) => (
          <div key={z.label} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 18 }}>
            <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#6B7280', fontWeight: 700 }}>{z.label}</div>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 24, fontWeight: 600, color: z.c, marginTop: 4 }}>{z.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <form action={ajukanIzin} style={KOTAK}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Ajukan izin baru</div>
          <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 16 }}>Diverifikasi musyrif lalu disetujui pengasuh. Wali menerima notifikasi.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Jenis izin</span>
              <select name="jenis" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FFF', fontSize: 13.5 }}>
                {JENIS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Mulai</span>
                <input type="date" name="mulai" required style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13.5 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Kembali</span>
                <input type="date" name="selesai" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13.5 }} />
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Alasan</span>
              <textarea name="alasan" rows={2} required placeholder="Contoh: hajatan keluarga di rumah" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13.5, resize: 'vertical' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Penjemput (wajib mahram)</span>
              <input name="penjemput" required placeholder="Bpk. Sulaiman Hadi (ayah)" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13.5 }} />
            </label>
            <button className="btn" type="submit">Kirim pengajuan izin</button>
          </div>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={KOTAK}>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Izin berjalan</div>
            {berjalan.length === 0 && <Kosong pesan="Tidak ada izin yang sedang berjalan." />}
            {berjalan.map((z) => (
              <div key={String(z.id)} style={{ padding: '13px 15px', borderRadius: 12, border: '1px solid #F0EDE4', borderLeft: '4px solid #E8973A', background: '#FAF8F3', marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937' }}>{z.code}</span>
                  <Badge status={z.status} />
                </div>
                <div style={{ fontSize: 12.5, color: '#4B5563', marginTop: 5 }}>{z.reason}</div>
                <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{z.departedAt.toLocaleDateString('id-ID')} → {z.returnedAt ? z.returnedAt.toLocaleDateString('id-ID') : 'belum'} · {z.pickupBy}</div>
              </div>
            ))}
          </div>
          <div style={KOTAK}>
            <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Riwayat izin semester ini</div>
            {izinSemester.length === 0 && <Kosong pesan="Belum ada riwayat izin semester ini." />}
            {izinSemester.map((z) => (
              <div key={String(z.id)} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 2px', borderBottom: '1px solid #F5F2EA', flexWrap: 'wrap' }}>
                <div style={{ width: 100, fontSize: 11.5, fontWeight: 700, color: '#0F6B3D' }}>{z.code}</div>
                <div style={{ flex: 1, minWidth: 150 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937' }}>{z.type}</div><div style={{ fontSize: 11.5, color: '#6B7280' }}>{z.reason} · {z.departedAt.toLocaleDateString('id-ID')}</div></div>
                <Badge status={z.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
