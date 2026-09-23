import { createHash } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';

/**
 * Infrastruktur unggah berkas bersama (01-fondasi-auth-rbac-crud.md §5),
 * dipakai presensi selfie (02), lamaran rekrutmen (03), dan dokumen aset (04).
 * Berkas TIDAK PERNAH disimpan di `public/` — hanya lewat `simpanBerkas()` di
 * sini dan disajikan lewat route bergerbang app/berkas/[id]/route.ts.
 */

export type DomainBerkas = 'presensi' | 'rekrutmen' | 'aset';

/** Batas ukuran per domain (§5.3). Diperiksa SETELAH validasi tipe, supaya pesan error tidak membocorkan tipe file yang ditolak lebih dulu. */
const BATAS_UKURAN_BYTES: Record<DomainBerkas, number> = {
  presensi: 500 * 1024,
  rekrutmen: 2 * 1024 * 1024,
  aset: 5 * 1024 * 1024,
};

const STORAGE_DIR = process.env.STORAGE_DIR ?? path.join(process.cwd(), 'storage');

type TipeDiizinkan = { mime: string; ext: string };

/** Sniff tipe dari MAGIC BYTES, bukan dari Content-Type klien atau ekstensi nama file — keduanya bisa dipalsukan (01 §5.3). */
function deteksiTipe(buffer: Buffer): TipeDiizinkan | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  return null;
}

/** Pertahanan dasar: tolak PDF yang membawa JavaScript tertanam (01 §5.3). Bukan sanitasi menyeluruh, cukup untuk kasus umum. */
function pdfMembawaJavaScript(buffer: Buffer): boolean {
  // Cukup untuk PDF berukuran wajar (≤ 5 MB di sini); dokumen non-PDF tidak lewat fungsi ini.
  const teks = buffer.toString('latin1');
  return teks.includes('/JavaScript') || teks.includes('/JS ') || teks.includes('/JS(') || teks.includes('/JS<<');
}

export class BerkasError extends Error {}

export type SimpanBerkasInput = {
  domain: DomainBerkas;
  buffer: Buffer;
  originalName: string;
  /** null untuk pelamar publik yang belum punya akun (03 §2). */
  uploadedBy: bigint | null;
};

/**
 * Validasi (magic bytes + ukuran + PDF-JS) lalu simpan fisik ke
 * `storage/<domain>/<yyyy>/<mm>/<sha256>.<ext>` dan catat `FileObject`.
 * Melempar `BerkasError` dengan pesan yang aman ditampilkan ke pengguna.
 */
export async function simpanBerkas(input: SimpanBerkasInput) {
  const tipe = deteksiTipe(input.buffer);
  if (!tipe) {
    throw new BerkasError('Jenis berkas tidak didukung. Hanya JPEG, PNG, WebP, atau PDF.');
  }
  if (tipe.mime === 'application/pdf' && pdfMembawaJavaScript(input.buffer)) {
    throw new BerkasError('Berkas PDF ditolak karena mengandung skrip tertanam.');
  }
  const batas = BATAS_UKURAN_BYTES[input.domain];
  if (input.buffer.length > batas) {
    throw new BerkasError(`Ukuran berkas melebihi batas ${Math.round(batas / 1024)} KB untuk ${input.domain}.`);
  }

  const sha256 = createHash('sha256').update(input.buffer).digest('hex');
  const now = new Date();
  const subdir = path.join(input.domain, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  const namaFile = `${sha256}.${tipe.ext}`;
  const relatifPath = path.join(subdir, namaFile);
  const absolutPath = path.join(STORAGE_DIR, relatifPath);

  await mkdir(path.dirname(absolutPath), { recursive: true });
  await writeFile(absolutPath, input.buffer);

  return prisma.fileObject.create({
    data: {
      domain: input.domain,
      path: relatifPath,
      originalName: input.originalName.slice(0, 255),
      mime: tipe.mime,
      sizeBytes: input.buffer.length,
      sha256,
      uploadedBy: input.uploadedBy,
    },
  });
}

/** Path absolut fisik suatu FileObject — dipakai route penyajian untuk stream. */
export function pathAbsolutBerkas(relatifPath: string): string {
  return path.join(STORAGE_DIR, relatifPath);
}

/** Soft delete (01 §6): baris dipertahankan untuk audit, hanya ditandai. Penghapusan fisik dilakukan cron retensi (§5.5), bukan di sini. */
export async function hapusBerkasLunak(id: bigint) {
  return prisma.fileObject.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Dipakai cron retensi (§5.5): hapus fisik berkas yang deletedAt sudah > `hariRetensi` hari, lalu buang baris metadatanya. */
export async function hapusFisikKedaluwarsa(hariRetensi: number): Promise<number> {
  const batas = new Date(Date.now() - hariRetensi * 24 * 60 * 60 * 1000);
  const kandidat = await prisma.fileObject.findMany({
    where: { deletedAt: { lt: batas } },
    select: { id: true, path: true },
  });
  for (const berkas of kandidat) {
    await unlink(pathAbsolutBerkas(berkas.path)).catch(() => {
      // Berkas fisik mungkin sudah hilang (mis. dihapus manual) — lanjutkan
      // membuang metadatanya saja, jangan biarkan satu berkas hilang
      // menghentikan seluruh batch retensi.
    });
  }
  if (kandidat.length > 0) {
    await prisma.fileObject.deleteMany({ where: { id: { in: kandidat.map((k) => k.id) } } });
  }
  return kandidat.length;
}
