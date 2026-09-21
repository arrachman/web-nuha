import { prisma } from '@/lib/prisma';
import { rupiah } from '@/lib/gaji';
import { Badge, Kosong } from '@/components';
import { konfirmasiPembayaranWali } from '../actions';

const METODE_OPTS = ['Transfer bank', 'QRIS', 'Tunai di kantor'];

export async function TabBayar({ santriId }: { santriId: bigint }) {
  const [belumLunas, riwayat] = await Promise.all([
    prisma.invoice.findMany({ where: { santriId }, orderBy: { dueDate: 'asc' } }),
    prisma.payment.findMany({ where: { invoice: { santriId } }, orderBy: { date: 'desc' }, take: 5, include: { invoice: true } }),
  ]);
  const belumLunasFiltered = belumLunas.filter((t) => Number(t.paidAmount) < Number(t.amount));

  return (
    <>
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Yang perlu dibayar</div>
        {belumLunasFiltered.length === 0 && <Kosong pesan="Tidak ada tagihan tertunda. Semua sudah lunas." />}
        {belumLunasFiltered.map((t) => (
          <div key={String(t.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '11px 12px', borderRadius: 11, background: '#FAF8F3', border: '1px solid #F0EDE4', flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937' }}>{t.type} · {t.period}</div>
              <div style={{ fontSize: 12, color: '#0A4A2B', fontWeight: 700, marginTop: 2 }}>Sisa {rupiah(Number(t.amount) - Number(t.paidAmount))}</div>
            </div>
            <Badge status={Number(t.paidAmount) > 0 ? 'Sebagian' : 'Belum bayar'} />
          </div>
        ))}
      </div>

      {belumLunasFiltered.length > 0 && (
        <form action={konfirmasiPembayaranWali} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600 }}>Form pembayaran</div>
          <input type="hidden" name="santriId" value={String(santriId)} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Tagihan yang dibayar</span>
            <select name="invoiceId" required style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FFF', fontSize: 13 }}>
              {belumLunasFiltered.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>{t.type} · {t.period} · sisa {rupiah(Number(t.amount) - Number(t.paidAmount))}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Nominal (Rp)</span>
            <input type="number" name="amount" min={1} required placeholder="1350000" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Metode pembayaran</span>
            <select name="method" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FFF', fontSize: 13 }}>
              {METODE_OPTS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Nomor referensi / bukti transfer</span>
            <input name="bukti" placeholder="Contoh: TRF/BSI/220826/8841" style={{ padding: '11px 12px', borderRadius: 10, border: '1px solid #E8E3D9', background: '#FAF8F3', fontSize: 13 }} />
          </label>
          <button className="btn" type="submit">Kirim konfirmasi pembayaran</button>
        </form>
      )}

      <div style={{ padding: '13px 15px', borderRadius: 12, background: '#FFFBEB', border: '1px solid #F0CFA4', fontSize: 12, color: '#6B5A18', lineHeight: 1.6, marginTop: 14 }}>
        Rekening resmi: <strong>BSI 7011-2345-6789</strong> a.n. PPSS Nurul Huda Mergosono. Yayasan tidak pernah meminta transfer ke rekening pribadi.
      </div>

      {riwayat.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderRadius: 14, padding: 16, marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 15, color: '#0A4A2B', fontWeight: 600, marginBottom: 10 }}>Konfirmasi yang Anda kirim</div>
          {riwayat.map((b) => (
            <div key={String(b.id)} style={{ padding: '12px 13px', borderRadius: 11, background: '#F1F7F3', border: '1px solid #D7E9DE', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0A4A2B' }}>{rupiah(Number(b.amount))}</span>
                <span style={{ fontSize: 11.5, color: '#6B7280' }}>{b.reference ?? '-'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#4B5563', marginTop: 3 }}>{b.invoice.type} · {b.invoice.period}</div>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>{b.method} · {b.date.toLocaleDateString('id-ID')}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
