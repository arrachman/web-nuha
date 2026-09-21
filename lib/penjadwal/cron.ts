import { type WaktuWib } from '@/lib/penjadwal/waktu';

/**
 * Pencocok ekspresi cron 5 kolom (menit jam tgl bulan hari) minimal — cukup
 * untuk kebutuhan penjadwal ini (bilangan tetap, tanda bintang, atau tanda
 * bintang garis-miring-n). Sengaja tidak pakai paket npm eksternal supaya
 * `nuha-cron` tidak menambah dependency baru untuk kebutuhan sekecil ini
 * (keputusan desain — lapor bila kebutuhan cron jadi lebih kompleks nanti).
 */
function cocokKolom(pola: string, nilai: number): boolean {
  if (pola === '*') return true;
  if (pola.startsWith('*/')) {
    const langkah = Number(pola.slice(2));
    return Number.isFinite(langkah) && langkah > 0 && nilai % langkah === 0;
  }
  return pola.split(',').some((bagian) => Number(bagian) === nilai);
}

/**
 * Cocokkan ekspresi cron terhadap satu titik waktu WIB. Kolom tanggal/bulan
 * dari `WaktuWib` tidak tersedia (hanya menyimpan hari-dalam-minggu), jadi
 * kolom ke-3/ke-4 (tanggal, bulan) hanya didukung sebagai `*` — cukup untuk
 * seluruh job Fase 7 yang semuanya harian/tiap-menit.
 */
export function cocokkanCron(ekspresi: string, waktu: WaktuWib): boolean {
  const kolom = ekspresi.trim().split(/\s+/);
  if (kolom.length !== 5) throw new Error(`Ekspresi cron tidak valid: "${ekspresi}"`);
  const [menit, jam, tanggal, bulan, hari] = kolom;
  if (tanggal !== '*' || bulan !== '*') {
    throw new Error(`Kolom tanggal/bulan belum didukung penjadwal ini: "${ekspresi}"`);
  }
  return cocokKolom(menit, waktu.menit) && cocokKolom(jam, waktu.jam) && cocokKolom(hari, waktu.hariIndex);
}
