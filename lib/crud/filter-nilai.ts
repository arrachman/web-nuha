/**
 * Nilai filter yang berarti "jangan saring". Dipakai oleh filter berbawaan
 * (mis. Status = Aktif): kosong berarti "pakai bawaan", jadi membuka semua
 * baris butuh nilai eksplisit sendiri.
 *
 * Berdiri di modul sendiri supaya bilah filter (komponen klien) tidak menarik
 * `engine.ts` beserta Prisma ke dalam bundel browser.
 */
export const SEMUA = 'semua';
