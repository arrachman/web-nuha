import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('mem-parse baris sederhana dengan header', () => {
    const hasil = parseCsv('a,b\n1,2\n3,4');
    expect(hasil).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('menangani field berkutip ganda yang mengandung koma', () => {
    const hasil = parseCsv('nip,nama\nMA-001,"Khalimatus Sa\'diyah, S.Si"');
    expect(hasil).toEqual([{ nip: 'MA-001', fullName: "Khalimatus Sa'diyah, S.Si" }]);
  });

  it('menangani escape kutip ganda ("") di dalam field berkutip', () => {
    const hasil = parseCsv('a\n"kata ""kutip"" di tengah"');
    expect(hasil).toEqual([{ a: 'kata "kutip" di tengah' }]);
  });

  it('melewati baris kosong', () => {
    const hasil = parseCsv('a,b\n1,2\n\n3,4\n');
    expect(hasil).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('membuang BOM UTF-8 di awal berkas', () => {
    const hasil = parseCsv('﻿a,b\n1,2');
    expect(hasil).toEqual([{ a: '1', b: '2' }]);
  });

  it('menangani akhir baris CRLF', () => {
    const hasil = parseCsv('a,b\r\n1,2\r\n3,4\r\n');
    expect(hasil).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('mengisi string kosong untuk kolom yang hilang di baris', () => {
    const hasil = parseCsv('a,b,c\n1,2');
    expect(hasil).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('mengembalikan array kosong untuk teks kosong', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
