/** Teks rekap WhatsApp siap copas untuk laporan utilitas bulanan. */
export type BarisUtilitas = { nama: string; total: number; tagihKePutri: boolean };

export function rpWa(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export function bangunTeksWaUtilitas(
  periodeLabel: string,
  pln: BarisUtilitas[],
  pdam: BarisUtilitas[],
): string {
  const totalPln = pln.reduce((s, r) => s + r.total, 0);
  const totalPdam = pdam.reduce((s, r) => s + r.total, 0);
  const grand = totalPln + totalPdam;
  const patungan = Math.round(grand / 2);
  const titipan = [...pln, ...pdam].filter((r) => r.tagihKePutri).reduce((s, r) => s + r.total, 0);
  const garis = "━━━━━━━━━━━━━━━";
  const daftar = (rows: BarisUtilitas[]) =>
    rows.map((r, i) => `${i + 1}. ${r.nama} — ${rpWa(r.total)}`).join("\n");
  return [
    "📋 REKAP PEMBAYARAN PLN & PDAM",
    `Periode ${periodeLabel}`,
    "",
    "⚡ PLN",
    daftar(pln),
    `Total PLN: ${rpWa(totalPln)}`,
    "",
    garis,
    "",
    "🚰 PDAM",
    daftar(pdam),
    `Total PDAM: ${rpWa(totalPdam)}`,
    "",
    garis,
    "",
    "💰 REKAP AKHIR",
    `Total PLN : ${rpWa(totalPln)}`,
    `Total PDAM : ${rpWa(totalPdam)}`,
    `TOTAL PENGELUARAN : ${rpWa(grand)}`,
    "",
    "Aturan Pembagian Kas Pengurus:",
    `• Pokok Dasar Patungan (Bagi 2): ${rpWa(patungan)}`,
    `• Titipan Pribadi Ning Badi\u2019 (PLN + PDAM): ${rpWa(titipan)}`,
    `➡️ Total setoran Kas Putri ke Kas Putra: ${rpWa(patungan + titipan)}`,
  ].join("\n");
}

/** "2026-10" -> "Oktober 2026". */
export function labelPeriode(periode: string): string {
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const [yy, mm] = periode.split("-").map(Number);
  if (!yy || !mm || mm < 1 || mm > 12) return periode;
  return `${bulan[mm - 1]} ${yy}`;
}
