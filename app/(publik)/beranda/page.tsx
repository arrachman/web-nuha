import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Landing publik — data ditarik dari basis data yang sama dengan dashboard
// internal (bukan angka contoh). Bagian yang di prototype berupa data
// fabrikasi tanpa padanan model (testimoni alumni, galeri, diagram animasi
// kompleks) sengaja disederhanakan atau dihilangkan.

const ALUR_PPDB = [
  {
    n: '1',
    t: 'Isi formulir online',
    d: 'Data diri, asal sekolah, pilihan unit, unggah berkas. 15 menit.',
    icon: 'M6 3h9l4 4v14H6zM9 12h7M9 16h5',
    ibg: '#DBEAFE',
    ifg: '#1D4ED8',
  },
  {
    n: '2',
    t: 'Verifikasi berkas',
    d: 'Panitia memeriksa dokumen dalam 2 hari kerja.',
    icon: 'M4 12.5l5.5 5.5L20 7',
    ibg: '#FFF3E2',
    ifg: '#B45309',
  },
  {
    n: '3',
    t: 'Seleksi',
    d: 'Tes baca Al-Qur\'an, tes dasar, wawancara wali.',
    icon: 'M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z',
    ibg: '#EDE9FE',
    ifg: '#6D28D9',
  },
  {
    n: '4',
    t: 'Daftar ulang',
    d: 'Pengumuman, pelunasan awal, penempatan kamar asrama.',
    icon: 'M4 21V10l8-6 8 6v11M9 21v-6h6v6',
    ibg: '#DCF0E3',
    ifg: '#0F6B3D',
  },
];

// Bento grid descriptor per unit — sesuai prototipe
// col/row menggunakan span CSS Grid; bg/border/warna dari prototipe.
function bentoDesc(u: { key: string; nama: string }) {
  const k = (u.key ?? 'Pondok') as keyof typeof base;
  const base = {
    Pondok: { col: 'span 2', row: 'span 2', pad: '30px', nsize: '44px', tsize: '22px', ibg: '#FFF3E2', ifg: '#B45309' },
    SMP:     { col: 'span 1', row: 'span 1', pad: '22px', nsize: '30px', tsize: '16px', ibg: '#DBEAFE', ifg: '#1D4ED8' },
    MA:      { col: 'span 1', row: 'span 1', pad: '22px', nsize: '30px', tsize: '16px', ibg: '#DCF0E3', ifg: '#0F6B3D' },
    Poskestren:{ col: 'span 2', row: 'span 1', pad: '24px', nsize: '32px', tsize: '17px', ibg: '#FEE2E2', ifg: '#B91C1C' },
  } as const;
  const b = base[k] ?? base.Pondok;
  const bg = k === 'Pondok' ? 'linear-gradient(150deg, #FFFFFF 0%, #F1F7F3 100%)'
           : k === 'Poskestren' ? 'linear-gradient(120deg, #FFFFFF 0%, #FFF7EE 100%)'
           : '#FFFFFF';
  const icon = k === 'Pondok' ? 'M4 21V10l8-6 8 6v11M9 21v-6h6v6'
             : k === 'SMP' ? 'M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z'
             : k === 'MA' ? 'M22 10L12 5 2 10l10 5zM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5'
             : 'M4 7h16v13H4zM9 4h6v3H9M12 11v5M9.5 13.5h5';
  return { ...b, bg, icon };
}

// Data diambil dari DB saat request; jangan diprerender waktu build.
export const dynamic = 'force-dynamic';

// Label jumlah per unit sesuai tampilan layar
const UNIT_LABEL: Record<string, string> = {
  Pondok: 'santri mukim',
  SMP: 'siswa',
  MA: 'siswa',
  Poskestren: 'bed rawat',
};

