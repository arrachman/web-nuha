import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { JENIS_RUANG, LABEL_KONDISI } from '@/lib/aset/konstanta';
import { getUnitAktif, whereUnitAktif } from '@/lib/unit-scope';
import { Button, ButtonLink, FormField, Input, Kosong, Select, Tabel } from '@/components';
import { bangkitkanLokasiDariData, simpanLokasi } from './actions';
import { BadgeKondisi, Kembali } from './Kembali';
import { stafPilihan, unitDalamCakupan } from './data';

/** Pohon lokasi (kampus → gedung → lantai → ruang). Unit null = ruang bersama (masjid, aula). */
export async function TabLokasi({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const unitAktif = await getUnitAktif(session);
  const scope = whereUnitAktif(session, unitAktif);
  const [lokasi, jumlahAset, units, staf] = await Promise.all([
    prisma.assetLocation.findMany({
      where: Object.keys(scope).length ? { OR: [scope, { unitId: null }] } : {},
      include: { unit: true }, orderBy: { code: 'asc' },
    }),
    prisma.asset.groupBy({ by: ['locationId'], where: { status: { not: 'Dihapus' } }, _count: { _all: true } }),
    unitDalamCakupan(session),
    izin.location_manage ? stafPilihan() : Promise.resolve([]),
  ]);
  const staffIds = lokasi.map((l) => l.picStaffId).filter((x): x is bigint => x != null);
  const pic = new Map((await prisma.staff.findMany({ where: { id: { in: staffIds } }, include: { person: true } })).map((s) => [String(s.id), s.person.fullName]));

  // Urutkan sebagai pohon: induk lalu anak-anaknya (kedalaman untuk indentasi).
  const anak = new Map<number | null, typeof lokasi>();
  for (const l of lokasi) {
    const induk = l.parentId && lokasi.some((x) => x.id === l.parentId) ? l.parentId : null;
    anak.set(induk, [...(anak.get(induk) ?? []), l]);
  }
  const pohon: Array<{ l: (typeof lokasi)[number]; d: number }> = [];
  const jelajah = (induk: number | null, d: number) => { for (const l of anak.get(induk) ?? []) { pohon.push({ l, d }); jelajah(l.id, d + 1); } };
  jelajah(null, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.location_manage && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <h3 className="card-judul" style={{ marginBottom: 0 }}>Tambah lokasi</h3>
            <form action={bangkitkanLokasiDariData}>
              <Kembali ke="/sarpras?tab=lokasi" />
              <Button type="submit" varian="sekunder">Bangkitkan dari data kelas & kamar asrama</Button>
            </form>
          </div>
          <form action={simpanLokasi} className="grid g3" style={{ marginTop: 12 }}>
            <Kembali ke="/sarpras?tab=lokasi" />
            <FormField label="Kode *" htmlFor="code"><Input id="code" name="code" required placeholder="mis. G-A.2.05" /></FormField>
            <FormField label="Nama *" htmlFor="name"><Input id="name" name="name" required placeholder="mis. Kelas 8B" /></FormField>
            <FormField label="Tipe *" htmlFor="type">
              <Select id="type" name="type" defaultValue="Ruang">{['Kampus', 'Gedung', 'Lantai', 'Ruang', 'Area'].map((t) => <option key={t}>{t}</option>)}</Select>
            </FormField>
            <FormField label="Induk" htmlFor="parentId">
              <Select id="parentId" name="parentId"><option value="">— tidak ada —</option>{lokasi.filter((l) => l.type !== 'Ruang').map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}</Select>
            </FormField>
            <FormField label="Unit pengelola" htmlFor="unitId">
              <Select id="unitId" name="unitId"><option value="">Bersama (tanpa unit)</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</Select>
            </FormField>
            <FormField label="Jenis ruang (Dapodik)" htmlFor="roomUsage">
              <Select id="roomUsage" name="roomUsage"><option value="">—</option>{JENIS_RUANG.map((j) => <option key={j}>{j}</option>)}</Select>
            </FormField>
            <FormField label="Luas (m²)" htmlFor="areaM2"><Input id="areaM2" name="areaM2" type="number" min={0} step="0.01" /></FormField>
            <FormField label="Kapasitas" htmlFor="capacity"><Input id="capacity" name="capacity" type="number" min={0} /></FormField>
            <FormField label="Kondisi ruang" htmlFor="condition">
              <Select id="condition" name="condition"><option value="">—</option>{Object.entries(LABEL_KONDISI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </FormField>
            <FormField label="Penanggung jawab (PIC)" htmlFor="picStaffId">
              <Select id="picStaffId" name="picStaffId"><option value="">—</option>{staf.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>)}</Select>
            </FormField>
            <div className="field" style={{ alignSelf: 'end' }}><Button type="submit">Simpan lokasi</Button></div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Pohon lokasi</h3>
        {pohon.length === 0 ? <Kosong pesan="Belum ada lokasi." /> : (
          <Tabel kolom={['Kode', 'Nama', 'Tipe / jenis', 'Unit', { label: 'Luas m²', num: true }, 'Kondisi', 'PIC', { label: 'Aset', num: true }, 'Aksi']}>
            {pohon.map(({ l, d }) => (
              <tr key={l.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.code}</td>
                <td style={{ paddingLeft: 12 + d * 18 }}>{d > 0 ? '└ ' : ''}{l.name}</td>
                <td>{l.type}{l.roomUsage ? ` · ${l.roomUsage}` : ''}</td>
                <td>{l.unit?.nama ?? 'Bersama'}</td>
                <td className="num">{l.areaM2 ? Number(l.areaM2) : '-'}</td>
                <td><BadgeKondisi kondisi={l.condition} /></td>
                <td>{l.picStaffId ? pic.get(String(l.picStaffId)) ?? '-' : '-'}</td>
                <td className="num">{jumlahAset.find((j) => j.locationId === l.id)?._count._all ?? 0}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {(l.type === 'Ruang' || l.type === 'Area') && <ButtonLink href={`/cetak/kir/${l.id}`} target="_blank" varian="sekunder" style={{ fontSize: 12 }}>KIR + QR</ButtonLink>}
                </td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
    </div>
  );
}
