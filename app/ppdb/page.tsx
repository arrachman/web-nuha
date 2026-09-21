import Link from 'next/link';
import { Wizard } from './Wizard';

/**
 * Halaman publik — wajib bisa diakses tanpa cookie sesi, jadi TIDAK memakai
 * requirePage/Shell. Chrome-nya sederhana dan berdiri sendiri; orchestrator
 * yang akan menyatukannya dengan layout publik bersama nanti.
 */
export default function PpdbPage() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '46px 24px 80px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke beranda</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>PPDB 2026/2027</div>
      <h1 style={{ margin: '8px 0 14px' }}>Formulir Pendaftaran Online</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Sudah mendaftar? <Link href="/cek-status">Cek status pendaftaran</Link> di sini.
      </p>
      <Wizard />
    </div>
  );
}
