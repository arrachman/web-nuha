import Link from 'next/link';
import { FilterAktif, type ChipFilter } from '@/components';
import { hrefInduk, STATUS_SANTRI, type FilterInduk } from './filter';

/** Satu tombol pilihan yang menyala saat nilainya sedang dipakai; klik ulang mematikannya.
 * Memakai kelas `.chip` bersama (globals.css), bukan gaya sebaris, supaya seragam
 * dengan penjelajah di modul lain. */
function Opsi({ f, ubah, aktif, anak }: { f: FilterInduk; ubah: Partial<FilterInduk>; aktif: boolean; anak: React.ReactNode }) {
  const mati = Object.fromEntries(Object.keys(ubah).map((k) => [k, undefined])) as Partial<FilterInduk>;
  return (
    <Link href={hrefInduk(f, aktif ? mati : ubah)} className={`chip ${aktif ? 'chip-aktif' : ''}`} aria-pressed={aktif} aria-current={aktif ? 'true' : undefined}>
      {anak}
    </Link>
  );
}

function Kelompok({ judul, anak }: { judul: string; anak: React.ReactNode }) {
  return (
    <div className="chip-baris">
      <span className="chip-label">{judul}</span>
      {anak}
    </div>
  );
}

/** Penyaring cepat di atas daftar. Semua pilihan berupa tautan (bukan form),
 * jadi satu klik = satu keadaan URL yang bisa dibookmark dan di-back. */
export function BarisFilter({ f, angkatan, hasil }: { f: FilterInduk; angkatan: string[]; hasil: number }) {
  // Unit & kelas sengaja tidak dijadikan chip: pohon lembaga di sebelah sudah
  // menyorot pilihannya, jadi chip-nya cuma duplikat yang bikin baris ini ramai.
  const copot: ChipFilter[] = [
    ...(f.q ? [{ label: `Cari: "${f.q}"`, href: hrefInduk(f, { q: '' }) }] : []),
    ...(f.alumniUnitId ? [{ label: 'Lulusan', href: hrefInduk(f, { alumniUnitId: undefined }) }] : []),
    ...(f.status && f.status !== 'Aktif' ? [{ label: `Status: ${f.status}`, href: hrefInduk(f, { status: undefined }) }] : []),
    ...(f.jk ? [{ label: `Jenis kelamin: ${f.jk === 'L' ? 'Putra' : 'Putri'}`, href: hrefInduk(f, { jk: undefined }) }] : []),
    ...(f.angkatan ? [{ label: `Angkatan: ${f.angkatan}`, href: hrefInduk(f, { angkatan: undefined }) }] : []),
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <form action="/induk" method="get" style={{ display: 'flex', gap: 7, alignItems: 'center', flex: '1 1 260px' }}>
          {f.unitId && <input type="hidden" name="unit" value={f.unitId} />}
          {f.kelasId && <input type="hidden" name="kelas" value={f.kelasId} />}
          {f.alumniUnitId && <input type="hidden" name="alumni" value={f.alumniUnitId} />}
          {f.status && <input type="hidden" name="status" value={f.status} />}
          {f.angkatan && <input type="hidden" name="angkatan" value={f.angkatan} />}
          <input
            type="search"
            name="q"
            defaultValue={f.q}
            placeholder="Cari nama, NIS, atau NISN…"
            aria-label="Cari santri"
            className="input-cari"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="submit" className="btn btn-sekunder" style={{ padding: '9px 16px' }}>
            Cari
          </button>
        </form>
        <span className="muted" style={{ fontSize: 12.5 }}>
          <strong style={{ color: 'var(--teks-kuat)' }}>{hasil}</strong> santri cocok
        </span>
      </div>

      <FilterAktif chip={copot} hrefBersih="/induk" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--garis)', paddingTop: 10 }}>
        <Kelompok
          judul="Status"
          anak={STATUS_SANTRI.map((s) => (
            <Opsi
              key={s}
              f={f}
              ubah={{ status: s }}
              // "Aktif" adalah bawaan: menyala juga saat tak ada status di URL,
              // tapi tidak saat sedang menelusuri cabang Lulusan per unit.
              aktif={s === 'Aktif' ? !f.alumniUnitId && (!f.status || f.status === 'Aktif') : f.status === s}
              anak={s}
            />
          ))}
        />
        <Kelompok
          judul="Jenis kelamin"
          anak={[
            <Opsi key="L" f={f} ubah={{ jk: 'L' }} aktif={f.jk === 'L'} anak="Putra" />,
            <Opsi key="P" f={f} ubah={{ jk: 'P' }} aktif={f.jk === 'P'} anak="Putri" />,
          ]}
        />
        {angkatan.length > 0 && (
          <Kelompok
            judul="Angkatan"
            anak={angkatan.map((a) => (
              <Opsi key={a} f={f} ubah={{ angkatan: a }} aktif={f.angkatan === a} anak={a} />
            ))}
          />
        )}
      </div>
    </div>
  );
}
