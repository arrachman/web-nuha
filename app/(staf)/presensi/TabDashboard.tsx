import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { asramaBolehInput, rombelBolehInput, type IzinPresensi } from '@/lib/presensi/akses';
import { LABEL_STATUS, hariDariTanggal, hariWib, sesiAktifPadaHari, tanggalDb, tanggalWib } from '@/lib/presensi/inti';
import { BarHorizontal, ChartBatang, ChartDonut, ChartTren, Kosong, StatCard, Tabel, satu, type SearchParams } from '@/components';

const WARNA: Record<string, string> = { Present: '#0F6B3D', Late: '#7C3AED', Sick: '#1D4ED8', Excused: '#B45309', Absent: '#B91C1C', EarlyDeparture: '#6B7280' };
const PERIODE = [{ k: 'hari', l: 'Hari ini' }, { k: '7', l: '7 hari' }, { k: 'bulan', l: 'Bulan ini' }];

function rentang(periode: string) {
  const akhir = tanggalWib();
  if (periode === '7') return { dari: tanggalWib(new Date(Date.now() - 6 * 86_400_000)), sampai: akhir };
  if (periode === 'bulan') return { dari: `${akhir.slice(0, 7)}-01`, sampai: akhir };
  return { dari: akhir, sampai: akhir };
}

/** Dashboard presensi (02 §4): agregasi di SQL (groupBy), unit scope berlaku. */
export async function TabDashboard({ session, izin, sp }: { session: SessionPayload; izin: IzinPresensi; sp: SearchParams }) {
  const pengelola = isSuperAdmin(session) || session.peran.some((p) => ['ketua', 'kepsmp', 'kepma', 'pengasuh', 'sdm'].includes(p));
  const lihat = satu(sp.lihat) === 'pegawai' && (pengelola || izin.review) ? 'pegawai' : 'siswa';
  const periode = PERIODE.some((p) => p.k === satu(sp.periode)) ? satu(sp.periode) : 'hari';
  const unitScope = !isSuperAdmin(session) && session.unitIds ? session.unitIds : null;
  const unitDipilih = Number(satu(sp.unit)) || null;
  const units = await prisma.unit.findMany({ where: unitScope ? { id: { in: unitScope } } : {}, orderBy: { id: 'asc' } });
  const href = (extra: Record<string, string>) => `/presensi?${new URLSearchParams({ tab: 'dashboard', lihat, periode, ...(unitDipilih ? { unit: String(unitDipilih) } : {}), ...extra }).toString()}`;

  const filter = (
    <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="chip-baris" style={{ display: 'flex', gap: 6 }}>
        <Link href={href({ lihat: 'siswa' })} className={`chip ${lihat === 'siswa' ? 'chip-aktif' : ''}`}>Siswa / santri</Link>
        {(pengelola || izin.review) && <Link href={href({ lihat: 'pegawai' })} className={`chip ${lihat === 'pegawai' ? 'chip-aktif' : ''}`}>Guru &amp; pegawai</Link>}
      </div>
      <span className="muted">·</span>
      {PERIODE.map((p) => <Link key={p.k} href={href({ periode: p.k })} className={`chip ${periode === p.k ? 'chip-aktif' : ''}`}>{p.l}</Link>)}
      {pengelola && <>
        <span className="muted">·</span>
        <Link href={`/presensi?${new URLSearchParams({ tab: 'dashboard', lihat, periode }).toString()}`} className={`chip ${!unitDipilih ? 'chip-aktif' : ''}`}>Semua unit</Link>
        {units.map((u) => <Link key={u.id} href={href({ unit: String(u.id) })} className={`chip ${unitDipilih === u.id ? 'chip-aktif' : ''}`}>{u.nama}</Link>)}
      </>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filter}
      {lihat === 'siswa'
        ? <DashboardSiswa session={session} pengelola={pengelola} periode={periode} unitIds={unitDipilih ? [unitDipilih] : unitScope} />
        : <DashboardPegawai periode={periode} unitIds={unitDipilih ? [unitDipilih] : unitScope} bolehFoto={izin.review} />}
    </div>
  );
}

