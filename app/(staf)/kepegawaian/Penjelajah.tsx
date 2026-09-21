import Link from 'next/link';
import { TabLembaga } from '@/components';
import { hrefKepegawaian, type FilterPegawai } from './filter';
import type { PohonPegawai } from './pohon';

/** Satu chip pilihan: label + jumlah pegawai di baliknya. */
function Chip({ href, label, jumlah, aktif }: { href: string; label: string; jumlah: number; aktif: boolean }) {
  return (
    <Link href={href} className={`chip ${aktif ? 'chip-aktif' : ''}`} aria-current={aktif ? 'true' : undefined}>
      <span>{label}</span>
      <span className="chip-angka">{jumlah}</span>
    </Link>
  );
}

/** Remah roti Pesantren → lembaga → status; tiap remah bisa diklik mundur. */
function Remah({ f, pohon, tab }: { f: FilterPegawai; pohon: PohonPegawai; tab: string }) {
  const lembaga = pohon.lembaga.find((l) => l.key === f.unit);
  const jejak = [
    { label: 'Semua pesantren', href: hrefKepegawaian(tab, f, { unit: undefined, status: undefined }) },
    ...(lembaga ? [{ label: lembaga.nama, href: hrefKepegawaian(tab, f, { status: undefined }) }] : []),
    ...(f.status ? [{ label: f.status, href: hrefKepegawaian(tab, f) }] : []),
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
 * Penjelajah lembaga untuk seluruh modul Kepegawaian: pilih lembaga (SMP / MA /
 * Pondok / Poskestren), lalu status kepegawaian. Sengaja dirender di `page.tsx`
 * DI ATAS tabbar, bukan di dalam tiap tab, supaya pilihan lembaga bertahan saat
 * operator berpindah tab — mengikuti pola yang sama di /induk dan /akademik.
 */
export function Penjelajah({ f, pohon, tab }: { f: FilterPegawai; pohon: PohonPegawai; tab: string }) {
  return (
    <div className="penjelajah">
      <Remah f={f} pohon={pohon} tab={tab} />

      {/* Lembaga naik jadi tab, bukan chip: SMP/MA/Madin/Pondok adalah organisasi
          terpisah, jadi ia konteks halaman — bukan sekadar satu filter di antara
          filter lain. Status di bawah tetap chip karena ia memang penyaring. */}
      <TabLembaga
        items={pohon.lembaga.map((l) => ({ key: l.key, label: l.nama, jumlah: l.jumlah }))}
        aktif={f.unit}
        jumlahSemua={pohon.total}
        hrefItem={(key) => hrefKepegawaian(tab, f, { unit: key, status: undefined })}
      />

      {pohon.status.length > 1 && (
        <div className="chip-baris">
          <span className="chip-label">Status</span>
          <Chip
            href={hrefKepegawaian(tab, f, { status: undefined })}
            label="Semua"
            jumlah={pohon.status.reduce((s, x) => s + x.jumlah, 0)}
            aktif={!f.status}
          />
          {pohon.status.map((s) => (
            <Chip
              key={s.nama}
              href={hrefKepegawaian(tab, f, { status: s.nama })}
              label={s.nama}
              jumlah={s.jumlah}
              aktif={f.status === s.nama}
            />
          ))}
        </div>
      )}

    </div>
  );
}
