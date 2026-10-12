import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { whereAsetTerlihat, type IzinSarpras } from '@/lib/aset/akses';
import { jejakPersetujuan } from '@/lib/aset/persetujuan';
import { ALASAN_HAPUS, METODE_HAPUS, rupiah } from '@/lib/aset/konstanta';
import { Button, FormField, Input, Kosong, Select, Textarea } from '@/components';
import { laksanakanPenghapusan, putuskanPenghapusan, usulkanPenghapusan } from './actions';
import { BadgeKondisi, BadgeStatus, FormKeputusan, Kembali } from './Kembali';

const K = '/sarpras?tab=penghapusan';

/** Penghapusan aset (04 §6.7): usulan → sarpras → kepala unit → ketua → BA → Dihapus (baris tetap ada). */
export async function TabPenghapusan({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const whereAset = await whereAsetTerlihat(session, izin);
  const [kandidat, daftar] = await Promise.all([
    izin.dispose_request ? prisma.asset.findMany({
      where: { ...whereAset, deletedAt: null, status: { notIn: ['Dihapus', 'MenungguPenghapusan', 'Dipinjam'] } },
      include: { fundingSource: true, ownerUnit: true }, orderBy: [{ condition: 'desc' }, { name: 'asc' }],
    }) : Promise.resolve([]),
    prisma.assetDisposal.findMany({ include: { items: { include: { asset: { include: { ownerUnit: true } } } } }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const terlihat = daftar.filter((d) => isSuperAdmin(session) || !session.unitIds || d.items.some((i) => session.unitIds!.includes(i.asset.ownerUnitId)));
  const jejak = await jejakPersetujuan('disposal', terlihat.map((d) => d.id));
  const prioritas = kandidat.filter((a) => a.condition === 'RusakBerat' || a.condition === 'Hilang' || a.status === 'TidakDipakai');
  const lain = kandidat.filter((a) => !prioritas.includes(a));

  const baris = (a: (typeof kandidat)[number]) => (
    <label key={String(a.id)} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '3px 0', alignItems: 'center', flexWrap: 'wrap' }}>
      <Input type="checkbox" name="assetIds" value={String(a.id)} /> {a.name} <span className="muted">({a.inventoryCode} · {a.ownerUnit.nama})</span>
      <BadgeKondisi kondisi={a.condition} />{a.fundingSource.restrictedDisposal && <span className="badge badge-oranye">{a.fundingSource.code}</span>}
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.dispose_request && (
        <div className="card">
          <h3 className="card-judul">Usulkan penghapusan</h3>
          <form action={usulkanPenghapusan}>
            <Kembali ke={K} />
            <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid var(--garis)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
              {prioritas.length ? prioritas.map(baris) : <span className="muted" style={{ fontSize: 13 }}>Tidak ada aset rusak berat / hilang.</span>}
              {lain.length > 0 && <details style={{ marginTop: 6 }}><summary style={{ cursor: 'pointer', fontSize: 12.5 }}>Aset lain ({lain.length})</summary>{lain.map(baris)}</details>}
            </div>
            <div className="grid g3">
              <FormField label="Alasan *" htmlFor="reason"><Select id="reason" name="reason">{ALASAN_HAPUS.map((a) => <option key={a} value={a}>{a.replace(/([a-z])([A-Z])/g, '$1 $2')}</option>)}</Select></FormField>
              <FormField label="Metode *" htmlFor="method"><Select id="method" name="method">{METODE_HAPUS.map((m) => <option key={m}>{m}</option>)}</Select></FormField>
              <FormField label="Berita acara (BA)" htmlFor="ba"><Input id="ba" type="file" name="ba" accept="application/pdf,image/*" /></FormField>
              <div className="field" style={{ gridColumn: 'span 3' }}><label>Catatan (wajib untuk aset wakaf/BOS)</label><Textarea name="note" rows={2} /></div>
            </div>
            <Button type="submit">Ajukan usulan</Button>
          </form>
        </div>
      )}

      {terlihat.length === 0 ? <div className="card"><Kosong pesan="Belum ada usulan penghapusan." /></div> : terlihat.map((d) => {
        const tahap = jejak.get(String(d.id)) ?? [];
        const aktif = tahap.find((t) => !t.decision);
        const izinTahap = aktif?.roleKey === 'sarpras' ? izin.dispose_request : izin.dispose_approve;
        const bolehPutus = ['Diajukan', 'Diverifikasi'].includes(d.status) && aktif && izinTahap && (isSuperAdmin(session) || session.peran.includes(aktif.roleKey));
        return (
          <div className="card" key={String(d.id)} data-testid={`hapus-${d.code}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div><b>{d.code}</b> · {d.reason} · {d.method}{d.needsNazhir && <span className="badge badge-oranye" style={{ marginLeft: 8 }}>Perlu keputusan nazhir</span>}</div>
              <BadgeStatus status={d.status} />
            </div>
            <ul style={{ margin: '8px 0', paddingLeft: 18, fontSize: 13 }}>
              {d.items.map((i) => <li key={String(i.id)}>{i.asset.name} ({i.asset.inventoryCode}){izin.view_value ? ` · nilai buku ${rupiah(i.bookValue)}` : ''}{i.saleValue ? ` · terjual ${rupiah(i.saleValue)}` : ''}</li>)}
            </ul>
            {d.note && <p className="muted" style={{ fontSize: 12.5, margin: '0 0 6px' }}>{d.note}</p>}
            {d.baFileId && <a href={`/berkas/${d.baFileId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>Lihat berita acara</a>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, marginTop: 6 }}>
              {tahap.map((t) => <span key={String(t.id)} className={`badge ${t.decision === 'Setuju' ? 'badge-hijau' : t.decision === 'Tolak' ? 'badge-merah' : 'badge-netral'}`}>{t.order}. {t.roleKey}{t.decision ? ` — ${t.decision}` : ''}</span>)}
            </div>
            {bolehPutus && <FormKeputusan action={putuskanPenghapusan} id={String(d.id)} kembali={K} labelSetuju={aktif?.roleKey === 'sarpras' ? 'Verifikasi' : 'Setujui'} />}
            {d.status === 'Disetujui' && izin.dispose_request && (
              <form action={laksanakanPenghapusan} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Kembali ke={K} /><Input type="hidden" name="id" value={String(d.id)} />
                {d.method.startsWith('Dijual') && d.items.map((i) => <Input key={String(i.id)} name={`jual_${i.id}`} type="number" min={0} placeholder={`Nilai jual ${i.asset.name}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />)}
                <label className="field" style={{ fontSize: 12, marginBottom: 0 }}>BA bertanda tangan <Input type="file" name="ba" accept="application/pdf,image/*" /></label>
                <Button type="submit">Laksanakan penghapusan</Button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
