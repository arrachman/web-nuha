/**
 * Pembaca XLSX minimal tanpa dependency tambahan. XLSX adalah arsip ZIP
 * berisi XML (Office Open XML). Kita hanya butuh sebagian kecil struktur:
 * daftar sheet (`xl/workbook.xml` + `xl/_rels/workbook.xml.rels`), string
 * bersama (`xl/sharedStrings.xml`), dan isi tiap sheet
 * (`xl/worksheets/sheetN.xml`).
 *
 * ZIP di-parse lewat "central directory" (bukan menebak header lokal
 * berurutan) karena sebagian berkas (terutama hasil ekspor Google Sheets)
 * memakai data descriptor sehingga ukuran di header lokal bisa nol.
 * Dekompresi memakai `node:zlib` (deflate) yang sudah tersedia di Node,
 * tanpa perlu paket npm baru.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

type EntriZip = { nama: string; metodeKompresi: number; ukuranTerkompresi: number; offsetHeaderLokal: number };

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOKAL = 0x04034b50;

/** Cari signature End Of Central Directory dengan menelusuri dari akhir buffer. */
const cariEocd = (buf: Buffer): number => {
  const batasBawah = Math.max(0, buf.length - 65536 - 22);
  for (let i = buf.length - 22; i >= batasBawah; i -= 1) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error('Berkas bukan ZIP/XLSX yang valid: signature End Of Central Directory tidak ditemukan');
};

/** Baca daftar entri (nama + lokasi) dari central directory sebuah ZIP. */
const bacaDaftarEntri = (buf: Buffer): EntriZip[] => {
  const offsetEocd = cariEocd(buf);
  const jumlahEntri = buf.readUInt16LE(offsetEocd + 10);
  let offset = buf.readUInt32LE(offsetEocd + 16);

  const entri: EntriZip[] = [];
  for (let i = 0; i < jumlahEntri; i += 1) {
    if (buf.readUInt32LE(offset) !== SIG_CENTRAL) {
      throw new Error(`Struktur ZIP tidak sesuai dugaan pada entri ke-${i} (offset ${offset})`);
    }
    const metodeKompresi = buf.readUInt16LE(offset + 10);
    const ukuranTerkompresi = buf.readUInt32LE(offset + 20);
    const panjangNama = buf.readUInt16LE(offset + 28);
    const panjangExtra = buf.readUInt16LE(offset + 30);
    const panjangKomentar = buf.readUInt16LE(offset + 32);
    const offsetHeaderLokal = buf.readUInt32LE(offset + 42);
    const nama = buf.toString('utf-8', offset + 46, offset + 46 + panjangNama);

    entri.push({ nama, metodeKompresi, ukuranTerkompresi, offsetHeaderLokal });
    offset += 46 + panjangNama + panjangExtra + panjangKomentar;
  }
  return entri;
};

/** Ekstrak isi satu entri ZIP (mentah, sudah didekompresi bila perlu). */
const ekstrakEntri = (buf: Buffer, entri: EntriZip): Buffer => {
  const off = entri.offsetHeaderLokal;
  if (buf.readUInt32LE(off) !== SIG_LOKAL) {
    throw new Error(`Header lokal ZIP tidak valid untuk "${entri.nama}"`);
  }
  const panjangNama = buf.readUInt16LE(off + 26);
  const panjangExtra = buf.readUInt16LE(off + 28);
  const mulaiData = off + 30 + panjangNama + panjangExtra;
  const dataMentah = buf.subarray(mulaiData, mulaiData + entri.ukuranTerkompresi);

  if (entri.metodeKompresi === 0) return dataMentah; // stored (tanpa kompresi)
  if (entri.metodeKompresi === 8) return inflateRawSync(dataMentah); // deflate
  throw new Error(`Metode kompresi ZIP ${entri.metodeKompresi} pada "${entri.nama}" tidak didukung (hanya stored/deflate)`);
};

/** Unescape entitas XML dasar (&amp; &lt; &gt; &quot; &apos; &#NN; &#xNN;). */
const unescapeXml = (teks: string): string => teks
  .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

/** Parse `xl/sharedStrings.xml` menjadi array string terurut sesuai indeks `<si>`. */
const parseSharedStrings = (xml: string): string[] => {
  const daftarSi = xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/g) ?? [];
  return daftarSi.map((si) => {
    const daftarT = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? [];
    return daftarT.map((t) => unescapeXml(t.replace(/^<t\b[^>]*>/, '').replace(/<\/t>$/, ''))).join('');
  });
};

/** Satu baris sheet: kolom huruf (A, B, C, ...) → nilai string sudah diresolusi. */
export type BarisSheet = Record<string, string>;
/** Satu sheet: nomor baris (1-based, sesuai Excel) → BarisSheet. Baris kosong tidak muncul sebagai key. */
export type Lembar = Map<number, BarisSheet>;

