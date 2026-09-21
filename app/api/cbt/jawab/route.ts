import { simpanJawaban } from '@/app/(staf)/ujian/peserta-actions';

/**
 * Autosave jawaban. Route, bukan server action, agar bisa dipanggil dari
 * `fetch` yang didebounce tanpa merender ulang seluruh naskah soal.
 * Otorisasi dan koreksi tetap sepenuhnya di sisi server.
 */
export async function POST(req: Request) {
  const fd = await req.formData();
  await simpanJawaban(fd);
  return Response.json({ success: true, data: null, error: null });
}
