import Link from 'next/link';
import { hrefInduk, type FilterInduk } from './filter';
import type { PohonInduk } from './pohon';

const baris = (aktif: boolean, indent: number): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  padding: `6px 10px 6px ${10 + indent * 12}px`, borderRadius: 9, fontSize: 12.5,
  background: aktif ? 'var(--hijau)' : 'transparent',
  color: aktif ? 'var(--krem)' : 'var(--teks-2)',
  fontWeight: aktif ? 700 : 500,
});

function Cacah({ n, aktif }: { n: number; aktif: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
      background: aktif ? 'rgba(255,255,255,0.22)' : 'var(--krem-3)',
      color: aktif ? 'var(--krem)' : 'var(--teks-lembut)',
    }}
    >
      {n}
    </span>
  );
}

/** Navigasi tingkat → kelas **di dalam lembaga yang sedang aktif**.
 *
 * Baris nama lembaga sengaja tidak ada di sini: pemilihan lembaga sudah naik ke
 * tab di atas halaman (`TabUnit`), jadi mengulanginya di panel ini hanya membuat
 * dua kontrol yang mengerjakan hal sama. Selama belum ada lembaga terpilih,
 * panel hanya mengarahkan ke tab itu — tingkat & kelas milik lembaga berbeda
 * tidak sebanding untuk ditumpuk dalam satu daftar.
 */
export function PohonLembaga({ pohon, f }: { pohon: PohonInduk; f: FilterInduk }) {
  const unitAktif = f.alumniUnitId ?? f.unitId;
  const u = unitAktif ? pohon.unit.find((x) => x.id === unitAktif) : undefined;
  const alumniAktif = typeof f.alumniUnitId === 'number';

  // "Belum berkelas" hanya bermakna untuk santri aktif. Alumni & santri keluar
  // pasti tidak punya kelas, jadi cabang ini akan menampung semuanya dan tidak
  // menyaring apa pun — sembunyikan saat status non-aktif.
  const tampilTanpaKelas = pohon.tanpaKelas > 0 && (!f.status || f.status === 'Aktif');

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!u ? (
        <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, padding: '2px 4px 6px', margin: 0 }}>
          Pilih lembaga di tab atas untuk menelusuri tingkat dan kelasnya.
        </p>
      ) : (
        <>
          {u.tingkat.map((t) => {
            // Kelas kosong disembunyikan (kecuali sedang aktif dipilih) supaya
            // panel tidak dipenuhi cabang 0 saat penyaring menyempitkan data.
            const kelasTampil = t.kelas.filter((k) => k.jumlah > 0 || f.kelasId === k.id);
            if (kelasTampil.length === 0) return null;

            if (kelasTampil.length === 1) {
              const k = kelasTampil[0];
              const aktif = f.kelasId === k.id;
              return (
                <Link key={t.tingkat} href={hrefInduk(f, { unitId: u.id, kelasId: k.id })} style={baris(aktif, 0)}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                  <Cacah n={k.jumlah} aktif={aktif} />
                </Link>
              );
            }
            return (
              <details key={t.tingkat} open={t.kelas.some((k) => k.id === f.kelasId)}>
                <summary style={{ listStyle: 'none', cursor: 'pointer' }}>
                  <span style={baris(false, 0)}>
                    <span className="muted" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3 }}>
                      {t.label}
                    </span>
                    <Cacah n={t.jumlah} aktif={false} />
                  </span>
                </summary>
                {kelasTampil.map((k) => {
                  const aktif = f.kelasId === k.id;
                  return (
                    <Link key={k.id} href={hrefInduk(f, { unitId: u.id, kelasId: k.id })} style={baris(aktif, 1)}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.nama}</span>
                      <Cacah n={k.jumlah} aktif={aktif} />
                    </Link>
                  );
                })}
              </details>
            );
          })}

          {/* Semua tingkat: mengembalikan cakupan ke seluruh lembaga aktif tanpa
              harus lewat tab (yang akan ikut membuang cabang alumni). */}
          {f.kelasId !== undefined && (
            <Link href={hrefInduk(f, { unitId: u.id, kelasId: undefined })} style={baris(false, 0)}>
              <span className="muted" style={{ fontSize: 11.5 }}>Semua tingkat</span>
            </Link>
          )}

          {(u.alumni > 0 || alumniAktif) && (
            <Link href={hrefInduk(f, alumniAktif ? { alumniUnitId: undefined, unitId: u.id } : { alumniUnitId: u.id })} style={baris(alumniAktif, 0)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lulusan</span>
              <Cacah n={u.alumni} aktif={alumniAktif} />
            </Link>
          )}
        </>
      )}

      {tampilTanpaKelas && (
        <Link
          href={hrefInduk(f, { unitId: undefined, kelasId: f.kelasId === 'none' ? undefined : 'none' })}
          style={{ ...baris(f.kelasId === 'none', 0), fontStyle: 'italic' }}
        >
          <span className="muted" style={{ fontSize: 11.5, color: f.kelasId === 'none' ? 'inherit' : undefined }}>Belum berkelas</span>
          <Cacah n={pohon.tanpaKelas} aktif={f.kelasId === 'none'} />
        </Link>
      )}
    </nav>
  );
}
