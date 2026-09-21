import type { ReactNode } from 'react';

type Props = {
  halaman: number;
  totalHalaman: number;
  total: number;
  jumlahBaris: number;
  ukuranHalaman: number;
  buatHref?: (halaman: number) => string;
  onPageChange?: (halaman: number) => void;
  /** Kontrol tambahan di sisi kanan, mis. pemilih baris per halaman. */
  ekstra?: ReactNode;
};

const GAYA_TOMBOL = {
  minWidth: 34,
  textAlign: 'center' as const,
  padding: '7px 10px',
  borderRadius: 9,
  textDecoration: 'none',
  fontSize: 12.5,
  fontWeight: 600,
};

/** Banyak tombol nomor halaman yang ditampilkan di antara prev dan next. */
const JENDELA_NOMOR = 5;

/** Jendela maks 4 nomor halaman, digeser agar halaman aktif selalu ikut terlihat. */
function nomorHalaman(halaman: number, totalHalaman: number): number[] {
  const banyak = Math.min(JENDELA_NOMOR, totalHalaman);
  const mulai = Math.min(Math.max(1, halaman - Math.floor((banyak - 1) / 2)), totalHalaman - banyak + 1);
  return Array.from({ length: banyak }, (_, i) => mulai + i);
}

type TombolProps = { label: string; judul: string; tujuan: number; aktif: boolean; buatHref?: (halaman: number) => string; onPageChange?: (halaman: number) => void };

/** Satu tombol navigasi; jadi <span> non-klik saat sudah di ujung. */
function TombolNav({ label, judul, tujuan, aktif, buatHref, onPageChange }: TombolProps) {
  if (!aktif) {
    return (
      <span className="btn-sekunder" aria-disabled="true" title={judul} style={{ ...GAYA_TOMBOL, opacity: 0.45, cursor: 'default' }}>
        {label}
      </span>
    );
  }
  if (onPageChange) {
    return <button className="btn-sekunder" type="button" onClick={() => onPageChange(tujuan)} title={judul} aria-label={judul} style={{ ...GAYA_TOMBOL, cursor: 'pointer' }}>{label}</button>;
  }
  return <a className="btn-sekunder" href={buatHref!(tujuan)} title={judul} aria-label={judul} style={{ ...GAYA_TOMBOL, cursor: 'pointer' }}>{label}</a>;
}

/** Footer pager: "Menampilkan X–Y dari Z" + navigasi awal/sebelumnya/berikutnya/akhir. Dipakai bersama util `bacaHalaman`. */
export function Pagination({ halaman, totalHalaman, total, jumlahBaris, ukuranHalaman, buatHref, onPageChange, ekstra }: Props) {
  const awal = jumlahBaris === 0 ? 0 : (halaman - 1) * ukuranHalaman + 1;
  const akhir = (halaman - 1) * ukuranHalaman + jumlahBaris;
  const adaSebelum = halaman > 1;
  const adaSesudah = halaman < totalHalaman;
  return (
    <div className="bilah-footer">
      <span className="muted" style={{ fontSize: 12.5 }}>
        Menampilkan {awal}–{akhir} dari {total}
      </span>
      <div className="bilah-footer-kanan">
        {ekstra}
        {totalHalaman > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <TombolNav label="«" judul="Halaman pertama" tujuan={1} aktif={adaSebelum} buatHref={buatHref} onPageChange={onPageChange} />
            <TombolNav label="‹" judul="Halaman sebelumnya" tujuan={halaman - 1} aktif={adaSebelum} buatHref={buatHref} onPageChange={onPageChange} />
            {nomorHalaman(halaman, totalHalaman).map((p) => (p === halaman
              ? (
                <span key={p} aria-current="page" aria-label={`Halaman ${p}, halaman ini`} className="btn-sekunder active" style={GAYA_TOMBOL}>
                  {p}
                </span>
              )
              : onPageChange
                ? <button key={p} type="button" onClick={() => onPageChange(p)} aria-label={`Halaman ${p}`} className="btn-sekunder" style={{ ...GAYA_TOMBOL, cursor: 'pointer' }}>{p}</button>
                : <a key={p} href={buatHref!(p)} aria-label={`Halaman ${p}`} className="btn-sekunder" style={{ ...GAYA_TOMBOL, cursor: 'pointer' }}>{p}</a>
            ))}
            <TombolNav label="›" judul="Halaman berikutnya" tujuan={halaman + 1} aktif={adaSesudah} buatHref={buatHref} onPageChange={onPageChange} />
            <TombolNav label="»" judul="Halaman terakhir" tujuan={totalHalaman} aktif={adaSesudah} buatHref={buatHref} onPageChange={onPageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
