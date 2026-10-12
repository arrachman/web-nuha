import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { LABEL_KONDISI, STATUS_PINJAM_AKTIF } from '@/lib/aset/konstanta';
import { Button, FormField, Input, Kosong, Select, Tabel } from '@/components';
import { ajukanPinjam, batalkanPinjam, kembalikanPinjam, putuskanPinjam, serahkanPinjam } from './actions';
import { BadgeStatus, FormKeputusan, Kembali } from './Kembali';

const K = '/sarpras?tab=peminjaman';
const gaya = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' } as const;
const waktu = (d: Date) => d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Peminjaman aset & pemesanan ruang (04 §6.3). Bentrok waktu ditolak di server. */
export async function TabPeminjaman({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const saya = BigInt(session.userId);
  const includeLoan = { borrower: { include: { person: true } }, items: { include: { asset: true, location: true } } } as const;
  const duaMinggu = new Date(Date.now() + 14 * 86_400_000);
  const [aset, ruang, milikSaya, semua, kalender] = await Promise.all([
    prisma.asset.findMany({ where: { isBorrowable: true, status: { in: ['Aktif', 'Dipinjam'] }, deletedAt: null }, include: { location: true }, orderBy: { name: 'asc' } }),
    prisma.assetLocation.findMany({ where: { isActive: true, type: { in: ['Ruang', 'Area'] }, roomUsage: { in: ['Aula', 'Lab', 'Ibadah', 'Kelas', 'Perpustakaan'] } }, orderBy: { name: 'asc' } }),
    prisma.assetLoan.findMany({ where: { borrowerUserId: saya }, include: includeLoan, orderBy: { startAt: 'desc' }, take: 20 }),
    izin.loan_approve ? prisma.assetLoan.findMany({ where: { status: { in: STATUS_PINJAM_AKTIF } }, include: includeLoan, orderBy: { startAt: 'asc' } }) : Promise.resolve([]),
    prisma.assetLoan.findMany({ where: { status: { in: ['Disetujui', 'Dipinjam', 'Terlambat'] }, startAt: { lt: duaMinggu }, endAt: { gt: new Date() } }, include: includeLoan, orderBy: { startAt: 'asc' } }),
  ]);

  const namaItem = (l: (typeof milikSaya)[number]) => l.items.map((i) => i.asset?.name ?? i.location?.name).filter(Boolean).join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.loan_request && (
        <div className="card">
          <h3 className="card-judul">Ajukan peminjaman aset / pemesanan ruang</h3>
          <form action={ajukanPinjam}>
            <Kembali ke={K} />
            <div className="grid g3">
              <FormField label="Mulai *" htmlFor="startAt"><Input id="startAt" type="datetime-local" name="startAt" required /></FormField>
              <FormField label="Selesai *" htmlFor="endAt"><Input id="endAt" type="datetime-local" name="endAt" required /></FormField>
              <FormField label="Keperluan *" htmlFor="purpose"><Input id="purpose" name="purpose" required placeholder="mis. Rapat wali santri" /></FormField>
            </div>
            <div className="grid g2">
              <fieldset style={{ border: '1px solid var(--garis)', borderRadius: 10, padding: 10 }}>
                <legend style={{ fontSize: 13, fontWeight: 600 }}>Aset yang bisa dipinjam</legend>
                {aset.length === 0 ? <span className="muted">Tidak ada.</span> : aset.map((a) => (
                  <label key={String(a.id)} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '3px 0' }}>
                    <Input type="checkbox" name="assetIds" value={String(a.id)} /> {a.name} <span className="muted">({a.location?.name ?? 'gudang'})</span>
                  </label>
                ))}
              </fieldset>
              <fieldset style={{ border: '1px solid var(--garis)', borderRadius: 10, padding: 10 }}>
                <legend style={{ fontSize: 13, fontWeight: 600 }}>Ruang</legend>
                {ruang.map((r) => (
                  <label key={r.id} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '3px 0' }}>
                    <Input type="checkbox" name="locationIds" value={r.id} /> {r.name} <span className="muted">({r.roomUsage}{r.capacity ? `, ${r.capacity} org` : ''})</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <Button type="submit" style={{ marginTop: 12 }}>Ajukan peminjaman</Button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Jadwal terpakai 14 hari ke depan</h3>
        {kalender.length === 0 ? <Kosong pesan="Belum ada jadwal pemakaian." /> : (
          <Tabel kolom={['Waktu', 'Aset / ruang', 'Peminjam', 'Status']}>
            {kalender.map((l) => <tr key={String(l.id)}><td>{waktu(l.startAt)} – {waktu(l.endAt)}</td><td>{namaItem(l)}</td><td>{l.borrower.person.fullName}</td><td><BadgeStatus status={l.status} /></td></tr>)}
          </Tabel>
        )}
      </div>

      <div className="card">
        <h3 className="card-judul">Peminjaman saya</h3>
        {milikSaya.length === 0 ? <Kosong pesan="Anda belum pernah meminjam." /> : (
          <Tabel kolom={['Kode', 'Item', 'Waktu', 'Status', 'Aksi']}>
            {milikSaya.map((l) => (
              <tr key={String(l.id)}>
                <td>{l.code}</td><td>{namaItem(l)}<div className="muted" style={{ fontSize: 11.5 }}>{l.purpose}</div></td>
                <td>{waktu(l.startAt)} – {waktu(l.endAt)}</td><td><BadgeStatus status={l.status} /></td>
                <td>{['Diajukan', 'Disetujui'].includes(l.status) && (
                  <form action={batalkanPinjam}><Kembali ke={K} /><Input type="hidden" name="id" value={String(l.id)} /><Button type="submit" varian="sekunder" style={{ fontSize: 12 }}>Batalkan</Button></form>
                )}</td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>

      {izin.loan_approve && (
        <div className="card">
          <h3 className="card-judul">Kelola peminjaman aktif</h3>
          {semua.length === 0 ? <Kosong pesan="Tidak ada peminjaman aktif." /> : (
            <Tabel kolom={['Kode', 'Peminjam', 'Item', 'Waktu', 'Status', 'Aksi']}>
              {semua.map((l) => {
                const telat = l.status === 'Dipinjam' && l.endAt < new Date();
                return (
                  <tr key={String(l.id)} data-testid={`pinjam-${l.code}`}>
                    <td>{l.code}</td><td>{l.borrower.person.fullName}</td><td>{namaItem(l)}</td>
                    <td>{waktu(l.startAt)} – {waktu(l.endAt)}</td><td><BadgeStatus status={telat ? 'Terlambat' : l.status} /></td>
                    <td>
                      {l.status === 'Diajukan' && <FormKeputusan action={putuskanPinjam} id={String(l.id)} kembali={K} kecil />}
                      {l.status === 'Disetujui' && (
                        <form action={serahkanPinjam}><Kembali ke={K} /><Input type="hidden" name="id" value={String(l.id)} /><Button type="submit" varian="sekunder" style={{ fontSize: 12 }}>Serahkan</Button></form>
                      )}
                      {['Dipinjam', 'Terlambat'].includes(l.status) && (
                        <form action={kembalikanPinjam} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Kembali ke={K} /><Input type="hidden" name="id" value={String(l.id)} />
                          <Select name="returnCondition" style={gaya}>{Object.entries(LABEL_KONDISI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                          <Input name="returnNote" placeholder="Catatan" style={{ ...gaya, width: 120 }} />
                          <Button type="submit" varian="sekunder" style={{ fontSize: 12 }}>Kembalikan</Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Tabel>
          )}
        </div>
      )}
    </div>
  );
}