/** Pisahkan referensi sel "C5" menjadi kolom huruf "C" dan nomor baris 5. */
const pisahRefSel = (ref: string): { kolom: string; baris: number } => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Referensi sel "${ref}" tidak valid`);
  return { kolom: m[1], baris: Number(m[2]) };
};

/** Parse satu `xl/worksheets/sheetN.xml` menjadi Lembar, memakai sharedStrings untuk sel bertipe "s". */
const parseWorksheet = (xml: string, sharedStrings: string[]): Lembar => {
  const lembar: Lembar = new Map();
  const daftarRow = xml.match(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g) ?? [];

  for (const rowXml of daftarRow) {
    const nomorBaris = Number(/r="(\d+)"/.exec(rowXml)![1]);
    const isiRow = rowXml.replace(/^<row\b[^>]*>/, '').replace(/<\/row>$/, '');

    // Sel bisa self-closing (<c .../>, tanpa nilai) atau punya isi (<c ...>...</c>).
    const daftarSel = isiRow.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) ?? [];
    const barisData: BarisSheet = {};

    for (const selXml of daftarSel) {
      const refMatch = /r="([A-Z]+\d+)"/.exec(selXml);
      if (!refMatch) continue;
      const { kolom } = pisahRefSel(refMatch[1]);
      const tipeMatch = /\st="([a-zA-Z]+)"/.exec(selXml);
      const tipe = tipeMatch ? tipeMatch[1] : 'n';

      let nilai = '';
      if (tipe === 'inlineStr') {
        const t = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(selXml);
        nilai = t ? unescapeXml(t[1]) : '';
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(selXml);
        const mentah = v ? unescapeXml(v[1]) : '';
        if (tipe === 's') {
          const idx = Number(mentah);
          nilai = Number.isFinite(idx) ? (sharedStrings[idx] ?? '') : '';
        } else {
          nilai = mentah; // angka, boolean ("0"/"1"), atau str (formula) apa adanya
        }
      }

      if (nilai !== '') barisData[kolom] = nilai;
    }

    if (Object.keys(barisData).length > 0) lembar.set(nomorBaris, barisData);
  }

  return lembar;
};

export type Workbook = {
  /** Nama semua sheet, sesuai urutan di `xl/workbook.xml`. */
  namaSheet: string[];
  /** Ambil isi satu sheet by nama (persis, case-sensitive). Melempar bila tidak ada. */
  ambilSheet: (nama: string) => Lembar;
};

/**
 * Baca satu berkas XLSX dan kembalikan akses ke tiap sheet by nama.
 * Melempar Error dengan pesan jelas bila strukturnya bukan XLSX yang
 * didukung (dipakai importir untuk gagal cepat, bukan menebak-nebak data).
 */
export const bacaXlsx = (path: string): Workbook => {
  const buf = readFileSync(path);
  const entriByNama = new Map(bacaDaftarEntri(buf).map((e) => [e.nama, e]));

  const bacaTeks = (nama: string): string | null => {
    const entri = entriByNama.get(nama);
    if (!entri) return null;
    return ekstrakEntri(buf, entri).toString('utf-8');
  };

  const workbookXml = bacaTeks('xl/workbook.xml');
  if (!workbookXml) throw new Error(`"${path}" bukan XLSX yang valid: xl/workbook.xml tidak ditemukan`);
  const relsXml = bacaTeks('xl/_rels/workbook.xml.rels') ?? '';

  // Peta r:id -> target file, dari workbook.xml.rels.
  const targetByRid = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)) {
    targetByRid.set(m[1], m[2]);
  }

  // Peta nama sheet -> r:id, dari workbook.xml.
  const sheetRefs: { nama: string; rid: string }[] = [];
  for (const m of workbookXml.matchAll(/<sheet\b[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*\/>/g)) {
    sheetRefs.push({ nama: unescapeXml(m[1]), rid: m[2] });
  }
  if (sheetRefs.length === 0) throw new Error(`"${path}": tidak ada sheet ditemukan di xl/workbook.xml`);

  const sharedStringsXml = bacaTeks('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];

  const cache = new Map<string, Lembar>();
  const ambilSheet = (nama: string): Lembar => {
    if (cache.has(nama)) return cache.get(nama)!;
    const ref = sheetRefs.find((s) => s.nama === nama);
    if (!ref) {
      throw new Error(`"${path}": sheet "${nama}" tidak ditemukan (yang ada: ${sheetRefs.map((s) => s.nama).join(', ')})`);
    }
    const target = targetByRid.get(ref.rid);
    if (!target) throw new Error(`"${path}": relasi sheet "${nama}" (${ref.rid}) tidak ditemukan di workbook.xml.rels`);
    const path2 = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    const sheetXml = bacaTeks(path2);
    if (!sheetXml) throw new Error(`"${path}": berkas sheet "${path2}" tidak ditemukan di dalam arsip`);
    const lembar = parseWorksheet(sheetXml, sharedStrings);
    cache.set(nama, lembar);
    return lembar;
  };

  return { namaSheet: sheetRefs.map((s) => s.nama), ambilSheet };
};

/**
 * Ubah sel angka mentah XLSX (bisa berupa notasi ilmiah, mis. "3.149098834E9")
 * menjadi string digit utuh. Dipakai untuk kolom seperti NISN/NIK yang di
 * sumbernya kadang tidak diketik sebagai teks (kehilangan nol di depan —
 * itu KETERBATASAN data sumber, bukan bug importir; baris begini tetap lolos
 * tapi perlu dicek manual bila panjang digit hasil tidak sesuai ekspektasi).
 */
export const angkaKeTeksUtuh = (mentah: string): string => {
  const teks = mentah.trim();
  if (!/e/i.test(teks)) return teks;
  const n = Number(teks);
  if (!Number.isFinite(n)) throw new Error(`nilai numerik "${mentah}" tidak dapat dikonversi`);
  return n.toFixed(0);
};