export default async function BerandaPage() {
  const [santriAktif, pegawaiAktif, unit, agenda, testimoni] = await Promise.all([
    prisma.santri.count({ where: { status: 'Aktif' } }),
    prisma.staff.count({ where: { status: { notIn: ['Nonaktif', 'Keluar', 'Pensiun'] } } }),
    prisma.unit.findMany({ where: { aktif: true }, orderBy: { id: 'asc' }, include: { _count: { select: { santri: true } } } }),
    prisma.agenda.findMany({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 5 }),
    prisma.testimoni.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const heroStats = [
    { v: (santriAktif + pegawaiAktif).toLocaleString('id-ID'), l: 'Siswa, santri & staf aktif' },
    { v: unit.length.toLocaleString('id-ID'), l: 'Unit terpadu' },
    { v: pegawaiAktif.toLocaleString('id-ID'), l: 'Ustadz, guru & staf' },
    { v: santriAktif.toLocaleString('id-ID'), l: 'Santri & siswa aktif' },
  ];

  return (
    <div>
      <section className="pub-hero">
        <div className="pub-hero-ray" />
        <div className="pub-hero-inner">
          <div>
            <div className="pub-badge">Pesantren Salafiyah Syafi&apos;iyah · Mergosono, Kota Malang</div>
            <h1 className="pub-h1">Mendidik generasi<br />berilmu, beradab,<br /><span>bermanfaat.</span></h1>
            <p className="pub-lead">
              Satu lembaga, empat unit terpadu: SMP Nurul Huda, Madrasah Aliyah, Pondok Pesantren, dan
              Poskestren. Satu identitas santri untuk semua layanan — akademik, kepesantrenan, kesehatan,
              dan keuangan.
            </p>
            <div className="pub-hero-actions">
              <a href="/ppdb" className="pub-btn-cta">Daftar PPDB 2026/2027</a>
              <Link href="/profil-pondok" className="pub-btn-outline">Profil Pesantren</Link>
            </div>
          </div>
          <div className="pub-hero-card">
            <Image src="/assets/hero-prestasi.webp" alt="Santri siswa-siswi SMP Nurul Huda peraih prestasi" width={520} height={218} className="pub-hero-img" />
            <div className="pub-hero-stat-title">Pesantren dalam angka</div>
            <div className="pub-stat-grid">
              {heroStats.map((s) => (
                <div key={s.l}>
                  <div className="pub-stat-v">{s.v}</div>
                  <div className="pub-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-section-head">
          <div>
            <div className="pub-eyebrow">Unit Naungan</div>
            <h2 className="pub-h2">Empat unit, satu sistem</h2>
          </div>
          <div className="pub-section-desc">Sebagian besar santri pondok juga siswa SMP/MA. Datanya satu, perannya banyak.</div>
        </div>
        <div className="pub-units-grid">
          {unit.map((u) => {
            const b = bentoDesc(u);
            const label = UNIT_LABEL[u.key ?? ''] ?? 'santri terdaftar';
            return (
              <div key={u.id} className="pub-unit-card" style={{ background: b.bg, gridColumn: b.col, gridRow: b.row, padding: b.pad }}>
                <div className="pub-unit-icon" style={{ background: b.ibg }}>
                  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke={b.ifg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: `<path d="${b.icon}"/>` }} />
                </div>
                <div className="pub-unit-nama" style={{ fontSize: b.tsize }}>{u.nama}</div>
                <div className="pub-unit-desc">{u.deskripsi ?? ''}</div>
                <div className="pub-unit-count" style={{ fontSize: b.nsize }}>
                  <b>{u._count.santri.toLocaleString('id-ID')}</b>
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pub-satu-identitas">
          <div className="pub-diagram">
            {/* Animated SVG: dashed beams from unit nodes → DATA INDUK center,
                orbital rings with counter-rotating node badges, and a pulse ring. */}
            <svg viewBox="0 0 300 190" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
              {/* Connecting beams */}
              <g>
                <path d="M92 26 C168 26, 168 96, 236 96" fill="none" stroke="#E4EFE7" strokeWidth="2" />
                <path d="M92 26 C168 26, 168 96, 236 96" fill="none" stroke="#E8973A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="26 300" style={{ animation: 'dash 3.4s linear infinite' }} />
              </g>
              <g>
                <path d="M92 72 C168 72, 178 92, 236 96" fill="none" stroke="#E4EFE7" strokeWidth="2" />
                <path d="M92 72 C168 72, 178 92, 236 96" fill="none" stroke="#E8973A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="26 300" style={{ animation: 'dash 3.4s linear infinite .85s' }} />
              </g>
              <g>
                <path d="M92 118 C168 118, 178 100, 236 96" fill="none" stroke="#E4EFE7" strokeWidth="2" />
                <path d="M92 118 C168 118, 178 100, 236 96" fill="none" stroke="#E8973A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="26 300" style={{ animation: 'dash 3.4s linear infinite 1.7s' }} />
              </g>
              <g>
                <path d="M92 164 C168 164, 168 96, 236 96" fill="none" stroke="#E4EFE7" strokeWidth="2" />
                <path d="M92 164 C168 164, 168 96, 236 96" fill="none" stroke="#E8973A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="26 300" style={{ animation: 'dash 3.4s linear infinite 2.55s' }} />
              </g>
              {/* Pulse ring around DATA INDUK */}
              <circle cx="252" cy="96" r="36" fill="none" stroke="#E8973A" strokeWidth="2" opacity=".5" style={{ animation: 'pulsering 2.6s ease-out infinite', transformOrigin: '252px 96px' }} />
            </svg>
            {/* Unit label badges (left side) */}
            {([
              { lbl: 'SMP', top: '12px' },
              { lbl: 'MA', top: '58px' },
              { lbl: 'Pondok', top: '104px' },
              { lbl: 'Poskestren', top: '150px' },
            ] as const).map((b) => (
              <div key={b.lbl} className="pub-diagram-label" style={{ top: b.top }}>{b.lbl}</div>
            ))}
            {/* Orbital rings + counter-rotating node badges */}
            <div className="pub-orbit-ring" style={{ left: '190px', top: '34px', width: '124px', height: '124px' }}>
              <div className="pub-orbit-node" style={{ background: '#FFF3E2', border: '1px solid #E8973A', color: '#9A3412' }}><span style={{ fontSize: 8 }}>SMP</span></div>
              <div className="pub-orbit-node" style={{ background: '#EAF3ED', border: '1px solid #0F6B3D', color: '#0F6B3D' }}><span style={{ fontSize: 8 }}>MA</span></div>
            </div>
                        <div className="pub-orbit-ring pub-orbit-ring-outer" style={{ left: '172px', top: '16px', width: '160px', height: '160px', animationDirection: 'reverse', animationDuration: '34s' }}>
              <div className="pub-orbit-node" style={{ background: '#0F6B3D', color: '#FBE3C4', animationDirection: 'reverse', animationDuration: '34s' }}><span style={{ fontSize: 8 }}>PON</span></div>
              <div className="pub-orbit-node" style={{ background: '#B91C1C', color: '#fff', animationDirection: 'reverse', animationDuration: '34s' }}><span style={{ fontSize: 8 }}>POS</span></div>
            </div>
            <div className="pub-diagram-badge"><span>DATA</span><span>INDUK</span></div>
          </div>
          <div>
            <div className="pub-eyebrow">Satu Identitas</div>
            <h3 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: '#0a4a2b', margin: '8px 0 12px', textWrap: 'pretty' }}>
              Empat unit menulis ke satu data induk
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: '#4b5563', margin: 0, textWrap: 'pretty' }}>
              Seorang anak bisa sekaligus siswa SMP, santri mukim, dan pasien Poskestren. Catatan sakit dari
              Poskestren otomatis mengisi presensi kelas dan absensi jamaah; tagihan SPP, syahriyah, dan uang
              makan terbit sebagai satu invoice untuk wali.
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', borderTop: '1px solid #e8e3d9', borderBottom: '1px solid #e8e3d9' }}>
        <div className="pub-section">
          <div className="pub-eyebrow">Alur Pendaftaran</div>
          <h2 className="pub-h2" style={{ marginBottom: 32 }}>Empat langkah menjadi santri</h2>
          <div className="pub-alur-grid">
            {ALUR_PPDB.map((a) => (
              <div key={a.n} className="pub-alur-card">
                <div className="pub-alur-line" />
                <div className="pub-alur-head">
                  <div className="pub-alur-no">{a.n}<span className="pub-alur-ring" /></div>
                  <div className="pub-alur-ico" style={{ background: a.ibg }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={a.ifg} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: `<path d="${a.icon}"/>` }} />
                  </div>
                </div>
                <div className="pub-alur-t">{a.t}</div>
                <div className="pub-alur-d">{a.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Kata Alumni */}
          <div>
            <div className="pub-eyebrow">Kata Alumni</div>
            <h2 className="pub-h2" style={{ marginBottom: 24 }}>Jejak yang mereka bawa</h2>
            <div className="mq" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)' }}>
              <div className="mqtrack" style={{ width: 'max-content', gap: 14, animation: 'mq 34s linear infinite' }}>
                {testimoni.map((t) => (
                  <div key={t.id} style={{ width: 330, flex: '0 0 auto', background: '#fff', border: '1px solid #e8e3d9', borderRadius: 16, padding: 20, display: 'flex', gap: 14 }}>
                    <div style={{ width: 44, height: 44, flex: '0 0 44px', borderRadius: '50%', background: '#f1f5f1', color: '#0f6b3d', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{t.inisial}</div>
                    <div>
                      <div style={{ fontSize: 14, lineHeight: 1.65, color: '#2f3437', fontStyle: 'italic', textWrap: 'pretty' }}>"{t.kata}"</div>
                      <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8 }}><strong style={{ color: '#0a4a2b' }}>{t.nama}</strong> · {t.ket}</div>
                    </div>
                  </div>
                ))}
                {/* Duplikat untuk looping infinite */}
                {testimoni.map((t) => (
                  <div key={`dup-${t.id}`} style={{ width: 330, flex: '0 0 auto', background: '#fff', border: '1px solid #e8e3d9', borderRadius: 16, padding: 20, display: 'flex', gap: 14 }}>
                    <div style={{ width: 44, height: 44, flex: '0 0 44px', borderRadius: '50%', background: '#f1f5f1', color: '#0f6b3d', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 }}>{t.inisial}</div>
                    <div>
                      <div style={{ fontSize: 14, lineHeight: 1.65, color: '#2f3437', fontStyle: 'italic', textWrap: 'pretty' }}>"{t.kata}"</div>
                      <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8 }}><strong style={{ color: '#0a4a2b' }}>{t.nama}</strong> · {t.ket}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Agenda */}
          <div>
            <div className="pub-eyebrow">Agenda</div>
            <h2 className="pub-h2" style={{ marginBottom: 24 }}>Kegiatan terdekat</h2>
            <div className="pub-agenda-card">
              {agenda.length === 0 ? (
                <div className="pub-agenda-row"><span className="muted">Belum ada agenda terjadwal.</span></div>
              ) : agenda.map((g) => (
                <div key={String(g.id)} className="pub-agenda-row">
                  <div className="pub-agenda-tgl">
                    <b>{g.date.toLocaleDateString('id-ID', { day: '2-digit' })}</b>
                    <span>{g.date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className="pub-agenda-judul">{g.title}</div>
                    <div className="pub-agenda-unit">{g.unit ?? 'Yayasan'}{g.time ? ` · ${g.time}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
