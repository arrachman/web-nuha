import { Card } from '@/components';

const JAM_BERKUNJUNG = [
  { hari: 'Ahad (kunjungan umum)', jam: '09.00 – 15.00' },
  { hari: 'Jumat (setelah Jumatan)', jam: '13.00 – 15.00' },
  { hari: 'Hari kerja (urusan administrasi)', jam: '08.00 – 14.00' },
  { hari: 'Kunjungan santri sakit', jam: 'Setiap hari, izin Poskestren' },
];

const KETENTUAN = [
  'Wali wajib mendaftar minimal H-1 dan membawa kartu wali santri.',
  'Kunjungan dilakukan di aula tamu; tidak memasuki area asrama.',
  'Barang titipan dicatat petugas; makanan basah tidak diperbolehkan.',
  'Alat elektronik (HP, tablet) tidak boleh diserahkan langsung ke santri.',
  'Maksimal 3 orang pengunjung per santri, durasi 90 menit.',
  'Kunjungan di luar jadwal memerlukan persetujuan pengasuh.',
];

/** Aturan kunjungan — konten kebijakan tetap, bukan data transaksional. */
export function TabAturan() {
  return (
    <section className="grid g2">
      <Card judul="Jam berkunjung">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          {JAM_BERKUNJUNG.map((j) => (
            <div key={j.hari} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingBottom: 9, borderBottom: '1px solid var(--krem-3)' }}>
              <span>{j.hari}</span><strong>{j.jam}</strong>
            </div>
          ))}
        </div>
      </Card>
      <Card judul="Ketentuan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, lineHeight: 1.6 }}>
          {KETENTUAN.map((k, i) => <div key={k}>{i + 1}. {k}</div>)}
        </div>
      </Card>
    </section>
  );
}
