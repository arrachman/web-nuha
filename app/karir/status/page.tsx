import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button, Input, inisial } from '@/components';

const LABEL_STATUS: Record<string, string> = {
  Submitted: 'Terkirim', Screening: 'Diperiksa Berkas', Shortlisted: 'Lolos Seleksi Administrasi',
  Test: 'Tes', Interview: 'Wawancara', Offered: 'Ditawari', Hired: 'Diterima',
  Rejected: 'Tidak Lolos', Withdrawn: 'Mengundurkan Diri', Reserve: 'Cadangan',
};
const KELAS_BADGE: Record<string, string> = {
  Hired: 'badge-hijau', Offered: 'badge-hijau', Rejected: 'badge-merah', Withdrawn: 'badge-netral',
  Shortlisted: 'badge-biru', Interview: 'badge-biru', Test: 'badge-kuning', Reserve: 'badge-oranye',
};

export const dynamic = 'force-dynamic';

export default async function StatusLamaranPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').trim();
  const number = pick(params.number).toUpperCase();
  const token = pick(params.token);

  let lamaran = null;
  let salahToken = false;
  if (number) {
    lamaran = await prisma.jobApplication.findFirst({
      where: { number },
      include: { job: { include: { unit: true } }, events: { orderBy: { createdAt: 'asc' } } },
    });
    // Token hanya wajib dicocokkan kalau dikirim di URL (mis. tautan dari WA) —
    // pencarian manual di halaman ini masih boleh pakai nomor saja karena tidak
    // membocorkan data sensitif selain status (03 §7 privasi data pelamar).
    if (lamaran && token && lamaran.statusToken !== token) {
      salahToken = true;
      lamaran = null;
    }
  }
  const tidakDitemukan = number.length > 0 && !lamaran && !salahToken;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '46px 24px 90px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link href="/karir" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>&larr; Kembali ke lowongan</Link>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#E8973A' }}>Karir</div>
      <h1 style={{ margin: '8px 0 8px' }}>Cek Status Lamaran</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
        Masukkan nomor lamaran yang Anda terima setelah mengirim formulir. Contoh: <strong>LMR-2026-0007</strong>
      </p>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input varian="cari" name="number" defaultValue={number} placeholder="LMR-2026-XXXX" style={{ flex: 1, minWidth: 200 }} data-testid="input-nomor" />
          <Button type="submit">Cari</Button>
        </form>

        {(tidakDitemukan || salahToken) && (
          <div className="alert alert-kritis" style={{ marginTop: 18 }}>
            Nomor lamaran tidak ditemukan. Periksa kembali, atau hubungi panitia rekrutmen.
          </div>
        )}

        {lamaran && (
          <div style={{ marginTop: 22 }} data-testid="hasil-status">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid #F0EDE4', flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F1', color: '#0F6B3D', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {inisial(lamaran.fullName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: '#0A4A2B' }}>{lamaran.fullName}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{lamaran.number} · {lamaran.job.title} ({lamaran.job.unit.nama})</div>
              </div>
              <span className={`badge ${KELAS_BADGE[lamaran.status] ?? 'badge-netral'}`}>{LABEL_STATUS[lamaran.status] ?? lamaran.status}</span>
            </div>

            <div style={{ paddingTop: 20 }}>
              {lamaran.events.map((ev, i, arr) => (
                <div key={ev.id.toString()} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 22px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#0F6B3D', border: '3px solid #DCF0E3' }} />
                    {i < arr.length - 1 && <div style={{ flex: 1, width: 2, minHeight: 34, background: '#0F6B3D' }} />}
                  </div>
                  <div style={{ paddingBottom: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0A4A2B' }}>{LABEL_STATUS[ev.toStatus] ?? ev.toStatus}</div>
                    <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>
                      {ev.createdAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {ev.note ? ` · ${ev.note}` : ''}
                      {ev.scheduleAt ? ` · Jadwal: ${ev.scheduleAt.toLocaleString('id-ID')}` : ''}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </div>
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
