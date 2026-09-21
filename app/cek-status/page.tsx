import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { inisial } from '@/components';

type Tahap = { judul: string; ket: string; status: 'selesai' | 'gagal' | 'menunggu' };

const LABEL_STATUS: Record<string, string> = {
  New: 'Baru', Verification: 'Verifikasi', Selection: 'Seleksi',
  Passed: 'Lulus', Failed: 'Tidak Lulus', Reenrollment: 'Daftar Ulang',
};

const KELAS_BADGE: Record<string, string> = {
  Passed: 'badge-hijau', Reenrollment: 'badge-hijau', Failed: 'badge-merah', Selection: 'badge-biru',
};

/** Empat tahap tetap, persis prototype — tahap terakhir bercabang Lulus/Tidak Lulus. */
function timelineUntuk(status: string, registeredAt: Date): Tahap[] {
  const urutan = ['New', 'Verification', 'Selection', 'Passed'];
  const gagal = status === 'Failed';
  const idx = gagal || status === 'Reenrollment' ? 3 : urutan.indexOf(status);
  const tgl = registeredAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const langkah = [
    { judul: 'Formulir diterima', ket: `${tgl} · berkas masuk sistem` },
    { judul: 'Verifikasi berkas', ket: 'Panitia memeriksa kelengkapan dokumen' },
    { judul: 'Seleksi & wawancara', ket: 'Tes baca Al-Qur\'an, wawancara wali' },
    { judul: gagal ? 'Belum diterima' : 'Pengumuman kelulusan', ket: gagal ? 'Silakan mendaftar gelombang berikutnya' : 'Daftar ulang sesuai jadwal panitia' },
  ];

  return langkah.map((l, i) => ({
    ...l,
    status: gagal && i === 3 ? 'gagal' : i <= idx ? 'selesai' : 'menunggu',
  }));
}

// Data diambil dari DB saat request; jangan diprerender waktu build.
export const dynamic = 'force-dynamic';

export default async function CekStatusPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const qRaw = params.noReg;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw ?? '').trim();

  const pendaftar = q ? await prisma.applicant.findFirst({ where: { registrationNumber: q.toUpperCase() } }) : null;
  const tidakDitemukan = q.length > 0 && !pendaftar;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '46px 24px 90px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke beranda</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>PPDB 2026/2027</div>
      <h1 style={{ margin: '8px 0 8px' }}>Cek Status Pendaftaran</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Masukkan nomor pendaftaran yang Anda terima setelah mengirim formulir. Contoh: <strong>PPDB-2026-0007</strong>
      </p>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input name="noReg" defaultValue={q} placeholder="PPDB-2026-XXXX" style={{ flex: 1, minWidth: 200 }} />
          <button type="submit" className="btn">Cari</button>
        </form>

        {tidakDitemukan && (
          <div className="alert alert-kritis" style={{ marginTop: 18 }}>
            Nomor pendaftaran tidak ditemukan. Periksa kembali, atau hubungi panitia di (0331) 487-2290.
          </div>
        )}

        {pendaftar && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid #F0EDE4', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F1', color: '#0F6B3D', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {inisial(pendaftar.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0A4A2B' }}>{pendaftar.fullName}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{pendaftar.registrationNumber} · {pendaftar.choice} · asal {pendaftar.previousSchool ?? '—'}</div>
              </div>
              <span className={`badge ${KELAS_BADGE[pendaftar.status] ?? 'badge-kuning'}`}>{LABEL_STATUS[pendaftar.status] ?? pendaftar.status}</span>
            </div>

            <div style={{ paddingTop: 20 }}>
              {timelineUntuk(pendaftar.status, pendaftar.registeredAt).map((t, i, arr) => (
                <div key={t.judul} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 22px' }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: t.status === 'gagal' ? '#B91C1C' : t.status === 'selesai' ? '#0F6B3D' : '#FFFFFF',
                      border: `3px solid ${t.status === 'gagal' ? '#FEE2E2' : t.status === 'selesai' ? '#DCF0E3' : '#E8E3D9'}`,
                    }} />
                    {i < arr.length - 1 && (
                      <div style={{ flex: 1, width: 2, minHeight: 34, background: t.status === 'selesai' ? '#0F6B3D' : '#E8E3D9' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.status === 'gagal' ? '#B91C1C' : t.status === 'selesai' ? '#0A4A2B' : '#9CA3AF' }}>{t.judul}</div>
                    <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{t.ket}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