async function DashboardSiswa({ session, pengelola, periode, unitIds }: { session: SessionPayload; pengelola: boolean; periode: string; unitIds: number[] | null }) {
  const { dari, sampai } = rentang(periode);
  const hariIni = tanggalWib();
  // Guru/musyrif (bukan pengelola): hanya rombel/asrama miliknya (05 §4 "rombel sendiri / asramanya").
  let whereSantri: Record<string, unknown> = unitIds ? { unitId: { in: unitIds } } : {};
  if (!pengelola) {
    const [rombel, asrama] = await Promise.all([rombelBolehInput(session, hariIni, null), asramaBolehInput(session)]);
    whereSantri = { OR: [{ kelasId: { in: rombel.map((k) => k.id).concat(-1) } }, { room: { dormitoryId: { in: asrama.map((a) => a.id).concat(-1) } } }] };
  }
  const whereRentang = { date: { gte: tanggalDb(dari), lte: tanggalDb(sampai) }, student: whereSantri };
  const tiga0 = tanggalWib(new Date(Date.now() - 29 * 86_400_000));
  const [perStatus, perHari, perSantri, perKelasStatus, sesiSekolah] = await Promise.all([
    prisma.attendance.groupBy({ by: ['status'], where: whereRentang, _count: { _all: true } }),
    prisma.attendance.groupBy({ by: ['date', 'status'], where: { date: { gte: tanggalDb(tiga0), lte: tanggalDb(hariIni) }, student: whereSantri }, _count: { _all: true } }),
    prisma.attendance.groupBy({ by: ['studentId'], where: { ...whereRentang, status: 'Absent' }, _count: { _all: true }, orderBy: { _count: { studentId: 'desc' } }, take: 10 }),
    prisma.attendance.findMany({ where: whereRentang, select: { status: true, student: { select: { kelasId: true } } } }),
    prisma.attendanceSession.findUnique({ where: { code: 'SEKOLAH' } }),
  ]);
  const total = perStatus.reduce((s, r) => s + r._count._all, 0);
  const jml = (st: string) => perStatus.find((r) => r.status === st)?._count._all ?? 0;
  const pctHadir = total ? Math.round(((jml('Present') + jml('Late')) / total) * 100) : 0;

  const hariList = Array.from({ length: 30 }, (_, i) => tanggalWib(new Date(Date.now() - (29 - i) * 86_400_000)));
  const tren = hariList.map((t) => {
    const baris = perHari.filter((r) => r.date.toISOString().slice(0, 10) === t);
    const n = baris.reduce((s, r) => s + r._count._all, 0);
    const h = baris.filter((r) => r.status === 'Present' || r.status === 'Late').reduce((s, r) => s + r._count._all, 0);
    return { label: t.slice(8), nilai: n ? Math.round((h / n) * 100) : 0 };
  });

  const kelasAgg = new Map<number, { n: number; h: number }>();
  for (const r of perKelasStatus) {
    if (!r.student.kelasId) continue;
    const v = kelasAgg.get(r.student.kelasId) ?? { n: 0, h: 0 };
    v.n++; if (r.status === 'Present' || r.status === 'Late') v.h++;
    kelasAgg.set(r.student.kelasId, v);
  }
  const ta = await prisma.academicYear.findFirst({ where: { isActive: true } });
  const kelasSemua = await prisma.kelas.findMany({
    where: { ...(pengelola ? (unitIds ? { unitId: { in: unitIds } } : {}) : { id: { in: [...kelasAgg.keys()].concat(-1) } }), ...(ta ? { OR: [{ academicYearId: ta.id }, { academicYearId: null }] } : {}), santri: { some: { status: 'Aktif' } } },
    include: { unit: true, waliKelasPegawai: { include: { person: true } } },
  });
  const perKelas = kelasSemua.filter((k) => kelasAgg.has(k.id)).map((k) => ({ label: `${k.nama} ${k.unit.key}`, nilai: Math.round((kelasAgg.get(k.id)!.h / kelasAgg.get(k.id)!.n) * 100), warna: '#0F6B3D' })).sort((a, b) => a.nilai - b.nilai).slice(0, 8);
  const sekolahHariIni = sesiSekolah && sesiAktifPadaHari(sesiSekolah.hariAktif, hariDariTanggal(hariIni));
  const sudahIsi = sekolahHariIni ? await prisma.attendance.findMany({ where: { date: tanggalDb(hariIni), session: 'SEKOLAH' }, distinct: ['studentId'], select: { student: { select: { kelasId: true } } } }) : [];
  const kelasTerisi = new Set(sudahIsi.map((r) => r.student.kelasId));
  const belumIsi = sekolahHariIni ? kelasSemua.filter((k) => k.unit.key !== 'Pondok' && !kelasTerisi.has(k.id)) : [];
  const santriAlpa = await prisma.santri.findMany({ where: { id: { in: perSantri.map((p) => p.studentId) } }, include: { person: true } });

  return (
    <>
      <section className="grid g4">
        <StatCard label={periode === 'hari' ? '% hadir hari ini' : '% hadir periode'} nilai={`${pctHadir}%`} pct={pctHadir} sub={`${total} catatan presensi`} />
        <StatCard label="Sakit" nilai={jml('Sick')} warna={WARNA.Sick} />
        <StatCard label="Izin" nilai={jml('Excused')} warna={WARNA.Excused} />
        <StatCard label="Alpa" nilai={jml('Absent')} warna={WARNA.Absent} sub={`${jml('Late')} terlambat`} />
      </section>
      <section className="grid g2">
        <div className="card"><h3 className="card-judul">% kehadiran harian — 30 hari</h3><ChartTren data={tren} tinggi={170} /></div>
        <div className="card"><h3 className="card-judul">Komposisi status</h3>
          {total ? <ChartDonut judulTengah={`${total}`} data={['Present', 'Late', 'Sick', 'Excused', 'Absent'].map((k) => ({ label: LABEL_STATUS[k], nilai: jml(k), warna: WARNA[k] }))} /> : <Kosong pesan="Belum ada presensi pada periode ini." />}
        </div>
      </section>
      <section className="grid g2">
        <div className="card"><h3 className="card-judul">% kehadiran per rombel (terendah dulu)</h3>{perKelas.length ? <ChartBatang data={perKelas} /> : <Kosong pesan="Belum ada data." />}</div>
        <div className="card"><h3 className="card-judul">Santri dengan alpa terbanyak</h3>
          {perSantri.length ? <BarHorizontal satuan="alpa" data={perSantri.map((p) => ({ label: santriAlpa.find((s) => s.id === p.studentId)?.person.fullName ?? '-', nilai: p._count._all, warna: WARNA.Absent }))} /> : <Kosong pesan="Tidak ada alpa pada periode ini." />}
        </div>
      </section>
      <div className="card">
        <h3 className="card-judul">Rombel yang belum mengisi presensi sekolah hari ini</h3>
        {!sekolahHariIni ? <Kosong pesan="Tidak ada sesi sekolah hari ini." /> : belumIsi.length === 0 ? <Kosong pesan="Semua rombel sudah mengisi presensi hari ini." /> : (
          <Tabel kolom={['Rombel', 'Unit', 'Wali kelas', 'Aksi']}>
            {belumIsi.map((k) => (
              <tr key={k.id} data-testid={`belum-isi-${k.nama}`}>
                <td>{k.nama}</td><td>{k.unit.nama}</td><td>{k.waliKelasPegawai?.person.fullName ?? k.waliKelas ?? '-'}</td>
                <td><Link className="btn-sekunder" href={`/presensi?tab=siswa&sesi=SEKOLAH&kelas=${k.id}`}>Isi</Link></td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
    </>
  );
}

async function DashboardPegawai({ periode, unitIds, bolehFoto }: { periode: string; unitIds: number[] | null; bolehFoto: boolean }) {
  const { dari, sampai } = rentang(periode);
  const hariIni = tanggalWib();
  const whereStaf = { status: 'Aktif', person: { user: { aktif: true } }, ...(unitIds ? { OR: [{ unitId: { in: unitIds } }, { otherUnits: { some: { unitId: { in: unitIds } } } }] } : {}) };
  const tiga0 = tanggalWib(new Date(Date.now() - 29 * 86_400_000));
  const [staf, hariIniRows, perHari, rentangRows, antrean, libur] = await Promise.all([
    prisma.staff.findMany({ where: whereStaf, include: { person: true, unit: true } }),
    prisma.staffAttendance.findMany({ where: { date: tanggalDb(hariIni), staff: whereStaf }, include: { staff: { include: { person: true } } } }),
    prisma.staffAttendance.groupBy({ by: ['date', 'status'], where: { date: { gte: tanggalDb(tiga0), lte: tanggalDb(hariIni) }, checkInAt: { not: null }, staff: whereStaf }, _count: { _all: true } }),
    prisma.staffAttendance.findMany({ where: { date: { gte: tanggalDb(dari), lte: tanggalDb(sampai) }, staff: whereStaf }, select: { staffId: true, status: true, lateMinutes: true, unitId: true } }),
    prisma.staffAttendance.count({ where: { reviewStatus: null, OR: [{ outsideGeofence: true }, { inaccurateLocation: true }], staff: whereStaf } }),
    prisma.holiday.findFirst({ where: { date: tanggalDb(hariIni) } }),
  ]);
  const jadwalHariIni = await prisma.workSchedule.findMany({ where: { hari: hariWib(new Date()), staffId: null } });
  const jamMasukUnit = new Map(jadwalHariIni.map((j) => [j.unitId, j.jamMasuk]));
  const sudah = hariIniRows.filter((r) => r.checkInAt);
  const izinSakit = hariIniRows.filter((r) => ['Sick', 'Excused'].includes(r.status) && !r.checkInAt);
  const terlambat = sudah.filter((r) => r.status === 'Late');
  const tercatat = new Set(hariIniRows.map((r) => String(r.staffId)));
  const belum = libur ? [] : staf.filter((s) => !tercatat.has(String(s.id)) && s.unitId && jamMasukUnit.has(s.unitId));

  const hariList = Array.from({ length: 30 }, (_, i) => tanggalWib(new Date(Date.now() - (29 - i) * 86_400_000)));
  const tren = hariList.map((t) => {
    const b = perHari.filter((r) => r.date.toISOString().slice(0, 10) === t);
    const n = b.reduce((s, r) => s + r._count._all, 0);
    const tepat = b.filter((r) => r.status === 'Present').reduce((s, r) => s + r._count._all, 0);
    return { label: t.slice(8), nilai: n ? Math.round((tepat / n) * 100) : 0 };
  });
  const perUnit = new Map<number, { n: number; menit: number }>();
  const perStaf = new Map<string, number>();
  for (const r of rentangRows) {
    if (r.status !== 'Late') continue;
    if (r.unitId) { const v = perUnit.get(r.unitId) ?? { n: 0, menit: 0 }; v.n++; v.menit += r.lateMinutes ?? 0; perUnit.set(r.unitId, v); }
    perStaf.set(String(r.staffId), (perStaf.get(String(r.staffId)) ?? 0) + 1);
  }
  const semuaUnit = await prisma.unit.findMany();
  const namaStaf = new Map(staf.map((s) => [String(s.id), s.person.fullName]));

  return (
    <>
      <section className="grid g4">
        <StatCard label="Sudah check-in" nilai={sudah.length} sub={`dari ${staf.length} pegawai`} pct={staf.length ? Math.round((sudah.length / staf.length) * 100) : 0} />
        <StatCard label="Belum check-in" nilai={belum.length} warna={WARNA.Absent} sub={libur ? `Libur: ${libur.name}` : undefined} />
        <StatCard label="Terlambat" nilai={terlambat.length} warna={WARNA.Late} />
        <StatCard label="Izin / sakit / dinas" nilai={izinSakit.length} warna={WARNA.Excused} sub={antrean ? `${antrean} perlu ditinjau` : undefined} />
      </section>
      {antrean > 0 && <div className="alert alert-peringatan"><span><b>{antrean} presensi perlu ditinjau</b><Link href="/presensi?tab=tinjau">Buka antrean tinjau &rarr;</Link></span></div>}
      <div className="card">
        <h3 className="card-judul">Belum check-in sampai sekarang</h3>
        {belum.length === 0 ? <Kosong pesan="Semua pegawai berjadwal sudah tercatat hari ini." /> : (
          <Tabel kolom={['Nama', 'Unit', 'Jam masuk jadwal']}>
            {belum.map((s) => <tr key={String(s.id)}><td>{s.person.fullName}</td><td>{s.unit?.nama ?? '-'}</td><td>{s.unitId ? jamMasukUnit.get(s.unitId) : '-'}</td></tr>)}
          </Tabel>
        )}
      </div>
      <section className="grid g2">
        <div className="card"><h3 className="card-judul">% tepat waktu — 30 hari</h3><ChartTren data={tren} tinggi={170} /></div>
        <div className="card"><h3 className="card-judul">Rata-rata menit terlambat per unit</h3>
          {perUnit.size ? <ChartBatang data={[...perUnit.entries()].map(([u, v], i) => ({ label: semuaUnit.find((x) => x.id === u)?.nama ?? '-', nilai: Math.round(v.menit / v.n), warna: ['#7C3AED', '#1D4ED8', '#B45309', '#0F6B3D'][i % 4] }))} /> : <Kosong pesan="Tidak ada keterlambatan pada periode ini." />}
        </div>
      </section>
      <section className="grid g2">
        <div className="card"><h3 className="card-judul">Paling sering terlambat</h3>
          {perStaf.size ? <BarHorizontal satuan="kali" data={[...perStaf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ label: namaStaf.get(id) ?? '-', nilai: n, warna: WARNA.Late }))} /> : <Kosong pesan="Tidak ada keterlambatan." />}
        </div>
        <div className="card"><h3 className="card-judul">Foto check-in hari ini</h3>
          {!bolehFoto ? <Kosong pesan="Foto hanya untuk kepala unit, SDM, dan ketua." /> : sudah.length === 0 ? <Kosong pesan="Belum ada check-in." /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }} data-testid="galeri-selfie">
              {sudah.filter((r) => r.checkInPhotoId).map((r) => (
                <a key={String(r.id)} href={`/berkas/${r.checkInPhotoId}`} target="_blank" rel="noreferrer" title={r.staff.person.fullName} style={{ fontSize: 11, textAlign: 'center', color: 'inherit' }}>
                  <img src={`/berkas/${r.checkInPhotoId}`} alt={r.staff.person.fullName} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 8, outline: r.outsideGeofence ? '3px solid #E8973A' : undefined }} />
                  {r.staff.person.fullName.split(' ')[0]} {r.checkIn}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
