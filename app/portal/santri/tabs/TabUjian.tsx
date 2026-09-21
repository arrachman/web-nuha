import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';
import { mulaiKerja } from '@/app/(staf)/ujian/peserta-actions';

const waktu = (d: Date) => d.toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Daftar sesi CBT milik santri ini saja. Token tidak pernah ditampilkan di
 * layar — pengawas mendiktekannya saat sesi dibuka.
 */
export async function TabUjian({ santriId }: { santriId: bigint }) {
  const peserta = await prisma.pesertaCbt.findMany({
    where: { santriId },
    include: { sesi: { include: { paket: { include: { mapel: true } } } } },
    orderBy: { sesi: { mulai: 'desc' } },
  });

  if (peserta.length === 0) return <Kosong pesan="Belum ada sesi ujian untuk Anda." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {peserta.map((p) => {
        const { sesi } = p;
        const berjalan = sesi.status === 'Berjalan';
        return (
          <div key={String(p.id)} className="card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 16, color: '#0A4A2B', fontWeight: 600 }}>{sesi.paket.mapel.nama}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                  {sesi.kode} · {waktu(sesi.mulai)} · {sesi.paket.durasi} menit · No. {p.noPeserta}
                </div>
              </div>
              <Badge status={p.status} />
              <Badge status={sesi.status} />
            </div>

            {p.status === 'Dibekukan' && (
              <div className="alert alert-kritis" style={{ marginTop: 12 }}>
                Sesi Anda dibekukan karena {p.pelanggaran} pelanggaran. Hubungi pengawas untuk dibuka kembali.
              </div>
            )}

            {p.status === 'Selesai' && (
              <div className="alert alert-info" style={{ marginTop: 12 }}>
                Sudah selesai{sesi.paket.tampilHasil ? ` · skor ${Number(p.skor)} (benar ${p.benar}, salah ${p.salah}, kosong ${p.kosong})` : '. Hasil diumumkan kemudian.'}
              </div>
            )}

            {p.status === 'Mengerjakan' && berjalan && (
              <Link href={`/portal/santri/ujian/${p.id}`} className="btn" style={{ marginTop: 12, display: 'inline-block' }}>
                Lanjutkan mengerjakan
              </Link>
            )}

            {p.status === 'Belum' && berjalan && (
              <form action={mulaiKerja} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="hidden" name="pesertaId" value={String(p.id)} />
                <input
                  name="token"
                  required
                  maxLength={6}
                  placeholder="Token sesi"
                  autoComplete="off"
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #E8E3D9', letterSpacing: 3, textTransform: 'uppercase', width: 150, fontWeight: 700 }}
                />
                <button type="submit" className="btn">Masuk ujian</button>
                <span style={{ fontSize: 11.5, color: '#6B7280' }}>Token didiktekan pengawas.</span>
              </form>
            )}

            {p.status === 'Belum' && !berjalan && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>Sesi belum dibuka pengawas.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
