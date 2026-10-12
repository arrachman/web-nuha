import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { whereAsetTerlihat, type IzinSarpras } from '@/lib/aset/akses';
import { TEMPLAT_PEMELIHARAAN } from '@/lib/aset/konstanta';
import { Button, FormField, Input, Kosong, Select, Tabel } from '@/components';
import { buatTugasPemeliharaan, selesaikanPemeliharaan } from './actions';
import { BadgeStatus, Kembali } from './Kembali';
import { petugasTeknis } from './data';

const K = '/sarpras?tab=pemeliharaan';

/** Pemeliharaan terjadwal + pengingat H-7 (04 §6.4). Tugas terlewat tampil merah. */
export async function TabPemeliharaan({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const pengelola = izin.asset_manage || isSuperAdmin(session);
  const whereAset = await whereAsetTerlihat(session, izin);
  const [tugas, aset, petugas] = await Promise.all([
    prisma.maintenanceTask.findMany({
      where: { status: { in: ['Terjadwal', 'Terlewat'] }, ...(pengelola ? { OR: [{ asset: whereAset }, { assetId: null }] } : { assignedTo: BigInt(session.userId) }) },
      include: { asset: { include: { location: true } } }, orderBy: { dueDate: 'asc' },
    }),
    pengelola ? prisma.asset.findMany({ where: { ...whereAset, status: { not: 'Dihapus' } }, orderBy: { name: 'asc' }, select: { id: true, name: true, inventoryCode: true } }) : Promise.resolve([]),
    petugasTeknis(),
  ]);
  const namaPetugas = new Map(petugas.map((p) => [String(p.id), p.person.fullName]));
  const hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pengelola && (
        <div className="card">
          <h3 className="card-judul">Jadwalkan pemeliharaan</h3>
          <form action={buatTugasPemeliharaan} className="grid g3">
            <Kembali ke={K} />
            <FormField label="Judul *" htmlFor="title"><Input id="title" name="title" required list="templat-pemeliharaan" placeholder="mis. Servis AC" /></FormField>
            <datalist id="templat-pemeliharaan">{TEMPLAT_PEMELIHARAAN.map((t) => <option key={t.title} value={t.title}>{`tiap ${t.intervalDays} hari`}</option>)}</datalist>
            <FormField label="Aset" htmlFor="assetId">
              <Select id="assetId" name="assetId"><option value="">— umum / tanpa aset —</option>{aset.map((a) => <option key={String(a.id)} value={String(a.id)}>{a.name} ({a.inventoryCode})</option>)}</Select>
            </FormField>
            <FormField label="Jatuh tempo *" htmlFor="dueDate"><Input id="dueDate" name="dueDate" type="date" required /></FormField>
            <FormField label="Ulang tiap (hari)" htmlFor="intervalDays"><Input id="intervalDays" name="intervalDays" type="number" min={1} placeholder="kosong = sekali" /></FormField>
            <FormField label="Ingatkan H-" htmlFor="remindDaysBefore"><Input id="remindDaysBefore" name="remindDaysBefore" type="number" min={0} defaultValue={7} /></FormField>
            <FormField label="Petugas" htmlFor="assignedTo">
              <Select id="assignedTo" name="assignedTo"><option value="">—</option>{petugas.map((p) => <option key={String(p.id)} value={String(p.id)}>{p.person.fullName}</option>)}</Select>
            </FormField>
            <div className="field"><Button type="submit">Jadwalkan</Button></div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Jadwal pemeliharaan</h3>
        {tugas.length === 0 ? <Kosong pesan="Tidak ada tugas pemeliharaan terjadwal." /> : (
          <Tabel kolom={['Jatuh tempo', 'Tugas', 'Aset / lokasi', 'Ulang', 'Petugas', 'Status', 'Aksi']}>
            {tugas.map((t) => {
              const lewat = t.dueDate < hariIni;
              const dekat = !lewat && t.dueDate.getTime() - hariIni.getTime() <= t.remindDaysBefore * 86_400_000;
              return (
                <tr key={String(t.id)} data-testid={`tugas-${t.id}`}>
                  <td style={{ color: lewat ? '#B91C1C' : dekat ? '#B45309' : undefined, fontWeight: lewat || dekat ? 700 : undefined }}>{t.dueDate.toLocaleDateString('id-ID')}</td>
                  <td>{t.title}</td>
                  <td>{t.asset ? `${t.asset.name}${t.asset.location ? ` · ${t.asset.location.name}` : ''}` : '-'}</td>
                  <td>{t.intervalDays ? `${t.intervalDays} hari` : 'sekali'}</td>
                  <td>{t.assignedTo ? namaPetugas.get(String(t.assignedTo)) ?? '-' : '-'}</td>
                  <td><BadgeStatus status={lewat ? 'Terlewat' : t.status} /></td>
                  <td>
                    <form action={selesaikanPemeliharaan} style={{ display: 'flex', gap: 6 }}>
                      <Kembali ke={K} /><Input type="hidden" name="id" value={String(t.id)} />
                      <Input name="cost" type="number" min={0} placeholder="Biaya" style={{ width: 90, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--garis)' }} />
                      <Button type="submit" varian="sekunder" style={{ fontSize: 12 }}>Tandai selesai</Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </div>
    </div>
  );
}
