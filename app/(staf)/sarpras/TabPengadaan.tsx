import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import type { IzinSarpras } from '@/lib/aset/akses';
import { jejakPersetujuan } from '@/lib/aset/persetujuan';
import { rupiah } from '@/lib/aset/konstanta';
import { whereUnit } from '@/lib/unit-scope';
import { Kosong } from '@/components';
import { ajukanPengadaan, putuskanPengadaan, tandaiDibeli, terimaPengadaan } from './actions';
import { BadgeStatus, FormKeputusan, Kembali } from './Kembali';
import { lokasiPilihan, unitDalamCakupan } from './data';

const K = '/sarpras?tab=pengadaan';

/** Usulan → persetujuan berjenjang (ApprovalStep) → pembelian → penerimaan jadi aset (04 §5, §6.1). */
export async function TabPengadaan({ session, izin }: { session: SessionPayload; izin: IzinSarpras }) {
  const [units, dana, kategori, lokasi, daftar] = await Promise.all([
    unitDalamCakupan(session),
    prisma.fundingSource.findMany({ orderBy: { id: 'asc' } }),
    prisma.assetCategory.findMany({ orderBy: { code: 'asc' } }),
    lokasiPilihan(session, true),
    prisma.procurement.findMany({ where: whereUnit(session), include: { unit: true, fundingSource: true, items: true, requester: { include: { person: true } } }, orderBy: { createdAt: 'desc' }, take: 40 }),
  ]);
  const jejak = await jejakPersetujuan('procurement', daftar.map((p) => p.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {izin.procure_request && (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>+ Ajukan pengadaan baru</summary>
          <form action={ajukanPengadaan} style={{ marginTop: 12 }}>
            <Kembali ke={K} />
            <div className="grid g3">
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Judul *</label><input name="title" required placeholder="mis. Proyektor untuk kelas 8" /></div>
              <div className="field"><label>Unit *</label><select name="unitId" required>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Alasan / kebutuhan *</label><input name="reason" required /></div>
              <div className="field"><label>Sumber dana *</label><select name="fundingSourceId" required>{dana.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>Barang (isi baris yang diperlukan saja):</p>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 140px', gap: 8, marginBottom: 6 }}>
                <input name="itemName" placeholder={`Nama barang ${i + 1}`} aria-label={`Nama barang ${i + 1}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />
                <select name="itemCategoryId" aria-label={`Kategori barang ${i + 1}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }}>
                  {kategori.map((k) => <option key={k.id} value={k.id}>{k.code} {k.name}</option>)}
                </select>
                <input name="itemQty" type="number" min={1} defaultValue={1} aria-label={`Jumlah barang ${i + 1}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />
                <input name="itemPrice" type="number" min={0} placeholder="Harga satuan" aria-label={`Harga barang ${i + 1}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />
              </div>
            ))}
            <button type="submit" className="btn" style={{ marginTop: 8 }}>Ajukan</button>
          </form>
        </details>
      )}

      {daftar.length === 0 ? <div className="card"><Kosong pesan="Belum ada pengadaan." /></div> : daftar.map((p) => {
        const tahap = jejak.get(String(p.id)) ?? [];
        const aktif = tahap.find((t) => !t.decision);
        const bolehPutus = p.status === 'Diajukan' && izin.procure_approve && aktif && (isSuperAdmin(session) || session.peran.includes(aktif.roleKey));
        return (
          <div className="card" key={String(p.id)} data-testid={`pengadaan-${p.code}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.title} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{p.code}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>{p.unit.nama} · {p.fundingSource.name} · diajukan {p.requester.person.fullName}, {p.createdAt.toLocaleDateString('id-ID')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b>{rupiah(p.estimatedTotal)}</b><BadgeStatus status={p.status} /></div>
            </div>
            <ul style={{ margin: '10px 0', paddingLeft: 18, fontSize: 13 }}>
              {p.items.map((it) => <li key={String(it.id)}>{it.name} × {it.quantity} @ {rupiah(it.estimatedPrice)}{it.actualPrice ? ` (realisasi ${rupiah(it.actualPrice)})` : ''}</li>)}
            </ul>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
              {tahap.map((t) => (
                <span key={String(t.id)} className={`badge ${t.decision === 'Setuju' ? 'badge-hijau' : t.decision === 'Tolak' ? 'badge-merah' : 'badge-netral'}`}>
                  {t.order}. {t.roleKey}{t.decision ? ` — ${t.decision}` : ''}
                </span>
              ))}
            </div>
            {bolehPutus && <FormKeputusan action={putuskanPengadaan} id={String(p.id)} kembali={K} />}
            {p.status === 'Disetujui' && izin.procure_request && (
              <form action={tandaiDibeli} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Kembali ke={K} /><input type="hidden" name="id" value={String(p.id)} />
                {p.items.map((it) => <input key={String(it.id)} name={`harga_${it.id}`} type="number" min={0} placeholder={`Harga realisasi ${it.name}`} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />)}
                <button type="submit" className="btn-sekunder">Tandai sudah dibeli</button>
              </form>
            )}
            {p.status === 'Dibeli' && izin.asset_manage && (
              <form action={terimaPengadaan} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Kembali ke={K} /><input type="hidden" name="id" value={String(p.id)} />
                <select name="locationId" required style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }}>
                  <option value="">Lokasi penempatan…</option>{lokasi.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <label style={{ fontSize: 12 }}>BAST <input type="file" name="bast" accept="image/*,application/pdf" /></label>
                <button type="submit" className="btn">Terima &amp; registrasi aset</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
