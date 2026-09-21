import { laporPelanggaran } from '@/app/(staf)/ujian/peserta-actions';

/**
 * Jalur pelaporan pelanggaran dari pengawasan sisi klien. Sengaja route,
 * bukan server action, supaya bisa dipanggil `fetch` dari event handler tanpa
 * memuat ulang halaman ujian. Otorisasi tetap di server action: peserta hanya
 * bisa melapor atas dirinya sendiri.
 */
export async function POST(req: Request) {
  const fd = await req.formData();
  await laporPelanggaran(fd);
  return Response.json({ success: true, data: null, error: null });
}
