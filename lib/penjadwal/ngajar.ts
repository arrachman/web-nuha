export type SlotPelajaran = {
  hari: string;
  pegawaiId: string | null;
  namaPegawai: string | null;
  hp: string | null;
  jamKe: number;
  waktu: string;
  mapel: string;
  kelas: string | null;
};

export type PesanNgajar = {
  tujuanId: string;
  pegawaiId: string;
  nama: string;
  hp: string | null;
  hari: string;
  daftarJam: string;
};

/**
 * Rekap pagi 06.30 WIB: SATU pesan per guru berisi seluruh jam hari itu
 * (bukan satu pesan per jam pelajaran). Slot tanpa `pegawaiId` — termasuk
 * TKA & EKSTRA, tapi juga baris lain yang guru-nya belum termapping ke
 * `Pegawai` (kolom `guru` lama tanpa padanan) — dilewati dan dihitung.
 */
export function bangunPesanNgajar(slotHariIni: SlotPelajaran[], hari: string): { pesan: PesanNgajar[]; tanpaPegawai: number } {
  const perGuru = new Map<string, { nama: string; hp: string | null; jam: SlotPelajaran[] }>();
  let tanpaPegawai = 0;

  for (const slot of slotHariIni) {
    if (!slot.pegawaiId || !slot.namaPegawai) {
      tanpaPegawai++;
      continue;
    }
    const entry = perGuru.get(slot.pegawaiId) ?? { nama: slot.namaPegawai, hp: slot.hp, jam: [] };
    entry.jam.push(slot);
    perGuru.set(slot.pegawaiId, entry);
  }

  const pesan: PesanNgajar[] = [];
  for (const [pegawaiId, entry] of perGuru) {
    const urut = [...entry.jam].sort((a, b) => a.jamKe - b.jamKe);
    const daftarJam = urut
      .map((j, i) => `${i + 1}. ${j.waktu} — ${j.mapel}${j.kelas ? ` (${j.kelas})` : ''}`)
      .join('\n');
    pesan.push({ tujuanId: pegawaiId, pegawaiId, nama: entry.nama, hp: entry.hp, hari, daftarJam });
  }
  return { pesan, tanpaPegawai };
}
