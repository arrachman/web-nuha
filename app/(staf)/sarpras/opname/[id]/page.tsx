import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requirePage } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { izinSarpras } from '@/lib/aset/akses';
import { LABEL_KONDISI } from '@/lib/aset/konstanta';
import { Button, Input, JudulHalaman, PesanAksi, Select, satu, type SearchParams } from '@/components';
import { catatBarisOpname, tutupOpname } from '../../actions';
import { BadgeKondisi, BadgeStatus, Kembali } from '../../Kembali';
import { lokasiPilihan } from '../../data';

const gaya = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)', fontSize: 13 } as const;

/** Halaman opname ramah HP: satu kartu per aset, disimpan per baris (tahan sinyal lemah). */
export default async function OpnamePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const session = await requirePage('sarpras');
  const izin = await izinSarpras(session);
  if (!izin.opname_run && !izin.opname_close) redirect('/sarpras');
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const op = await prisma.stockOpname.findUnique({
    where: { id: BigInt(id) },
    include: { lines: { include: { asset: { include: { location: true } } }, orderBy: { id: 'asc' } } },
  });
  if (!op) notFound();
  const lokasi = await lokasiPilihan(session, true);
  const kembali = `/sarpras/opname/${op.id}`;
  const berjalan = op.status === 'Berjalan';
  const dicek = op.lines.filter((l) => l.found !== null).length;

  return (
    <>
      <JudulHalaman judul={`Stock Opname ${op.code}`} sub={`${dicek}/${op.lines.length} aset dicek · dibuka ${op.startedAt.toLocaleString('id-ID')}`} />
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/sarpras?tab=opname" style={{ fontSize: 13 }}>&larr; Daftar opname</Link><BadgeStatus status={op.status} />
      </div>
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {op.lines.map((l) => (
          <div key={String(l.id)} className="card" data-testid={`opname-${l.asset.inventoryCode}`} style={{ borderLeft: `4px solid ${l.found === true ? '#0F6B3D' : l.found === false ? '#B91C1C' : '#D6D3C9'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div><b>{l.asset.name}</b><div className="muted" style={{ fontSize: 12 }}>{l.asset.inventoryCode} · seharusnya di {l.asset.location?.name ?? '-'}</div></div>
              <BadgeKondisi kondisi={l.conditionFound ?? l.asset.condition} />
            </div>
            {berjalan && izin.opname_run ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <form action={catatBarisOpname} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(l.id)} /><Input type="hidden" name="found" value="ya" />
                <Select name="conditionFound" defaultValue={l.conditionFound ?? l.asset.condition} style={gaya} aria-label="Kondisi saat dicek">
                  {Object.entries(LABEL_KONDISI).filter(([k]) => k !== 'Hilang').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Select name="locationFoundId" defaultValue={l.locationFoundId ?? l.expectedLocationId ?? ''} style={gaya} aria-label="Lokasi ditemukan">
                  {lokasi.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
                <Input name="note" placeholder="Catatan" defaultValue={l.note ?? ''} style={{ ...gaya, minWidth: 140 }} />
                <Button type="submit" style={{ fontSize: 12.5 }}>Ada</Button>
              </form>
              <form action={catatBarisOpname}>
                <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(l.id)} /><Input type="hidden" name="found" value="tidak" />
                <Button type="submit" varian="sekunder" style={{ fontSize: 12.5 }}>Tidak ditemukan</Button>
              </form>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                {l.found === null ? 'Belum dicek' : l.found ? `Ditemukan${l.locationFoundId && l.locationFoundId !== l.expectedLocationId ? ' di lokasi berbeda' : ''}` : 'Tidak ditemukan'}{l.note ? ` · ${l.note}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
      {berjalan && izin.opname_close && (
        <form action={tutupOpname} className="card" style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Kembali ke={kembali} /><Input type="hidden" name="id" value={String(op.id)} />
          <span style={{ fontSize: 13, flex: 1 }}>Menutup opname akan: memindah lokasi aset yang ditemukan di ruang lain (mutasi otomatis), memperbarui kondisi, dan menandai aset tidak ditemukan sebagai <b style={{ display: 'inline' }}>Hilang</b>.</span>
          <Button type="submit">Tutup opname</Button>
        </form>
      )}
    </>
  );
}
