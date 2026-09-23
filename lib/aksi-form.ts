import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

/**
 * Pola Server Action berbasis form tanpa JS klien: jalankan `fn`, lalu
 * redirect kembali ke `_kembali` dengan `?pesan=` (sukses) atau `?galat=`
 * (Error yang dilempar). Halaman menampilkan keduanya lewat <PesanAksi/>.
 * `_kembali` dibatasi ke prefiks yang diizinkan supaya tidak jadi open redirect.
 */
export async function jalankanAksi(
  formData: FormData,
  fn: () => Promise<string | void>,
  opsi: { bawaan: string; prefiks: string[]; revalidate?: string[] },
): Promise<never> {
  const tujuan = () => {
    const kembaliRaw = String(formData.get('_kembali') ?? '');
    const kembali = opsi.prefiks.some((p) => kembaliRaw.startsWith(p)) && !kembaliRaw.startsWith('//') ? kembaliRaw : opsi.bawaan;
    const bersih = kembali.replace(/([?&])(pesan|galat)=[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
    return { bersih, sambung: bersih.includes('?') ? '&' : '?' };
  };
  const awal = tujuan();
  let pesan: string | void;
  try {
    pesan = await fn();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
    redirect(`${awal.bersih}${awal.sambung}galat=${encodeURIComponent(msg)}`);
  }
  for (const p of opsi.revalidate ?? []) revalidatePath(p);
  // fn boleh mengganti `_kembali` (mis. ke halaman detail entitas yang baru dibuat).
  const akhir = tujuan();
  redirect(pesan ? `${akhir.bersih}${akhir.sambung}pesan=${encodeURIComponent(pesan)}` : akhir.bersih);
}

export function teks(fd: FormData, k: string): string {
  return String(fd.get(k) ?? '').trim();
}
export function teksAtauNull(fd: FormData, k: string): string | null {
  return teks(fd, k) || null;
}
export function angka(fd: FormData, k: string): number | null {
  const mentah = teks(fd, k);
  if (!mentah) return null;
  // Input angka memakai <input type=number> (browser mengirim desimal titik tanpa
  // pemisah ribuan); koma desimal ditoleransi untuk input teks.
  const t = mentah.replace(',', '.');
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Nilai ${k} tidak valid.`);
  return n;
}
export function wajib(fd: FormData, k: string, label: string): string {
  const v = teks(fd, k);
  if (!v) throw new Error(`${label} wajib diisi.`);
  return v;
}
