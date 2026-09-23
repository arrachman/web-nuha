import QRCode from 'qrcode';
import { headers } from 'next/headers';

/** Origin publik untuk isi QR — APP_URL bila diset (produksi), selain itu dari header request. */
export async function originPublik(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3226';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** SVG QR (string) untuk path relatif, mis. `/a/<token>` atau `/r/<token>`. */
export async function qrSvg(pathRelatif: string, lebar = 120): Promise<string> {
  const url = `${await originPublik()}${pathRelatif}`;
  return QRCode.toString(url, { type: 'svg', margin: 1, width: lebar, errorCorrectionLevel: 'M' });
}
