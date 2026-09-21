/**
 * Normalisasi nama untuk pencocokan longgar ke `Pegawai` — buang gelar,
 * tanda baca, dan spasi ganda, lalu bandingkan huruf kecil. Dipakai oleh
 * importir yang sumbernya (foto/scan) menulis nama tanpa gelar lengkap atau
 * dengan ejaan sedikit berbeda dari `Orang.nama` di database.
 */
const GELAR = /\b(s\.?pd|s\.?e|s\.?h|s\.?si|s\.?sos|s\.?hum|s\.?or|s\.?pn|s\.?kep|s\.?tr\.?kom|m\.?pd|m\.?si|m\.?pd\.?i|dr|drs|hj|ust[zh]?\.?|gr)\b\.?/gi;

export function normalisasiNama(nama: string): string {
  return nama
    .toLowerCase()
    .replace(GELAR, ' ')
    .replace(/[.,'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
