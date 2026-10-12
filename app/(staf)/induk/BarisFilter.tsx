import { FilterAktif, ButtonLink, type ChipFilter } from '@/components';
import { hrefInduk, type FilterInduk } from './filter';
import type { PohonInduk } from './pohon';
import { KotakCari } from './KotakCari';

/** Satu tombol pilihan yang menyala saat nilainya sedang dipakai; klik ulang mematikannya.
 * Memakai kelas `.chip` bersama (globals.css), bukan gaya sebaris, supaya seragam
 * dengan penjelajah di modul lain. */
function Opsi({ f, ubah, aktif, anak }: { f: FilterInduk; ubah: Partial<FilterInduk>; aktif: boolean; anak: React.ReactNode }) {
  const mati = Object.fromEntries(Object.keys(ubah).map((k) => [k, undefined])) as Partial<FilterInduk>;
  return (
    <ButtonLink varian="chip" aktif={aktif} href={hrefInduk(f, aktif ? mati : ubah)} aria-pressed={aktif} aria-current={aktif ? 'true' : undefined}>
      {anak}
    </ButtonLink>
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

/** Penyaring cepat di atas daftar — TANPA tombol terapkan/cari sama sekali
 * (permintaan user): pencarian adalah komponen klien yang menavigasi saat
 * ketikan berubah (onchange, debounce), dan pilihan lain berupa tautan chip
 * yang langsung berlaku satu klik. Filter Status dan filter Kelas sudah
 * dihapus dari sini; daftar secara bawaan menampilkan santri aktif saja
 * (lihat whereFilter), dan penelusuran per kelas tidak lagi ditawarkan.
 * Unit dipilih lewat tab lembaga / PemilihUnit global di atas halaman ini. */
export function BarisFilter({ f, angkatan, hasil, pohon }: { f: FilterInduk; angkatan: string[]; hasil: number; pohon: PohonInduk }) {
  const unitAktifId = f.alumniUnitId ?? f.unitId;
  const unitAktif = unitAktifId ? pohon.unit.find((u) => u.id === unitAktifId) : undefined;
  const copot: ChipFilter[] = [
    ...(f.q ? [{ label: `Cari: "${f.q}"`, href: hrefInduk(f, { q: '' }) }] : []),
    ...(f.alumniUnitId ? [{ label: 'Lulusan', href: hrefInduk(f, { alumniUnitId: undefined }) }] : []),
    ...(f.jk ? [{ label: `Jenis kelamin: ${f.jk === 'L' ? 'Putra' : 'Putri'}`, href: hrefInduk(f, { jk: undefined }) }] : []),
    ...(f.angkatan ? [{ label: `Angkatan: ${f.angkatan}`, href: hrefInduk(f, { angkatan: undefined }) }] : []),
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <KotakCari f={f} />
        <span className="muted" style={{ fontSize: 12.5 }}>
          <strong style={{ color: 'var(--teks-kuat)' }}>{hasil}</strong> santri cocok
        </span>
      </div>

      <FilterAktif chip={copot} hrefBersih="/induk" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--garis)', paddingTop: 10 }}>
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
        {/* Lulusan per lembaga — dulu cabang di panel pohon. Mematikannya
            mengembalikan unit aktif (bukan membersihkannya), sama seperti
            tautan pohon sebelumnya. */}
        {unitAktif && (unitAktif.alumni > 0 || f.alumniUnitId) && (
          <Kelompok
            judul="Lulusan"
            anak={(
              <ButtonLink
                varian="chip"
                aktif={!!f.alumniUnitId}
                href={f.alumniUnitId
                  ? hrefInduk(f, { alumniUnitId: undefined, unitId: unitAktif.id })
                  : hrefInduk(f, { alumniUnitId: unitAktif.id })}
                aria-pressed={!!f.alumniUnitId}
                aria-current={f.alumniUnitId ? 'true' : undefined}
              >
                {`${unitAktif.nama} (${unitAktif.alumni})`}
              </ButtonLink>
            )}
          />
        )}
      </div>
    </div>
  );
}
