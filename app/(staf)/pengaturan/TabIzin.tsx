import { prisma } from '@/lib/prisma';
import { Button, ButtonLink, Input, satu, type SearchParams } from '@/components';
import { simpanMatriksIzin } from './actions';

const MODUL_UTAMA = ['presensi', 'sarpras', 'rekrutmen'];
const PERAN_PORTAL = ['santri', 'wali', 'superadmin'];

/**
 * Matriks peran × izin (01 §3.3): satu modul per halaman supaya tabel tetap
 * terbaca. Super admin tidak ditampilkan — selalu lolos semua izin.
 */
export async function TabIzin({ sp }: { sp: SearchParams }) {
  const semua = await prisma.permission.findMany({ select: { menuKey: true }, distinct: ['menuKey'] });
  const modul = [...MODUL_UTAMA, ...semua.map((m) => m.menuKey).filter((k): k is string => !!k && !MODUL_UTAMA.includes(k)).sort()];
  const dipilih = modul.includes(satu(sp.modul)) ? satu(sp.modul) : modul[0];
  const [izin, roles] = await Promise.all([
    prisma.permission.findMany({ where: { menuKey: dipilih }, include: { roles: true }, orderBy: { key: 'asc' } }),
    prisma.role.findMany({ where: { key: { notIn: PERAN_PORTAL } }, orderBy: { key: 'asc' } }),
  ]);

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {modul.map((m) => <ButtonLink key={m} href={`/pengaturan?tab=izin&modul=${m}`} varian="chip" aktif={m === dipilih}>{m}</ButtonLink>)}
      </div>
      <form action={simpanMatriksIzin}>
        <Input type="hidden" name="_kembali" value={`/pengaturan?tab=izin&modul=${dipilih}`} />
        <Input type="hidden" name="menuKey" value={dipilih} />
        <div className="tabel-wrap">
          <table data-testid="matriks-izin">
            <thead>
              <tr>
                <th>Izin</th>
                {roles.map((r) => <th key={r.id} style={{ textAlign: 'center', fontSize: 11, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }} title={r.name}>{r.key}</th>)}
              </tr>
            </thead>
            <tbody>
              {izin.map((p) => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.key}</div><div className="muted" style={{ fontSize: 11.5 }}>{p.label}</div></td>
                  {roles.map((r) => (
                    <td key={r.id} style={{ textAlign: 'center' }}>
                      <Input type="checkbox" name="rp" value={`${p.id}:${r.id}`} defaultChecked={p.roles.some((x) => x.roleId === r.id)} aria-label={`${r.key} ${p.key}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <Button type="submit">Simpan matriks {dipilih}</Button>
          <span className="muted" style={{ fontSize: 12 }}>Perubahan dicatat di audit (daftar yang ditambah/dicabut).</span>
        </div>
      </form>
    </div>
  );
}
