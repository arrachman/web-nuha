import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';

/**
 * Berkas SK kepegawaian (SK MA, SK Asrama Putra, dst.) memuat data pribadi
 * pegawai — TIDAK boleh disajikan lewat `public/`. Mengikuti pola
 * app/docs/tangkapan/[nama]/route.ts: disimpan di `sk-assets/` (di luar
 * `public/`) dan hanya disajikan untuk sesi yang sah lewat route bergerbang.
 */
const DIR = path.join(process.cwd(), 'sk-assets');

export async function GET(_request: Request, { params }: { params: Promise<{ nama: string }> }) {
  if (!(await readSession())) return new NextResponse('Tidak berwenang', { status: 401 });

  const { nama } = await params;
  // Hanya nama berkas polos: menutup path traversal sebelum menyentuh disk.
  if (!/^[a-zA-Z0-9._-]+\.pdf$/.test(nama)) return new NextResponse('Tidak ditemukan', { status: 404 });

  try {
    const isi = await readFile(path.join(DIR, nama));
    return new NextResponse(new Uint8Array(isi), {
      headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return new NextResponse('Tidak ditemukan', { status: 404 });
  }
}
