import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';
import { ajukanKunjunganWali } from '../actions';

const JAM_OPTS = ['09.00', '10.00', '11.00', '13.00', '14.00'];

export async function TabKunjungan({ santriId, namaWaliDefault, hubungan }: { santriId: bigint; namaWaliDefault: string; hubungan: string }) {
  const riwayat = await prisma.kunjungan.findMany({ where: { santriId }, orderBy: { tgl: 'desc' }, take: 10 });

  return (
    <>
      <form action={ajukanKunjunganWali} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 4 }}>Ajukan kunjungan</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Kunjungan umum tiap Ahad 09.00–15.00 di aula tamu.</div>
        </div>
        <input type="hidden" name="santriId" value={String(santriId)} />
        <input type="hidden" name="hubungan" value={hubungan} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Nama wali / tamu</span>
          <input name="namaWali" required defaultValue={namaWaliDefault} style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13 }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Tanggal</span>
            <input type="date" name="tgl" required style={{ padding: '11px 10px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FFF', fontSize: 12.5 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Jam</span>
            <select name="jam" style={{ padding: '11px 10px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FFF', fontSize: 12.5 }}>
              {JAM_OPTS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Keperluan</span>
          <textarea name="keperluan" rows={2} required placeholder="Menengok anak, konsultasi hafalan, dll." style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13, resize: 'vertical' }} />
        </label>
        <button className="btn" type="submit">Ajukan kunjungan</button>
      </form>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, marginTop: 14 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Riwayat kunjungan Anda</div>
        {riwayat.length === 0 && <Kosong pesan="Belum ada pengajuan kunjungan." />}
        {riwayat.map((k) => (
          <div key={String(k.id)} style={{ padding: '12px 13px', borderRadius: 11, border: '1px solid #F0EDE4', background: '#FAF8F3', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1F2937' }}>{k.tgl.toLocaleDateString('id-ID')}</span>
              <Badge status={k.status} />
            </div>
            <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{k.keperluan}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Masuk {k.jamMasuk ?? '-'} · keluar {k.jamKeluar ?? '-'}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '13px 15px', borderRadius: 12, background: '#F1F7F3', border: '1px solid #D7E9DE', fontSize: 12, color: '#0A4A2B', lineHeight: 1.6, marginTop: 14 }}>
        Maksimal 3 pengunjung per santri, durasi 90 menit. Mohon membawa kartu wali.
      </div>
    </>
  );
}
