import { daftarPerangkat, ambilQr, type Perangkat } from '@/lib/wa-gateway';
import { tambahPerangkatWa, hapusPerangkatWa, putuskanPerangkatWa } from './actions';

/**
 * Manajemen perangkat pengirim. Nomor didaftarkan lebih dulu, lalu QR-nya
 * dipindai dari WhatsApp di ponsel yang bersangkutan (Perangkat Tertaut →
 * Tautkan perangkat). Setelah tertaut, gateway menyimpan kredensialnya sendiri
 * sehingga sesi bertahan lintas restart.
 */
export async function TabPerangkat({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const pilih = typeof searchParams.device === 'string' ? searchParams.device : undefined;

  let perangkat: Perangkat[] = [];
  let galat: string | null = null;
  try {
    perangkat = await daftarPerangkat();
  } catch (error) {
    galat = error instanceof Error ? error.message : String(error);
  }

  const target = perangkat.find((item) => item.token === pilih);
  const qr = target && !target.terhubung ? await ambilQr(target.token) : null;

  return (
    <section className="grid" style={{ gap: 16 }}>
      {galat && (
        <div className="alert alert-kritis">
          <span>
            <b>Gateway WhatsApp tidak dapat dihubungi</b>
            {galat} — periksa layanan <code>wa-gateway</code> serta variabel <code>WA_GATEWAY_URL</code> dan{' '}
            <code>WA_GATEWAY_ACCOUNT_TOKEN</code>.
          </span>
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Daftarkan nomor</h3>
        <p className="card-sub" style={{ marginTop: -8, marginBottom: 14 }}>
          Nomor didaftarkan dulu, lalu tekan <b>Tampilkan QR</b> dan pindai dari WhatsApp di ponsel itu.
        </p>
        <form action={tambahPerangkatWa} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <span className="field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label htmlFor="wa-nama">Nama perangkat</label>
            <input id="wa-nama" name="nama" required placeholder="Admin Pondok" />
          </span>
          <span className="field" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label htmlFor="wa-nomor">Nomor WhatsApp</label>
            <input id="wa-nomor" name="nomor" required placeholder="08123456789" inputMode="numeric" />
          </span>
          <button type="submit" className="btn">Daftarkan</button>
        </form>
      </div>

      <div className="card">
        <h3 className="card-judul">Perangkat terdaftar</h3>
        {perangkat.length === 0 ? (
          <p className="empty">Belum ada perangkat. Daftarkan nomor di atas untuk mulai mengirim pesan sungguhan.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr><th>Nama</th><th>Nomor</th><th>Status</th><th>Tindakan</th></tr>
              </thead>
              <tbody>
                {perangkat.map((item) => (
                  <tr key={item.token}>
                    <td>{item.nama}</td>
                    <td>{item.nomor}</td>
                    <td>
                      <span className={`badge ${item.terhubung ? 'badge-hijau' : 'badge-netral'}`}>
                        {item.terhubung ? 'Terhubung' : 'Belum tertaut'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {item.terhubung ? (
                        <form action={putuskanPerangkatWa}>
                          <input type="hidden" name="token" value={item.token} />
                          <button type="submit" className="btn-sekunder btn">Putuskan</button>
                        </form>
                      ) : (
                        <a className="btn-sekunder btn" href={`/notifikasi?tab=perangkat&device=${item.token}`}>
                          Tampilkan QR
                        </a>
                      )}
                      <form action={hapusPerangkatWa}>
                        <input type="hidden" name="nomor" value={item.nomor} />
                        <button type="submit" className="btn-sekunder btn">Hapus</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {target && (
        <div className="card">
          <h3 className="card-judul">Pindai QR — {target.nama}</h3>
          {qr?.url ? (
            <>
              {/* Data URL dari gateway; `next/image` tidak dipakai agar tidak melewati optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.url} alt={`Kode QR untuk menautkan ${target.nomor}`} width={264} height={264} />
              <p className="muted" style={{ marginTop: 10 }}>
                WhatsApp → Perangkat Tertaut → Tautkan perangkat. QR hanya berlaku beberapa detik; muat ulang
                halaman ini bila kedaluwarsa.
              </p>
            </>
          ) : (
            <div className="alert alert-peringatan">
              <span>{qr?.alasan ?? 'QR belum siap, muat ulang halaman sebentar lagi.'}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
