import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong } from '@/components';
import { setujuiKunjungan, tolakKunjungan, checkoutKunjungan } from './actions';

/** Kartu kunjungan hari ini: verifikasi pengajuan atau check-out yang sedang berkunjung. */
export async function TabHari() {
  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);
  const akhirHari = new Date(awalHari);
  akhirHari.setDate(akhirHari.getDate() + 1);

  const kunjungan = await prisma.kunjungan.findMany({
    where: { tgl: { gte: awalHari, lt: akhirHari } },
    include: { santri: { include: { person: true } } },
    orderBy: { id: 'desc' },
  });

  if (kunjungan.length === 0) return <Kosong pesan="Belum ada kunjungan hari ini." />;

  return (
    <section className="grid g2">
      {kunjungan.map((k) => {
        const perluAksi = k.status === 'Menunggu verifikasi';
        const diArea = k.status === 'Sedang berkunjung';
        return (
          <div key={String(k.id)} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar nama={k.namaWali} size={34} />
              <div style={{ flex: 1, minWidth: 130 }}>
                <div style={{ fontWeight: 600 }}>{k.namaWali}</div>
                <div className="muted">{k.hubungan ?? '-'} dari {k.santri.person.fullName}</div>
              </div>
              <Badge status={k.status} />
            </div>
            <div style={{ fontSize: 13 }}>
              {k.keperluan ?? '-'}
            </div>
            <div className="muted" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Masuk: <strong>{k.jamMasuk ?? '-'}</strong></span>
              <span>Keluar: <strong>{k.jamKeluar ?? '-'}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {perluAksi && (
                <>
                  <form action={setujuiKunjungan}><input type="hidden" name="id" value={String(k.id)} /><button className="btn" type="submit">Setujui + WA</button></form>
                  <form action={tolakKunjungan}><input type="hidden" name="id" value={String(k.id)} /><button className="btn btn-sekunder" type="submit">Tolak</button></form>
                </>
              )}
              {diArea && (
                <form action={checkoutKunjungan}><input type="hidden" name="id" value={String(k.id)} /><button className="btn btn-sekunder" type="submit">Check-out</button></form>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
