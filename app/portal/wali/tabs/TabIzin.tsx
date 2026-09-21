import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';

const WARNA_STATUS: Record<string, string> = { Menunggu: '#E8973A', Disetujui: '#1D4ED8', Ditolak: '#B91C1C', Selesai: '#0F6B3D' };

/** Read-only: pengajuan izin baru dilakukan lewat musyrif asrama, bukan dari portal wali. */
export async function TabIzin({ santriId }: { santriId: bigint }) {
  const izin = await prisma.leavePermit.findMany({ where: { studentId: santriId }, orderBy: { departedAt: 'desc' }, take: 15 });

  return (
    <>
      {izin.length === 0 && <Kosong pesan="Belum ada riwayat izin." />}
      {izin.map((z) => (
        <div key={String(z.id)} style={{ background: '#FFFFFF', border: '1px solid #E8E3D9', borderLeft: `4px solid ${WARNA_STATUS[z.status] ?? '#6B7280'}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{z.code}</span>
            <Badge status={z.status} />
          </div>
          <div style={{ fontSize: 12.5, color: '#374151', marginTop: 6, lineHeight: 1.6 }}>{z.type} · {z.reason}</div>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 5 }}>Keluar {z.departedAt.toLocaleDateString('id-ID')} → kembali {z.returnedAt ? z.returnedAt.toLocaleDateString('id-ID') : 'belum'}</div>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3 }}>Penjemput: {z.pickupBy ?? '-'}</div>
        </div>
      ))}
      <div style={{ padding: '13px 15px', borderRadius: 12, background: '#F1F7F3', border: '1px solid #D7E9DE', fontSize: 12, color: '#0A4A2B', lineHeight: 1.6 }}>
        Pengajuan izin baru diajukan santri lewat portal santri atau musyrif asrama; wali menerima notifikasi saat izin disetujui pengasuh.
      </div>
    </>
  );
}
