import { prisma } from '@/lib/prisma';
import { getUnitAktif } from '@/lib/unit-scope';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/access';
import { Button, FormField, Input, Kosong, Select, Textarea } from '@/components';
import { buatLowongan, ajukanLowongan, setujuiLowongan, tutupLowongan } from './actions';

const LABEL_STATUS: Record<string, string> = { Draft: 'Draf', PendingApproval: 'Menunggu Persetujuan', Open: 'Dibuka', Closed: 'Ditutup', Cancelled: 'Dibatalkan' };
const KELAS_BADGE: Record<string, string> = { Open: 'badge-hijau', PendingApproval: 'badge-kuning', Closed: 'badge-netral', Cancelled: 'badge-merah', Draft: 'badge-biru' };

export async function TabLowongan() {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const [bisaKelola, bisaSetujui, units, lowongan] = await Promise.all([
    session ? can(session, 'rekrutmen.job_manage') : false,
    session ? can(session, 'rekrutmen.approve') : false,
    prisma.unit.findMany({ orderBy: { key: 'asc' } }),
    prisma.jobPosting.findMany({ where: { deletedAt: null, ...(unitAktif != null ? { unitId: unitAktif } : {}) }, include: { unit: true, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {bisaKelola && (
        <div className="card">
          <h3 className="card-judul">Buat lowongan baru</h3>
          <form action={buatLowongan} className="grid g2">
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Judul posisi *</label>
              <Input name="title" required placeholder="mis. Guru Matematika SMP" />
            </div>
            <FormField label="Unit *" htmlFor="unitId">
              <Select id="unitId" name="unitId" required>
                {units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </Select>
            </FormField>
            <FormField label="Tipe" htmlFor="type">
              <Select id="type" name="type">
                <option value="Guru">Guru</option>
                <option value="Staf">Staf</option>
                <option value="Asatidz">Asatidz</option>
                <option value="Musyrif">Musyrif/Musyrifah</option>
              </Select>
            </FormField>
            <FormField label="Mata pelajaran/bidang" htmlFor="subject">
              <Input id="subject" name="subject" placeholder="opsional" />
            </FormField>
            <FormField label="Kuota" htmlFor="quota">
              <Input id="quota" name="quota" type="number" min={1} defaultValue={1} />
            </FormField>
            <FormField label="Jenis hubungan kerja *" htmlFor="employmentType">
              <Input id="employmentType" name="employmentType" required placeholder="mis. Kontrak, Tetap" />
            </FormField>
            <FormField label="Pendidikan minimal *" htmlFor="minEducation">
              <Input id="minEducation" name="minEducation" required placeholder="mis. S1" />
            </FormField>
            <FormField label="Tanggal buka *" htmlFor="openAt">
              <Input id="openAt" name="openAt" type="date" required />
            </FormField>
            <FormField label="Tanggal tutup *" htmlFor="closeAt">
              <Input id="closeAt" name="closeAt" type="date" required />
            </FormField>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Deskripsi pekerjaan *</label>
              <Textarea name="description" required rows={2} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Persyaratan *</label>
              <Textarea name="requirements" required rows={2} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Fasilitas</label>
              <Textarea name="benefits" rows={2} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Button type="submit">Buat sebagai Draf</Button>
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
                      <form action={ajukanLowongan}><Input type="hidden" name="id" value={String(job.id)} /><Button type="submit" varian="sekunder">Ajukan</Button></form>
                    )}
                    {bisaSetujui && job.status === 'PendingApproval' && (
                      <form action={setujuiLowongan}><Input type="hidden" name="id" value={String(job.id)} /><Button type="submit">Setujui &amp; Buka</Button></form>
                    )}
                    {bisaSetujui && job.status === 'Open' && (
                      <form action={tutupLowongan}><Input type="hidden" name="id" value={String(job.id)} /><Button type="submit" varian="sekunder">Tutup</Button></form>
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
