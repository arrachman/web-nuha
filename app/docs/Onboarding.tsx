import { ALUR_INTI, GLOSARIUM, PETA_MODUL, TEKNOLOGI, TENTANG } from './onboarding';

/**
 * Bagian onboarding /docs — server component, murni presentasi dari data
 * onboarding.ts. Dipecah jadi beberapa <section> agar tiap topik punya anchor
 * sendiri di sidebar.
 */
export function Onboarding() {
  return (
    <>
      <section id="tentang" className="card">
        <h2 className="card-judul" style={{ fontSize: 20 }}>Proyek ini untuk apa</h2>
        <p style={{ color: 'var(--teks-2)', fontSize: 14 }}>{TENTANG.ringkas}</p>
        <div className="tabel-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Unit yang dilayani</th><th>Cakupan</th></tr></thead>
            <tbody>
              {TENTANG.unit.map((u) => (
                <tr key={u.nama}>
                  <td><b>{u.nama}</b></td>
                  <td className="muted" style={{ fontSize: 13 }}>{u.peran}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          <span>
            <b>Prinsip satu identitas</b>
            {TENTANG.identitas}
          </span>
        </div>
      </section>

      <section id="peta-modul" className="card">
        <h2 className="card-judul" style={{ fontSize: 20 }}>Peta modul</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Seluruh menu aplikasi, dikelompokkan menurut urusannya. Menu yang tampil untuk tiap akun
          diatur lewat peran (lihat tabel akun di bawah).
        </p>
        {PETA_MODUL.map((kel) => (
          <div key={kel.kelompok} style={{ marginBottom: 14 }}>
            <p className="label" style={{ marginBottom: 6 }}>{kel.kelompok}</p>
            <div className="tabel-wrap">
              <table>
                <tbody>
                  {kel.modul.map((m) => (
                    <tr key={m.menu + m.path}>
                      <td style={{ whiteSpace: 'nowrap' }}><b>{m.menu}</b></td>
                      <td style={{ whiteSpace: 'nowrap' }}><code>{m.path}</code></td>
                      <td className="muted" style={{ fontSize: 13 }}>{m.untuk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section id="alur-inti" className="card">
        <h2 className="card-judul" style={{ fontSize: 20 }}>Alur data inti</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Lima alur yang menjelaskan bagaimana modul-modul di atas saling menyambung.
        </p>
        <dl className="docs-daftar">
          {ALUR_INTI.map((a) => (
            <div key={a.judul}>
              <dt>{a.judul}</dt>
              <dd>{a.alur}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="teknologi" className="card">
        <h2 className="card-judul" style={{ fontSize: 20 }}>Cara sistem dibangun</h2>
        <dl className="docs-daftar">
          {TEKNOLOGI.map((t) => (
            <div key={t.judul}>
              <dt>{t.judul}</dt>
              <dd>{t.isi}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="glosarium" className="card">
        <h2 className="card-judul" style={{ fontSize: 20 }}>Glosarium</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Istilah pesantren dan akademik yang dipakai di seluruh aplikasi.
        </p>
        <div className="tabel-wrap">
          <table>
            <tbody>
              {GLOSARIUM.map((g) => (
                <tr key={g.istilah}>
                  <td style={{ whiteSpace: 'nowrap' }}><b>{g.istilah}</b></td>
                  <td className="muted" style={{ fontSize: 13 }}>{g.arti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
