/** Blok abu berdenyut sebagai pengganti konten yang sedang dimuat.
 * Animasinya otomatis mati lewat aturan `prefers-reduced-motion` global. */
export function Skeleton({ w = '100%', h = 14, r }: { w?: number | string; h?: number | string; r?: number }) {
  return (
    <div
      className="skeleton"
      aria-hidden
      style={{ width: w, height: h, ...(r === undefined ? {} : { borderRadius: r }) }}
    />
  );
}

/** Beberapa baris skeleton dengan lebar berselang-seling supaya tidak terlihat seperti kotak mati. */
export function SkeletonBaris({ jumlah = 6, tinggi = 34 }: { jumlah?: number; tinggi?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: jumlah }, (_, i) => (
        <Skeleton key={i} h={tinggi} w={i % 3 === 2 ? '82%' : '100%'} />
      ))}
    </div>
  );
}

/** Kerangka umum satu halaman modul: judul, bilah penyaring, lalu tabel. */
export function SkeletonHalaman({ baris = 8 }: { baris?: number }) {
  return (
    <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} role="status" aria-label="Memuat data">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton w={260} h={22} />
        <Skeleton w={420} h={13} />
      </div>
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14 }}>
        <Skeleton w={240} h={34} />
        <Skeleton w={140} h={34} />
        <Skeleton w={140} h={34} />
      </div>
      <div className="card" style={{ padding: 14 }}>
        <SkeletonBaris jumlah={baris} />
      </div>
    </div>
  );
}
