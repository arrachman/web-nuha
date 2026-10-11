import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { getUnitAktif, whereUnitAktif } from '@/lib/unit-scope';
import { Kosong, Tabel } from '@/components';
import { bukaOpname } from './actions';
import { BadgeStatus, Kembali } from './Kembali';
import { lokasiPilihan, unitDalamCakupan } from './data';

/** Stock opname / sensus aset (04 §6.5) — dibuka per unit atau per ruang. */
export async function TabOpname({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const unitAktif = await getUnitAktif(session);
  const scope = whereUnitAktif(session, unitAktif);
  const [units, lokasi, daftar] = await Promise.all([
    unitDalamCakupan(session),
    lokasiPilihan(session, true),
    prisma.stockOpname.findMany({ where: Object.keys(scope).length ? { OR: [scope, { unitId: null }] } : {}, include: { lines: { select: { found: true } } }, orderBy: { startedAt: 'desc' }, take: 30 }),
  ]);
  const namaUnit = new Map(units.map((u) => [u.id, u.nama]));
  const namaLokasi = new Map(lokasi.map((l) => [l.id, l.name]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.opname_run && (
        <div className="card">
          <h3 className="card-judul">Buka opname baru</h3>
          <form action={bukaOpname} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <Kembali ke="/sarpras?tab=opname" />
            <div className="field" style={{ marginBottom: 0 }}><label>Unit</label><select name="unitId"><option value="">—</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></div>
            <div className="field" style={{ marginBottom: 0 }}><label>atau ruang</label><select name="locationId"><option value="">—</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
            <button type="submit" className="btn">Buka opname</button>
          </form>
        </div>
      )}
      <div className="card">
        <h3 className="card-judul">Daftar opname</h3>
        {daftar.length === 0 ? <Kosong pesan="Belum ada opname." /> : (
          <Tabel kolom={['Kode', 'Cakupan', 'Dibuka', 'Progres', 'Status', 'Aksi']}>
            {daftar.map((o) => {
              const dicek = o.lines.filter((l) => l.found !== null).length;
              return (
                <tr key={String(o.id)}>
                  <td>{o.code}</td>
                  <td>{[o.unitId ? namaUnit.get(o.unitId) : null, o.locationId ? namaLokasi.get(o.locationId) : null].filter(Boolean).join(' · ') || '-'}</td>
                  <td>{o.startedAt.toLocaleDateString('id-ID')}</td>
                  <td>{dicek}/{o.lines.length} aset · {o.lines.filter((l) => l.found === false).length} tidak ditemukan</td>
                  <td><BadgeStatus status={o.status} /></td>
                  <td><Link className="btn-sekunder" href={`/sarpras/opname/${o.id}`}>{o.status === 'Berjalan' ? 'Lanjutkan' : 'Lihat hasil'}</Link></td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </div>
    </div>
  );
}
