/** Bangun CSV ramah Excel (BOM UTF-8 + CRLF) — dipakai ekspor laporan modul. */
export function sel(v: unknown): string {
  const teks = v == null ? '' : String(v);
  return /[",\n;]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

export function csvResponse(namaFile: string, header: string[], rows: unknown[][]): Response {
  const isi = [header.map(sel).join(','), ...rows.map((r) => r.map(sel).join(','))].join('\r\n');
  return new Response(`﻿${isi}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
    },
  });
}

/** Parser CSV sederhana (mendukung kutip ganda & koma/titik koma) untuk importir. */
export function parseCsv(teks: string): string[][] {
  const bersih = teks.replace(/^﻿/, '');
  const pemisah = (bersih.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (bersih.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let kutip = false;
  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i];
    if (kutip) {
      if (c === '"' && bersih[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') kutip = false;
      else cur += c;
    } else if (c === '"') kutip = true;
    else if (c === pemisah) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && bersih[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}
