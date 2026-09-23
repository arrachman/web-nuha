import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/access';
import { Kosong } from '@/components';
import { buatLowongan, ajukanLowongan, setujuiLowongan, tutupLowongan } from './actions';

const LABEL_STATUS: Record<string, string> = { Draft: 'Draf', PendingApproval: 'Menunggu Persetujuan', Open: 'Dibuka', Closed: 'Ditutup', Cancelled: 'Dibatalkan' };
const KELAS_BADGE: Record<string, string> = { Open: 'badge-hijau', PendingApproval: 'badge-kuning', Closed: 'badge-netral', Cancelled: 'badge-merah', Draft: 'badge-biru' };

export async function TabLowongan() {
  const session = await readSession();
  const [bisaKelola, bisaSetujui, units, lowongan] = await Promise.all([
    session ? can(session, 'rekrutmen.job_manage') : false,
    session ? can(session, 'rekrutmen.approve') : false,
    prisma.unit.findMany({ orderBy: { key: 'asc' } }),
    prisma.jobPosting.findMany({ where: { deletedAt: null }, include: { unit: true, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {bisaKelola && (
        <div className="card">
          <h3 className="card-judul">Buat lowongan baru</h3>
          <form action={buatLowongan} className="grid g2">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Judul posisi *</label>
              <input name="title" required placeholder="mis. Guru Matematika SMP" />
            </div>
            <div className="field">
              <label>Unit *</label>
              <select name="unitId" required>
                {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Tipe</label>
              <select name="type">
                <option value="Guru">Guru</option>
                <option value="Staf">Staf</option>
                <option value="Asatidz">Asatidz</option>
                <option value="Musyrif">Musyrif/Musyrifah</option>
              </select>
            </div>
            <div className="field">
              <label>Mata pelajaran/bidang</label>
              <input name="subject" placeholder="opsional" />
            </div>
            <div className="field">
              <label>Kuota</label>
              <input name="quota" type="number" min={1} defaultValue={1} />
            </div>
            <div className="field">
              <label>Jenis hubungan kerja *</label>
              <input name="employmentType" required placeholder="mis. Kontrak, Tetap" />
            </div>
            <div className="field">
              <label>Pendidikan minimal *</label>
              <input name="minEducation" required placeholder="mis. S1" />
            </div>
            <div className="field">
              <label>Tanggal buka *</label>
              <input name="openAt" type="date" required />
            </div>
            <div className="field">
              <label>Tanggal tutup *</label>
              <input name="closeAt" type="date" required />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Deskripsi pekerjaan *</label>
              <textarea name="description" required rows={2} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Persyaratan *</label>
              <textarea name="requirements" required rows={2} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Fasilitas</label>
              <textarea name="benefits" rows={2} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn">Buat sebagai Draf</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="card-judul">Seluruh lowongan</h3>
        {lowongan.length === 0 ? <Kosong pesan="Belum ada lowongan." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lowongan.map((job) => (
              <div key={String(job.id)} style={{ border: '1px solid var(--garis, #E8E3D9)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{job.title} <span className="muted" style={{ fontWeight: 400 }}>· {job.code}</span></div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{job.unit.nama} · {job._count.applications} pelamar · {job.openAt.toLocaleDateString('id-ID')} – {job.closeAt.toLocaleDateString('id-ID')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${KELAS_BADGE[job.status] ?? 'badge-netral'}`}>{LABEL_STATUS[job.status] ?? job.status}</span>
                    {bisaKelola && job.status === 'Draft' && (
                      <form action={ajukanLowongan}><input type="hidden" name="id" value={String(job.id)} /><button type="submit" className="btn-sekunder">Ajukan</button></form>
                    )}
                    {bisaSetujui && job.status === 'PendingApproval' && (
                      <form action={setujuiLowongan}><input type="hidden" name="id" value={String(job.id)} /><button type="submit" className="btn">Setujui &amp; Buka</button></form>
                    )}
                    {bisaSetujui && job.status === 'Open' && (
                      <form action={tutupLowongan}><input type="hidden" name="id" value={String(job.id)} /><button type="submit" className="btn-sekunder">Tutup</button></form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
