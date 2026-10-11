/** Terbilang rupiah ala Indonesia untuk kwitansi. */
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function tb(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${tb(n - 10)} belas`;
  if (n < 100) {
    const r = n % 10;
    return r === 0 ? `${tb(Math.floor(n / 10))} puluh` : `${tb(Math.floor(n / 10))} puluh ${tb(r)}`;
  }
  if (n < 200) return n === 100 ? "seratus" : `seratus ${tb(n - 100)}`;
  if (n < 1000) {
    const r = n % 100;
    return r === 0 ? `${tb(Math.floor(n / 100))} ratus` : `${tb(Math.floor(n / 100))} ratus ${tb(r)}`;
  }
  if (n < 2000) return n === 1000 ? "seribu" : `seribu ${tb(n - 1000)}`;
  if (n < 1_000_000) {
    const r = n % 1000;
    return r === 0 ? `${tb(Math.floor(n / 1000))} ribu` : `${tb(Math.floor(n / 1000))} ribu ${tb(r)}`;
  }
  if (n < 1_000_000_000) {
    const r = n % 1_000_000;
    return r === 0 ? `${tb(Math.floor(n / 1_000_000))} juta` : `${tb(Math.floor(n / 1_000_000))} juta ${tb(r)}`;
  }
  const r = n % 1_000_000_000;
  return r === 0 ? `${tb(Math.floor(n / 1_000_000_000))} milyar` : `${tb(Math.floor(n / 1_000_000_000))} milyar ${tb(r)}`;
}

/** "120000" -> "Seratus dua puluh ribu rupiah". */
export function terbilangRupiah(nominal: number): string {
  const n = Math.floor(Math.abs(Number(nominal) || 0));
  if (n === 0) return "Nol rupiah";
  const kata = tb(n).replace(/\s+/g, " ").trim();
  return `${kata.charAt(0).toUpperCase()}${kata.slice(1)} rupiah`;
}
