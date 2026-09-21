import { log } from '@/lib/logger';

/**
 * Klien pairing WhatsApp. Daftar perangkat sengaja tidak disalin ke basis data
 * nuha: gateway sudah menyimpannya di `registry.json` bersama kredensial sesi
 * Baileys, dan menyalinnya hanya menciptakan dua sumber kebenaran yang bisa
 * berbeda begitu perangkat di-scan ulang atau diputus dari sisi ponsel.
 */

export type Perangkat = {
  nama: string;
  nomor: string;
  terhubung: boolean;
  token: string;
};

type GatewayEnvelope = { status?: boolean; reason?: string; [key: string]: unknown };

const BATAS_WAKTU_MS = 15_000;

function basisUrl(): string {
  const url = process.env.WA_GATEWAY_URL;
  if (!url) throw new Error('WA_GATEWAY_URL belum dikonfigurasi.');
  return url.replace(/\/$/, '');
}

function tokenAkun(): string {
  const token = process.env.WA_GATEWAY_ACCOUNT_TOKEN;
  if (!token) throw new Error('WA_GATEWAY_ACCOUNT_TOKEN belum dikonfigurasi.');
  return token;
}

/**
 * Gateway meniru gaya Fonnte: kegagalan tetap berbalas HTTP 200 dengan
 * `status:false`, jadi jangan hanya memeriksa `response.ok`.
 */
async function panggil(path: string, token: string, body?: Record<string, string>): Promise<GatewayEnvelope> {
  const response = await fetch(`${basisUrl()}${path}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? new URLSearchParams(body).toString() : undefined,
    signal: AbortSignal.timeout(BATAS_WAKTU_MS),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as GatewayEnvelope;
  if (!response.ok) throw new Error(payload.reason ?? `Gateway HTTP ${response.status}`);
  if (payload.status !== true) throw new Error(payload.reason ?? 'Gateway menolak permintaan.');
  return payload;
}

type BarisPerangkat = { name?: string; device?: string; status?: string; token?: string };

export async function daftarPerangkat(): Promise<Perangkat[]> {
  const payload = await panggil('/get-devices', tokenAkun());
  const rows = Array.isArray(payload.data) ? payload.data as BarisPerangkat[] : [];
  return rows.map((row) => ({
    nama: String(row.name ?? ''),
    nomor: String(row.device ?? ''),
    terhubung: row.status === 'connect',
    token: String(row.token ?? ''),
  }));
}

export async function tambahPerangkat(nama: string, nomor: string): Promise<void> {
  await panggil('/add-device', tokenAkun(), { name: nama, device: nomor });
}

export async function hapusPerangkat(nomor: string): Promise<void> {
  await panggil('/delete-device', tokenAkun(), { device: nomor });
}

export async function putuskanPerangkat(token: string): Promise<void> {
  await panggil('/disconnect', token);
}

/**
 * QR hanya hidup beberapa detik dan hanya ada saat perangkat belum terhubung.
 * Kedua kondisi itu normal, bukan galat — kembalikan alasannya agar UI bisa
 * menampilkan "sudah terhubung" atau menyuruh coba lagi.
 */
export async function ambilQr(token: string): Promise<{ url?: string; alasan?: string }> {
  try {
    const payload = await panggil('/qr', token);
    return { url: typeof payload.url === 'string' ? payload.url : undefined };
  } catch (error) {
    return { alasan: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Token pengirim untuk `kirimWa`. Bila `WA_GATEWAY_TOKEN` tidak diisi, pakai
 * perangkat pertama yang berstatus terhubung — supaya menambah perangkat lewat
 * QR langsung membuat pengiriman jalan tanpa perlu menyunting env dan restart.
 */
export async function tokenPengirim(): Promise<string | null> {
  const statis = process.env.WA_GATEWAY_TOKEN;
  if (statis) return statis;
  try {
    const perangkat = await daftarPerangkat();
    return perangkat.find((item) => item.terhubung)?.token ?? null;
  } catch (error) {
    log('warn', 'Gagal menentukan perangkat pengirim WhatsApp', { error: String(error) });
    return null;
  }
}
