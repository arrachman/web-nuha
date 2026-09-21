import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Profil unit Pondok Pesantren. Data jumlah santri/asrama/ustadz ditarik
// dari basis data. Konten naratif (sejarah, program, jadwal, fasilitas)
// tidak punya model di skema (bukan angka operasional), jadi bagian itu
// dihilangkan dari prototype — lihat catatan di ringkasan tugas.


// Data diambil dari DB saat request; jangan diprerender waktu build.
export const dynamic = 'force-dynamic';

export default async function ProfilPondokPage() {
  const unitPondok = await prisma.unit.findUnique({
    where: { key: 'Pondok' },
    include: { _count: { select: { santri: true, staff: true } } },
  });

  const [asrama, mukim] = await Promise.all([
    prisma.dormitory.count(),
    prisma.santri.count({ where: { unitId: unitPondok?.id, status: 'Aktif' } }),
  ]);

  return (
    <div>
      <section className="pub-profil-hero">
        <div className="pub-profil-hero-inner">
          <div className="pub-eyebrow" style={{ color: '#f2b770' }}>Profil Unit</div>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: 42, fontWeight: 600, margin: '10px 0 12px' }}>
            Pondok Pesantren Nurul Huda Mergosono
          </h1>
          <p style={{ maxWidth: 640, fontSize: 16, lineHeight: 1.7, color: 'rgba(243,241,233,.82)', margin: 0 }}>
            {unitPondok?.deskripsi ?? 'Program Tahfidz dan Kitab Kuning, diasuh langsung oleh ustadz dan ustadzah pondok.'}
          </p>
        </div>
      </section>

      <section className="pub-profil-body">
        <div>
          <div className="pub-pengasuh">
            <div className="pub-pengasuh-foto">
              <Image src="/assets/kiai-pengasuh.webp" alt="Foto pengasuh PPSS Nurul Huda Mergosono" width={148} height={186} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 210 }}>
              <div className="pub-eyebrow">Muassis &amp; Pengasuh</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: 22, color: '#0a4a2b', fontWeight: 600, margin: '6px 0 8px' }}>
                KH. Masduqi Machfudz
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#4b5563', margin: 0 }}>
                Pengasuh yang meletakkan dasar pendidikan salaf Nurul Huda Mergosono: kuat pada sanad kitab
                dan Al-Qur&apos;an, terbuka pada ilmu dan tata kelola modern.
              </p>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Lora', serif", fontSize: 26, color: '#0a4a2b', fontWeight: 600, margin: '0 0 14px' }}>Sejarah</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#4b5563', margin: '0 0 14px' }}>
            Pondok Pesantren Salafiyah Syafi&apos;iyah Nurul Huda tumbuh di kampung Mergosono, Kedungkandang,
            Kota Malang, sebagai pesantren salaf yang menekankan pengajian kitab dan Al-Qur&apos;an.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: '#4b5563', margin: '0 0 32px' }}>
            Poskestren dibuka pada 2016 bersama Puskesmas Kedungkandang, melengkapi layanan akademik dan
            kepesantrenan dengan layanan kesehatan santri yang tersistem.
          </p>

          <div className="pub-stat-mini-grid">
            <div className="pub-stat-mini">
              <b>{mukim.toLocaleString('id-ID')}</b>
              <span>Santri aktif</span>
            </div>
            <div className="pub-stat-mini">
              <b>{asrama.toLocaleString('id-ID')}</b>
              <span>Asrama</span>
            </div>
            <div className="pub-stat-mini">
              <b>{(unitPondok?._count.staff ?? 0).toLocaleString('id-ID')}</b>
              <span>Ustadz &amp; ustadzah</span>
            </div>
          </div>

          <div className="pub-highlight">
            <div className="pub-highlight-img-wrap">
              <Image src="/assets/keg-haflah.webp" alt="Dokumentasi Haflah Akhirissanah Nurul Huda Mergosono" width={640} height={360} style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ padding: '12px 6px 4px' }}>
              <div className="pub-eyebrow">Sorotan Kegiatan</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: 16.5, color: '#0a4a2b', fontWeight: 600, marginTop: 4 }}>
                Haflah Akhirissanah
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4, lineHeight: 1.6 }}>
                Wisuda tahfidz, imtihan kitab, dan pelepasan santri purna belajar.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="pub-side-card">
            <div className="pub-highlight-img-wrap">
              <Image src="/assets/keg-radio-live.webp" alt="Siaran ngaji online Nurul Huda Mergosono" width={480} height={280} style={{ width: '100%', display: 'block' }} />
              <span className="pub-live-badge">LIVE</span>
            </div>
            <div style={{ padding: '12px 6px 4px' }}>
              <div className="pub-eyebrow">Ngaji Online</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: 16.5, color: '#0a4a2b', fontWeight: 600, marginTop: 4 }}>
                Siaran langsung pengajian rutin
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 4, lineHeight: 1.6 }}>
                Disiarkan tiap ba&apos;da Maghrib di kanal YouTube &amp; Instagram @nuhamergosono.
              </div>
            </div>
          </div>
          <a href="/ppdb" className="pub-btn-solid pub-btn" style={{ width: '100%', textAlign: 'center', padding: 14, marginTop: 4 }}>
            Daftar jadi santri
          </a>
          <p style={{ marginTop: 14, fontSize: 12.5, color: '#6b7280' }}>
            Ingin melihat unit lain? Lihat ringkasan seluruh unit di <Link href="/beranda" style={{ color: '#0f6b3d' }}>halaman beranda</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
