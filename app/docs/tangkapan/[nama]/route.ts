import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth';

/**
 * Tangkapan layar dokumentasi memuat data santri, tagihan, dan layar pemasangan
 * WhatsApp, jadi tidak boleh diletakkan di `public/` yang tersaji tanpa login.
 * Route ini menyajikannya hanya untuk sesi yang sah.
 */
const DIR = path.join(process.cwd(), 'docs-assets');

export async function GET(_request: Request, { params }: { params: Promise<{ nama: string }> }) {
  if (!(await readSession())) return new NextResponse('Tidak berwenang', { status: 401 });

  const { nama } = await params;
  // Hanya nama berkas polos: menutup path traversal (`..%2F`) sebelum menyentuh disk.
  if (!/^[a-z0-9-]+\.png$/.test(nama)) return new NextResponse('Tidak ditemukan', { status: 404 });

  try {
    const isi = await readFile(path.join(DIR, nama));
    return new NextResponse(new Uint8Array(isi), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return new NextResponse('Tidak ditemukan', { status: 404 });
  }
}
