import { avaBg, inisial } from '@/components';
import type { SantriLengkap } from './types';

export function TabKartu({ santri, nama }: { santri: SantriLengkap; nama: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ width: 400, maxWidth: '100%', borderRadius: 18, overflow: 'hidden', border: '1px solid #E8E3D9', background: '#FFFFFF' }}>
        <div style={{ background: 'linear-gradient(180deg, #4E8F72 0%, #5C9C7D 52%, #74B092 100%)', color: '#F3F1E9', padding: '18px 20px' }}>
          <div style={{ fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(243,241,233,.72)' }}>Kartu Santri Digital</div>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15.5, fontWeight: 600, marginTop: 3 }}>PPSS Nurul Huda Mergosono</div>
        </div>
        <div style={{ padding: 20, display: 'flex', gap: 15, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: avaBg(nama), color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-lora), serif', flex: '0 0 auto' }}>{inisial(nama)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{nama}</div>
            <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 3 }}>NIS {santri.nis} · NISN {santri.nisn ?? '-'}</div>
            <div style={{ fontSize: 12.5, color: '#0F6B3D', fontWeight: 600, marginTop: 3 }}>{santri.unit?.nama ?? '-'} · Kelas {santri.kelas?.nama ?? '-'}</div>
          </div>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11.5, color: '#6B7280', lineHeight: 1.6 }}>Status: {santri.status}<br />Program: {santri.program ?? '-'}<br />Angkatan {santri.tahunMasuk ?? '-'}</div>
          <div style={{ width: 76, height: 76, borderRadius: 10, background: 'repeating-conic-gradient(#0A4A2B 0% 25%, #FFFFFF 0% 50%) 50% / 12px 12px', border: '3px solid #0A4A2B' }} />
        </div>
        <div style={{ padding: '12px 20px', background: '#FAF8F3', borderTop: '1px solid #F0EDE4', fontSize: 11, color: '#6B7280' }}>Kartu ini dipindai saat izin keluar, kunjungan wali, dan layanan Poskestren.</div>
      </div>
      <div style={{ flex: 1, minWidth: 280, background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 15, padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600, marginBottom: 12 }}>Hak akses akun santri</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
          <div>· Melihat pengumuman, jadwal pelajaran, dan jadwal diniyah.</div>
          <div>· Mengakses LMS: materi, tugas, dan nilai.</div>
          <div>· Mengajukan izin dan memantau status pengajuannya.</div>
          <div>· Melihat capaian hafalan, catatan kesehatan, dan poin ta&apos;zir.</div>
          <div>· Melihat riwayat pembayaran (tanpa hak konfirmasi pembayaran).</div>
          <div>· Tidak dapat mengubah nilai, presensi, maupun data induk.</div>
        </div>
      </div>
    </div>
  );
}
