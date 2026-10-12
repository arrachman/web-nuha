import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { LABEL_STATUS_KERUSAKAN, STATUS_KERUSAKAN, STATUS_KERUSAKAN_TERBUKA, rupiah } from '@/lib/aset/konstanta';
import { Button, ButtonLink, Input, Kosong, Select, Tabel, satu, type SearchParams } from '@/components';
import { tanganiKerusakan } from './actions';
import { BadgeStatus, Kembali } from './Kembali';
import { petugasTeknis } from './data';

const gaya = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' } as const;
const BADGE_TINGKAT: Record<string, string> = { Ringan: 'badge-netral', Sedang: 'badge-kuning', Berat: 'badge-oranye', Darurat: 'badge-merah' };

/** Tiket kerusakan (04 §6.2). Pelapor melihat laporannya sendiri; pengelola & teknisi menangani. */
export async function TabKerusakan({ session, izin, sp }: { session: SessionPayload; izin: IzinSarpras; sp: SearchParams }) {
  const saya = BigInt(session.userId);
  const status = satu(sp.status);
  const fokus = satu(sp.id);
  const kembali = `/sarpras?tab=kerusakan${status ? `&status=${status}` : ''}`;
  const pengelola = izin.asset_manage || isSuperAdmin(session);
  const scopeUnit = !isSuperAdmin(session) && session.unitIds ? session.unitIds : null;

  const include = { asset: true, location: true, reporter: { include: { person: true } }, assignee: { include: { person: true } }, vendor: true } as const;
  const [milikSaya, tiket, petugas, vendor, enamBulan] = await Promise.all([
    prisma.damageReport.findMany({ where: { reporterUserId: saya }, include, orderBy: { createdAt: 'desc' }, take: 15 }),
    izin.damage_handle ? prisma.damageReport.findMany({
      where: {
        ...(status ? { status } : { status: { in: STATUS_KERUSAKAN_TERBUKA } }),
        ...(!pengelola ? { assignedTo: saya } : {}),
        ...(pengelola && scopeUnit ? { OR: [{ asset: { ownerUnitId: { in: scopeUnit } } }, { location: { unitId: { in: scopeUnit } } }, { location: { unitId: null }, assetId: null }] } : {}),
      },
      include, orderBy: [{ createdAt: 'asc' }], take: 60,
    }) : Promise.resolve([]),
    izin.damage_handle ? petugasTeknis() : Promise.resolve([]),
    izin.damage_handle ? prisma.vendor.findMany() : Promise.resolve([]),
    prisma.damageReport.groupBy({ by: ['assetId'], where: { assetId: { not: null }, createdAt: { gte: new Date(Date.now() - 183 * 86_400_000) } }, _count: { _all: true } }),
  ]);
  const berulang = new Set(enamBulan.filter((g) => g._count._all >= 3).map((g) => String(g.assetId)));
  const urut = { Darurat: 0, Berat: 1, Sedang: 2, Ringan: 3 } as Record<string, number>;
  tiket.sort((a, b) => (urut[a.severity] ?? 9) - (urut[b.severity] ?? 9) || a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5 }}>Menemukan kerusakan? Laporkan dari HP — bisa juga dengan scan QR di pintu ruang atau label aset.</span>
        <ButtonLink href="/lapor-kerusakan">Lapor kerusakan</ButtonLink>
      </div>

      {izin.damage_handle && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="card-judul" style={{ marginBottom: 0 }}>{pengelola ? 'Tiket kerusakan' : 'Tiket yang ditugaskan kepada saya'}</h3>
            <form method="get" style={{ display: 'flex', gap: 8 }}>
              <Input type="hidden" name="tab" value="kerusakan" />
              <Select name="status" defaultValue={status} style={gaya}><option value="">Semua yang terbuka</option>{STATUS_KERUSAKAN.map((s) => <option key={s} value={s}>{LABEL_STATUS_KERUSAKAN[s]}</option>)}</Select>
              <Button type="submit" varian="sekunder">Saring</Button>
            </form>
          </div>
          {tiket.length === 0 ? <Kosong pesan="Tidak ada tiket." /> : tiket.map((t) => (
            <details key={String(t.id)} open={fokus === String(t.id)} data-testid={`tiket-${t.code}`} style={{ border: '1px solid var(--garis)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{t.code}</b>
                <span className={`badge ${BADGE_TINGKAT[t.severity] ?? 'badge-netral'}`}>{t.severity}</span>
                <span>{t.asset?.name ?? t.location?.name ?? '-'}</span>
                {t.assetId && berulang.has(String(t.assetId)) && <span className="badge badge-pink">Kandidat penggantian</span>}
                <BadgeStatus status={t.status} />
                <span className="muted" style={{ fontSize: 12 }}>{t.reporter.person.fullName} · {t.createdAt.toLocaleString('id-ID')}</span>
              </summary>
              <div style={{ fontSize: 13, margin: '10px 0' }}>
                <p style={{ margin: '0 0 6px' }}>{t.description}</p>
                {t.location && <div className="muted">Lokasi: {t.location.name}</div>}
                {t.photoFileId && <a href={`/berkas/${t.photoFileId}`} target="_blank" rel="noreferrer">Lihat foto</a>}
                {t.assignee && <div className="muted">Ditugaskan: {t.assignee.person.fullName}{t.vendor ? ` · vendor ${t.vendor.name}` : ''}</div>}
                {t.resolutionNote && <div className="muted">Catatan: {t.resolutionNote}</div>}
              </div>
              <form action={tanganiKerusakan} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(t.id)} />
                <Select name="status" defaultValue={t.status === 'Baru' ? 'Diverifikasi' : t.status} style={gaya} aria-label="Status tiket">
                  {(pengelola ? STATUS_KERUSAKAN : ['Dikerjakan', 'MenungguSparepart', 'Selesai']).map((s) => <option key={s} value={s}>{LABEL_STATUS_KERUSAKAN[s]}</option>)}
                </Select>
                {pengelola && (
                  <Select name="assignedTo" defaultValue={t.assignedTo ? String(t.assignedTo) : ''} style={gaya} aria-label="Tugaskan ke">
                    <option value="">— tugaskan ke —</option>{petugas.map((p) => <option key={String(p.id)} value={String(p.id)}>{p.person.fullName}</option>)}
                  </Select>
                )}
                {pengelola && (
                  <Select name="vendorId" defaultValue={t.vendorId ?? ''} style={gaya} aria-label="Vendor"><option value="">— vendor luar —</option>{vendor.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
                )}
                <Input name="cost" type="number" min={0} placeholder="Biaya (Rp)" defaultValue={t.cost ? Number(t.cost) : undefined} style={{ ...gaya, width: 120 }} />
                <Input name="resolutionNote" placeholder="Catatan penanganan" style={{ ...gaya, minWidth: 180 }} />
                <Button type="submit">Simpan</Button>
              </form>
            </details>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Laporan saya</h3>
        {milikSaya.length === 0 ? <Kosong pesan="Anda belum pernah melapor." /> : (
          <Tabel kolom={['Kode', 'Aset / ruang', 'Tingkat', 'Status', 'Tanggal', 'Biaya']}>
            {milikSaya.map((t) => (
              <tr key={String(t.id)} data-testid={`laporan-saya-${t.code}`}>
                <td>{t.code}</td><td>{t.asset?.name ?? t.location?.name ?? '-'}</td>
                <td><span className={`badge ${BADGE_TINGKAT[t.severity] ?? 'badge-netral'}`}>{t.severity}</span></td>
                <td><BadgeStatus status={t.status} /></td><td>{t.createdAt.toLocaleDateString('id-ID')}</td>
                <td>{izin.view_value && t.cost ? rupiah(t.cost) : '-'}</td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
    </div>
  );
}
