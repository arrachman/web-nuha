import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage, can } from '@/lib/access';
import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button, Input, JudulHalaman, Select, Textarea } from '@/components';
import { verifikasiDokumen, ubahStatusLamaran, beriNilai, konversiJadiPegawai } from '../../actions';

const LABEL_STATUS: Record<string, string> = {
  Submitted: 'Terkirim', Screening: 'Diperiksa Berkas', Shortlisted: 'Lolos Administrasi',
  Test: 'Tes', Interview: 'Wawancara', Offered: 'Ditawari', Hired: 'Diterima',
  Rejected: 'Tidak Lolos', Withdrawn: 'Mengundurkan Diri', Reserve: 'Cadangan',
};

export default async function DetailPelamarPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage('rekrutmen');
  const session = await readSession();
  const { id: idRaw } = await params;
  let id: bigint;
  try { id = BigInt(idRaw); } catch { notFound(); }

  const lamaran = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: { include: { unit: true, stages: { orderBy: { order: 'asc' } } } },
      documents: { include: { file: true } },
      events: { orderBy: { createdAt: 'asc' } },
      scores: true,
    },
  });
  if (!lamaran) notFound();

  const [lihatSensitif, bisaScreen, bisaScore, bisaDecide, bisaHire] = await Promise.all([
    session ? can(session, 'rekrutmen.view_sensitive') : false,
    session ? can(session, 'rekrutmen.screen') : false,
    session ? can(session, 'rekrutmen.score') : false,
    session ? can(session, 'rekrutmen.decide') : false,
    session ? can(session, 'rekrutmen.hire') : false,
  ]);

  const requiredDocs = await prisma.jobRequiredDocument.findMany({ where: { jobId: lamaran.jobId } });
  const pegawai = lamaran.personId
    ? await prisma.staff.findUnique({ where: { personId: lamaran.personId }, include: { person: { include: { user: true } } } })
    : null;

  return (
    <>
      <JudulHalaman judul={lamaran.fullName} sub={`${lamaran.number} · ${lamaran.job.title} (${lamaran.job.unit.nama})`} />
      <div style={{ marginBottom: 14 }}>
        <Link href="/rekrutmen?tab=pelamar" style={{ fontSize: 13 }}>&larr; Kembali ke daftar pelamar</Link>
      </div>

      <div className="grid g2" style={{ gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 className="card-judul">Data Diri</h3>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, fontSize: 13.5 }}>
              {lihatSensitif && <><dt className="muted">NIK</dt><dd>{lamaran.nik}</dd></>}
              <dt className="muted">Jenis kelamin</dt><dd>{lamaran.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</dd>
              <dt className="muted">Tempat, tgl lahir</dt><dd>{lamaran.birthPlace}, {lamaran.birthDate.toLocaleDateString('id-ID')}</dd>
              <dt className="muted">HP</dt><dd>{lamaran.phone}</dd>
              <dt className="muted">Email</dt><dd>{lamaran.email ?? '-'}</dd>
              <dt className="muted">Alamat</dt><dd>{lamaran.addressLine}</dd>
              <dt className="muted">Pendidikan</dt><dd>{lamaran.lastEducation} — {lamaran.institution} ({lamaran.graduationYear}){lamaran.gpa ? `, IPK ${lamaran.gpa}` : ''}</dd>
              {lamaran.pesantrenHistory && <><dt className="muted">Riwayat pesantren</dt><dd>{lamaran.pesantrenHistory}</dd></>}
              {lamaran.quranMemorization != null && <><dt className="muted">Hafalan Qur&apos;an</dt><dd>{lamaran.quranMemorization} juz</dd></>}
              {lamaran.kitabAbility && <><dt className="muted">Kemampuan kitab</dt><dd>{lamaran.kitabAbility}</dd></>}
              {lamaran.experienceText && <><dt className="muted">Pengalaman</dt><dd>{lamaran.experienceText}</dd></>}
            </dl>
          </div>

          <div className="card">
            <h3 className="card-judul">Berkas Lamaran</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requiredDocs.map((rd) => {
                const doc = lamaran.documents.find((d) => d.code === rd.code);
                return (
                  <div key={rd.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid var(--garis, #E8E3D9)', borderRadius: 10, padding: '10px 12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rd.label}</div>
                      {doc ? (
                        <a href={`/berkas/${doc.fileId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Lihat berkas · {doc.file.originalName}</a>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>Belum diunggah</span>
                      )}
                    </div>
                    {doc && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`badge ${doc.verified ? 'badge-hijau' : 'badge-kuning'}`}>{doc.verified ? 'Terverifikasi' : 'Belum'}</span>
                        {bisaScreen && (
                          <form action={verifikasiDokumen}>
                            <Input type="hidden" name="id" value={String(doc.id)} />
                            <Input type="hidden" name="verified" value={String(!doc.verified)} />
                            <Button type="submit" varian="sekunder" style={{ fontSize: 11.5 }}>{doc.verified ? 'Tandai perlu perbaikan' : 'Verifikasi'}</Button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {bisaScore && (
            <div className="card">
              <h3 className="card-judul">Beri Nilai per Tahap</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lamaran.job.stages.map((stage) => {
                  const nilaiSaya = lamaran.scores.find((s) => s.stageId === stage.id);
                  return (
                    <form action={beriNilai} key={String(stage.id)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input type="hidden" name="applicationId" value={String(lamaran.id)} />
                      <Input type="hidden" name="stageId" value={String(stage.id)} />
                      <span style={{ flex: 1, fontSize: 13 }}>{stage.name} <span className="muted">(bobot {stage.weight})</span></span>
                      <div className="field" style={{ marginBottom: 0, width: 90 }}>
                        <Input name="score" type="number" min={0} max={100} step="0.5" defaultValue={nilaiSaya ? Number(nilaiSaya.score) : undefined} required />
                      </div>
                      <Button type="submit" varian="sekunder">Simpan</Button>
                    </form>
                  );
                })}
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Total skor tertimbang: {lamaran.totalScore ? Number(lamaran.totalScore).toFixed(2) : '-'}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 className="card-judul">Status &amp; Timeline</h3>
            <div style={{ marginBottom: 14 }}>
              {lamaran.events.map((ev, i, arr) => (
                <div key={String(ev.id)} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 18px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0F6B3D' }} />
                    {i < arr.length - 1 && <div style={{ flex: 1, width: 2, minHeight: 24, background: '#0F6B3D' }} />}
                  </div>
                  <div style={{ paddingBottom: 14, fontSize: 12.5 }}>
                    <strong>{LABEL_STATUS[ev.toStatus] ?? ev.toStatus}</strong> — {ev.createdAt.toLocaleString('id-ID')}
                    {ev.note ? <div className="muted">{ev.note}</div> : null}
                    {ev.scheduleAt ? <div className="muted">Jadwal: {ev.scheduleAt.toLocaleString('id-ID')} {ev.location ? `· ${ev.location}` : ''}</div> : null}
                  </div>
                </div>
              ))}
            </div>

            {(bisaScreen || bisaDecide) && lamaran.status !== 'Hired' && lamaran.status !== 'Rejected' && (
              <form action={ubahStatusLamaran} style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #F0EDE4', paddingTop: 14 }}>
                <Input type="hidden" name="id" value={String(lamaran.id)} />
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>Ubah status</label>
                <div className="field" style={{ marginBottom: 0 }}>
                  <Select name="status">
                    {bisaScreen && <option value="Screening">Diperiksa Berkas</option>}
                    {bisaScreen && <option value="Shortlisted">Lolos Administrasi</option>}
                    {bisaScreen && <option value="Test">Tes</option>}
                    {bisaScreen && <option value="Interview">Wawancara</option>}
                    {bisaDecide && <option value="Offered">Ditawari</option>}
                    {bisaDecide && <option value="Hired">Diterima (Hired)</option>}
                    {bisaDecide && <option value="Rejected">Tidak Lolos</option>}
                  </Select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <Input name="scheduleAt" type="datetime-local" placeholder="Jadwal (opsional)" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <Input name="location" placeholder="Lokasi (opsional)" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <Textarea name="note" rows={2} placeholder="Catatan (opsional)" />
                </div>
                <Button type="submit">Simpan Status</Button>
              </form>
            )}
          </div>

          {bisaHire && lamaran.status === 'Hired' && !lamaran.personId && (
            <div className="card">
              <h3 className="card-judul">Konversi jadi Pegawai</h3>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Membuat data pegawai + akun login dengan sandi sementara yang wajib diganti saat login pertama.</p>
              <form action={konversiJadiPegawai}>
                <Input type="hidden" name="id" value={String(lamaran.id)} />
                <Button type="submit">Konversi jadi Pegawai</Button>
              </form>
            </div>
          )}
          {pegawai && (
            <div className="alert alert-sukses">
              Sudah dikonversi jadi pegawai {pegawai.employeeNumber}
              {pegawai.person.user ? ` · akun ${pegawai.person.user.username}` : ''}.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
