/**
 * Pemisah generik "pegawai punya nomor HP" vs "tidak" — dipakai seluruh job
 * penjadwal supaya kasus "belum ada nomor HP" ditangani SATU cara yang sama
 * di mana pun, bukan diam-diam dilewati atau membuat proses crash.
 */
export function pisahkanBerdasarkanHp<T extends { hp: string | null }>(
  daftar: T[],
): { siapKirim: T[]; tanpaHp: T[] } {
  const siapKirim: T[] = [];
  const tanpaHp: T[] = [];
  for (const item of daftar) {
    if (item.hp && item.hp.trim()) siapKirim.push(item);
    else tanpaHp.push(item);
  }
  return { siapKirim, tanpaHp };
}
