import Link from 'next/link';
import { TabLembaga } from '@/components';
import { hrefAkademik, type FilterAkademik } from './filter';
import type { PohonAkademik } from './pohon';

/** Satu chip pilihan: label + jumlah santri di baliknya. */
function Chip({ href, label, jumlah, aktif }: { href: string; label: string; jumlah: number; aktif: boolean }) {
  return (
    <Link href={href} className={`chip ${aktif ? 'chip-aktif' : ''}`} aria-current={aktif ? 'true' : undefined}>
      <span>{label}</span>
      <span className="chip-angka">{jumlah}</span>
    </Link>
  );
}

/** Remah roti Pesantren → unit → tingkat → kelas; tiap remah bisa diklik mundur. */
function Remah({ f, pohon, tab }: { f: FilterAkademik; pohon: PohonAkademik; tab: string }) {
  const unit = pohon.unit.find((u) => u.key === f.unit);
  const kelas = pohon.kelasAktif.find((k) => k.id === f.kelasId);
  const jejak = [
    { label: 'Semua pesantren', href: hrefAkademik(tab, f, { unit: undefined, tingkat: undefined, kelasId: undefined }) },
    ...(unit ? [{ label: unit.nama, href: hrefAkademik(tab, f, { tingkat: undefined, kelasId: undefined }) }] : []),
    ...(f.tingkat ? [{ label: `Tingkat ${f.tingkat}`, href: hrefAkademik(tab, f, { kelasId: undefined }) }] : []),
    ...(kelas ? [{ label: `Kelas ${kelas.nama}`, href: hrefAkademik(tab, f) }] : []),
  ];

  return (
    <nav className="remah" aria-label="Jalur penjelajahan">
      {jejak.map((j, i) => (
        <span key={j.href} className="remah-item">
          {i > 0 && <span className="remah-pisah">›</span>}
          {i === jejak.length - 1 ? <b>{j.label}</b> : <Link href={j.href}>{j.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

/**
 * Penjelajah bertingkat: pilih unit (SMP / MA / Pondok), lalu tingkat, lalu
 * kelas. Tiap langkah cuma memperlihatkan pilihan yang relevan supaya operator
 * tidak dihadapkan pada 30 rombel sekaligus.
 */
export function Penjelajah({ f, pohon, tab = 'siswa' }: { f: FilterAkademik; pohon: PohonAkademik; tab?: string }) {
  return (
    <div className="penjelajah">
      <Remah f={f} pohon={pohon} tab={tab} />

      {/* Lembaga naik jadi tab, bukan chip: SMP/MA/Madin adalah organisasi
          terpisah, jadi ia konteks halaman. Tingkat & kelas di bawah tetap chip
          karena keduanya drill-down di dalam lembaga yang sudah dipilih. */}
      <TabLembaga
        items={pohon.unit.map((u) => ({
          key: u.key,
          label: u.nama.replace(/ Nurul Huda Mergosono$/, ''),
          jumlah: u.jumlah,
        }))}
        aktif={f.unit}
        jumlahSemua={pohon.total}
        hrefItem={(key) => hrefAkademik(tab, f, { unit: key, tingkat: undefined, kelasId: undefined })}
      />

      {f.unit && pohon.tingkatAktif.length > 0 && (
        <div className="chip-baris">
          <span className="chip-label">Tingkat</span>
          <Chip
            href={hrefAkademik(tab, f, { tingkat: undefined, kelasId: undefined })}
            label="Semua"
            jumlah={pohon.unit.find((u) => u.key === f.unit)?.jumlah ?? 0}
            aktif={!f.tingkat}
          />
          {pohon.tingkatAktif.map((t) => (
            <Chip
              key={t.tingkat}
              href={hrefAkademik(tab, f, { tingkat: t.tingkat, kelasId: undefined })}
              label={t.tingkat}
              jumlah={t.jumlah}
              aktif={f.tingkat === t.tingkat}
            />
          ))}
        </div>
      )}

      {f.tingkat && pohon.kelasAktif.length > 0 && (
        <div className="chip-baris">
          <span className="chip-label">Kelas</span>
          <Chip
            href={hrefAkademik(tab, f, { kelasId: undefined })}
            label="Semua"
            jumlah={pohon.tingkatAktif.find((t) => t.tingkat === f.tingkat)?.jumlah ?? 0}
            aktif={!f.kelasId}
          />
          {pohon.kelasAktif.map((k) => (
            <Chip
              key={k.id}
              href={hrefAkademik(tab, f, { kelasId: k.id })}
              label={k.nama}
              jumlah={k.jumlah}
              aktif={f.kelasId === k.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
