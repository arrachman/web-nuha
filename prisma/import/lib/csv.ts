/**
 * Parser CSV minimal tanpa dependency tambahan. Menangani field berkutip
 * ganda yang mengandung koma, escape `""` di dalam kutip, baris kosong,
 * BOM UTF-8, dan akhir baris CRLF/LF campuran.
 */

/** Pisah satu baris CSV mentah menjadi daftar field, menghormati kutip. */
const pisahBaris = (baris: string): string[] => {
  const field: string[] = [];
  let saatIni = '';
  let dalamKutip = false;

  for (let i = 0; i < baris.length; i += 1) {
    const ch = baris[i];

    if (dalamKutip) {
      if (ch === '"') {
        if (baris[i + 1] === '"') {
          saatIni += '"';
          i += 1;
        } else {
          dalamKutip = false;
        }
      } else {
        saatIni += ch;
      }
      continue;
    }

    if (ch === '"') {
      dalamKutip = true;
      continue;
    }
    if (ch === ',') {
      field.push(saatIni);
      saatIni = '';
      continue;
    }
    saatIni += ch;
  }

  field.push(saatIni);
  return field;
};

/**
 * Parse teks CSV lengkap menjadi array objek, memakai baris pertama sebagai
 * header. Baris kosong (setelah trim) dilewati. Mendukung field multi-baris
 * yang dibungkus kutip ganda (mengandung karakter baris baru literal).
 */
export const parseCsv = (teks: string): Record<string, string>[] => {
  const tanpaBom = teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks;
  const normal = tanpaBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Gabungkan baris-baris logis: baris baru di dalam kutip ganda bukan
  // pemisah baris, jadi hitung jumlah kutip ganjil/genap sambil menelusuri.
  const barisLogis: string[] = [];
  let bufer = '';
  let dalamKutip = false;
  for (const ch of normal) {
    if (ch === '"') dalamKutip = !dalamKutip;
    if (ch === '\n' && !dalamKutip) {
      barisLogis.push(bufer);
      bufer = '';
      continue;
    }
    bufer += ch;
  }
  if (bufer.length > 0) barisLogis.push(bufer);

  const barisTerisi = barisLogis.filter((baris) => baris.trim().length > 0);
  if (barisTerisi.length === 0) return [];

  const header = pisahBaris(barisTerisi[0]).map((kolom) => kolom.trim());
  const hasil: Record<string, string>[] = [];

  for (const baris of barisTerisi.slice(1)) {
    const nilai = pisahBaris(baris);
    const baris2: Record<string, string> = {};
    header.forEach((kolom, idx) => {
      baris2[kolom] = (nilai[idx] ?? '').trim();
    });
    hasil.push(baris2);
  }

  return hasil;
};
