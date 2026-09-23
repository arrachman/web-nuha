import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './publik.css';

// Halaman publik (landing, profil pondok, dst) — tanpa sesi login,
// header & footer sama untuk semua halaman di grup route ini.


export default function PublikLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="pub-header">
        <div className="pub-header-bar">
          <Link href="/beranda" className="pub-brand">
            <Image src="/assets/logo-nuha.webp" alt="Logo Nurul Huda Mergosono" width={46} height={46} style={{ objectFit: 'contain' }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span className="pub-brand-nama">Nurul Huda Mergosono</span>
              <span className="pub-brand-arab">مَعْهَدُ نُوْرُ الْهُدَى</span>
            </span>
          </Link>
          <nav className="pub-nav">
            <Link href="/beranda">Beranda</Link>
            <Link href="/profil-pondok">Pondok Pesantren</Link>
            <a href="/cek-status">Cek Status PPDB</a>
          <a href="/karir">Karir</a>
            <a href="/karir">Karir</a>
          </nav>
          <div className="pub-cta">
            <Link href="/login" className="pub-btn">Masuk</Link>
            <a href="/ppdb" className="pub-btn pub-btn-solid">Daftar PPDB</a>
          </div>
        </div>
        <div className="pub-mobnav">
          <Link href="/beranda">Beranda</Link>
          <Link href="/profil-pondok">Pondok Pesantren</Link>
          <a href="/cek-status">Cek Status PPDB</a>
        </div>
      </header>

      {children}

      <footer className="pub-footer">
        <div className="pub-footer-grid">
          <div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 19, color: '#faf8f3', fontWeight: 600 }}>PPSS Nurul Huda Mergosono</div>
            <div style={{ fontFamily: "'Amiri', serif", fontSize: 15, color: '#e8973a', margin: '6px 0 14px' }}>مَعْهَدُ نُوْرُ الْهُدَى</div>
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              Jl. Kol. Sugiono 3B No.103, Mergosono,<br />Kedungkandang, Kota Malang, Jawa Timur<br />smpnuhamergosono@gmail.com
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <a href="https://www.instagram.com/nuhamergosono/" target="_blank" rel="noopener" title="Instagram @nuhamergosono" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: 'radial-gradient(circle at 28% 105%, #FDDC5C 0%, #F77737 32%, #E1306C 58%, #833AB4 88%)', textDecoration: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.2" cy="6.8" r="1.1" fill="#FFFFFF" stroke="none"></circle></svg>
              </a>
              <a href="https://x.com/nuhamergosono" target="_blank" rel="noopener" title="X @nuhamergosono" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: '#000000', border: '1px solid rgba(243,241,233,.28)', textDecoration: 'none' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M17.7 3h3.2l-7 8 8.2 10h-6.4l-5-6.1L4.9 21H1.7l7.5-8.6L1.3 3h6.6l4.5 5.6zm-1.1 16h1.8L7.5 4.8H5.6z"></path></svg>
              </a>
              <a href="https://open.spotify.com/search/nuhamergosono" target="_blank" rel="noopener" title="Spotify @nuhamergosono" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: '#1DB954', textDecoration: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#191414" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="9.2" fill="#191414" stroke="none"></circle><path d="M7.4 9.6c3-.8 6.1-.5 8.6 1M8 12.6c2.4-.6 4.9-.4 7 .9M8.6 15.4c1.9-.5 3.8-.3 5.5.7" stroke="#1DB954"></path></svg>
              </a>
              <a href="https://www.facebook.com/nuhamergosono" target="_blank" rel="noopener" title="Facebook @nuhamergosono" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: '#1877F2', textDecoration: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.7v8z"></path></svg>
              </a>
              <a href="https://www.youtube.com/@nuhamergosono" target="_blank" rel="noopener" title="YouTube @nuhamergosono" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 10, background: '#FF0000', textDecoration: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M22 12s0-3.1-.4-4.6a2.4 2.4 0 00-1.7-1.7C18.4 5.3 12 5.3 12 5.3s-6.4 0-7.9.4a2.4 2.4 0 00-1.7 1.7C2 8.9 2 12 2 12s0 3.1.4 4.6c.2.9.9 1.5 1.7 1.7 1.5.4 7.9.4 7.9.4s6.4 0 7.9-.4a2.4 2.4 0 001.7-1.7c.4-1.5.4-4.6.4-4.6zM10 15.1V8.9l5.2 3.1z"></path></svg>
              </a>
            </div>
            <a href="https://linktr.ee/nuhamergosono" target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, color: '#e8973a', textDecoration: 'none', borderBottom: '1px solid rgba(232,151,58,.5)' }}>
              linktr.ee/nuhamergosono
            </a>
          </div>
          <div>
            <h4>Unit</h4>
            <div className="pub-footer-col">
              <span>SMP Nurul Huda Mergosono</span>
              <span>MA Nurul Huda Mergosono</span>
              <span>Pondok Pesantren</span>
              <span>Poskestren</span>
            </div>
          </div>
          <div>
            <h4>Layanan</h4>
            <div className="pub-footer-col">
              <a href="/ppdb">PPDB Online</a>
              <a href="/cek-status">Cek Status Pendaftaran</a>
              <a href="/karir">Lowongan Kerja (Karir)</a>
              <a href="/karir/status">Cek Status Lamaran</a>
              <Link href="/login" style={{ color: 'rgba(243,241,233,.78)', textDecoration: 'none' }}>Portal Wali Santri</Link>
              <Link href="/login" style={{ color: 'rgba(243,241,233,.78)', textDecoration: 'none' }}>SIMTERPADU Staf</Link>
              <a href="https://drive.google.com/drive/folders/18MM-nIa6tlQvsxcJ85kZUmvnvm59n-z4" target="_blank" rel="noopener">Brosur PPSS &amp; SMP</a>
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSew-f7-9lj4Qq42MXwsC5WtNIQeKcMioOP-kH-KXIhhYlrZhQ/viewform" target="_blank" rel="noopener">Formulir Santri Baru</a>
            </div>
          </div>
          <div>
            <h4>Kanal Santri</h4>
            <div className="pub-footer-col">
              <a href="https://www.instagram.com/quotesnuha/" target="_blank" rel="noopener">@quotesnuha</a>
              <a href="https://www.instagram.com/elquds_nuha/" target="_blank" rel="noopener">@elquds_nuha</a>
              <a href="https://www.instagram.com/nun_media/" target="_blank" rel="noopener">@nun_media — literasi santri</a>
              <a href="https://www.instagram.com/nuhamerch/" target="_blank" rel="noopener">@nuhamerch — merchandise</a>
            </div>
          </div>
        </div>
        <div className="pub-footer-bottom">
          <span>© 2026 PPSS Nurul Huda Mergosono</span>
          <span style={{ color: '#E8973A' }}>Prototype SIMTERPADU · Data contoh</span>
        </div>
      </footer>
    </div>
  );
}
