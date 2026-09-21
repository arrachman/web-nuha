import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { recordAudit, type AuditActor } from '@/lib/audit';
import { tokenPengirim } from '@/lib/wa-gateway';

export function normalizeTarget(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) throw new Error('Nomor WhatsApp tidak valid.');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

/**
 * Pengalihan nomor tujuan saat debugging. Selama `WA_DEBUG_REDIRECT` terisi,
 * SELURUH pesan dialihkan ke nomor itu — tidak ada wali santri yang menerima
 * apa pun. Ini disengaja: data client sudah nyata, jadi salah kirim berarti
 * pesan sungguhan masuk ke nomor orang tua sungguhan.
 *
 * Berlaku terlepas dari `WA_DRY_RUN` supaya pengiriman sungguhan tetap bisa
 * diuji dengan aman. Nomor tujuan asli tetap dikembalikan agar log tetap
 * berguna — yang dialihkan hanya nomor yang benar-benar dikirimi.
 *
 * **Wajib dikosongkan sebelum produksi.**
 */
export function alihkanNomorDebug(nomorAsli: string): { nomorKirim: string; dialihkanDari?: string } {
  const redirect = process.env.WA_DEBUG_REDIRECT?.trim();
  if (!redirect) return { nomorKirim: nomorAsli };
  const tujuanDebug = normalizeTarget(redirect);
  if (tujuanDebug === nomorAsli) return { nomorKirim: nomorAsli };
  return { nomorKirim: tujuanDebug, dialihkanDari: nomorAsli };
}

export function renderTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => String(values[key] ?? ''));
}

type SendWaParams = {
  nomor: string;
  tujuan: string;
  isi: string;
  templateId?: number;
  actor?: AuditActor | null;
  ip?: string | null;
};

type GatewayResponse = { status?: boolean; id?: string; reason?: string };

export async function kirimWa(params: SendWaParams) {
  const nomor = normalizeTarget(params.nomor);
  const { nomorKirim, dialihkanDari } = alihkanNomorDebug(nomor);
  const dryRun = (process.env.WA_DRY_RUN ?? 'true').toLowerCase() === 'true';
  let status = dryRun ? 'Dry-run' : 'Gagal';
  let messageId: string | undefined;
  let error: string | undefined;

  if (!dryRun) {
    const url = process.env.WA_GATEWAY_URL;
    // Token perangkat boleh datang dari QR yang baru saja dipindai, bukan hanya
    // dari env — lihat `tokenPengirim`.
    const token = await tokenPengirim();
    if (!url) error = 'WA_GATEWAY_URL belum dikonfigurasi.';
    else if (!token) error = 'Belum ada perangkat WhatsApp yang terhubung. Pindai QR di Notifikasi → Perangkat.';
    else {
      try {
        const isiKirim = dialihkanDari
          ? `[UJI COBA — pesan ini seharusnya untuk ${dialihkanDari}]\n\n${params.isi}`
          : params.isi;
        const form = new URLSearchParams({ target: nomorKirim, message: isiKirim });
        const response = await fetch(`${url.replace(/\/$/, '')}/send`, {
          method: 'POST',
          headers: { Authorization: token, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
          signal: AbortSignal.timeout(15_000),
        });
        const payload = await response.json() as GatewayResponse;
        if (response.ok && payload.status === true) {
          status = 'Terkirim';
          messageId = payload.id;
        } else error = payload.reason ?? `Gateway HTTP ${response.status}`;
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught);
      }
    }
  }

  const entry = await prisma.waLog.create({
    data: { templateId: params.templateId, recipient: params.tujuan, phone: nomor, content: params.isi, status, messageId, error },
  });
  await recordAudit({
    aksi: 'KIRIM_WA',
    entitas: 'log_wa',
    entitasId: String(entry.id),
    ringkasan: dialihkanDari
      ? `${status}: WA untuk ${params.tujuan} DIALIHKAN dari ${dialihkanDari} ke ${nomorKirim} (WA_DEBUG_REDIRECT aktif)`
      : `${status}: WA ke ${nomor} untuk ${params.tujuan}`,
    perubahan: { status, messageId, error, nomorKirim, dialihkanDari },
    aktor: params.actor,
    ip: params.ip,
  });
  log(error ? 'warn' : 'info', 'Pengiriman WhatsApp selesai', { nomor, status, messageId, error });
  return { entry, ok: status === 'Terkirim' || status === 'Dry-run', error };
}
