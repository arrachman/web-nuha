/**
 * Generator NIS deterministik untuk santri yang di data client hanya punya
 * NISN (lihat RENCANA-IMPORT.md Fase 1 butir 4). Format:
 * `<tahunMasuk><kodeUnit><urut 3 digit>`, mis. `2025MA001`. NISN tetap
 * sumber kebenaran/kunci pencocokan — NIS ini murni label internal,
 * dibuat ulang secara stabil setiap importir dijalankan (idempoten).
 */
export const buatNis = (tahunMasuk: string, kodeUnit: string, urutDalamAngkatan: number): string => {
  if (!/^\d{4}$/.test(tahunMasuk)) {
    throw new Error(`tahunMasuk untuk NIS harus 4 digit tahun (dapat: "${tahunMasuk}")`);
  }
  if (urutDalamAngkatan < 1) {
    throw new Error(`urutDalamAngkatan harus >= 1 (dapat: ${urutDalamAngkatan})`);
  }
  const urut = String(urutDalamAngkatan).padStart(3, '0');
  return `${tahunMasuk}${kodeUnit}${urut}`;
};
