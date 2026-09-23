import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { jadwalKerja, stafSaya } from '@/lib/presensi/akses';
import { LABEL_STATUS, hariWib, tanggalDb, tanggalWib } from '@/lib/presensi/inti';
import { Kosong, Tabel } from '@/components';
import { ajukanIzinPegawai } from './actions';
import { KameraPresensi } from './KameraPresensi';

const HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
const jam = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600_000).toISOString().slice(11, 16) : '-');

/** Presensi Saya (02 §3): check-in/out selfie + riwayat 14 hari + pengajuan izin/sakit/cuti/dinas luar. */
export async function TabSaya({ session }: { session: SessionPayload }) {
  const staff = await stafSaya(session);
  if (!staff) return <div className="card"><Kosong pesan="Akun Anda belum ditautkan ke data pegawai, jadi belum bisa presensi selfie. Hubungi admin SDM." /></div>;
  const sekarang = new Date();
  const tanggal = tanggalWib(sekarang);
  const [hariIni, riwayat, izin, pernah, jadwal, libur] = await Promise.all([
    prisma.staffAttendance.findUnique({ where: { staffId_date: { staffId: staff.id, date: tanggalDb(tanggal) } } }),
    prisma.staffAttendance.findMany({ where: { staffId: staff.id, date: { gte: tanggalDb(tanggalWib(new Date(Date.now() - 14 * 86_400_000))) } }, orderBy: { date: 'desc' } }),
    prisma.staffLeave.findMany({ where: { staffId: staff.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.staffAttendance.count({ where: { staffId: staff.id, source: 'SELFIE' } }),
    jadwalKerja(staff.id, staff.unitId, hariWib(sekarang)),
    prisma.holiday.findFirst({ where: { date: tanggalDb(tanggal), OR: [{ unitId: null }, { unitId: staff.unitId ?? -1 }] } }),
  ]);
  const lengkap = Boolean(hariIni?.checkInAt && hariIni.checkOutAt);

  return (
    <div className="grid g2" style={{ gap: 16, alignItems: 'start' }}>
      <div className="card">
        <h3 className="card-judul">{hariIni?.checkInAt ? 'Check-out' : 'Check-in'} hari ini</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          {staff.person.fullName} · {HARI[hariWib(sekarang)]}, {new Date(`${tanggal}T00:00:00Z`).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'UTC' })}
          {jadwal ? ` · jam kerja ${jadwal.jamMasuk}–${jadwal.jamPulang} (toleransi ${jadwal.toleransiMenit} mnt)` : ' · tidak ada jam kerja hari ini'}
          {libur ? ` · Libur: ${libur.name}` : ''}
        </p>
        {hariIni && (
          <div style={{ display: 'flex', gap: 14, fontSize: 13, marginBottom: 10 }} data-testid="ringkas-hari-ini">
            <span>Masuk <b>{jam(hariIni.checkInAt)}</b></span><span>Pulang <b>{jam(hariIni.checkOutAt)}</b></span>
            <span className={`badge ${hariIni.status === 'Late' ? 'badge-kuning' : 'badge-hijau'}`}>{LABEL_STATUS[hariIni.status]}{hariIni.lateMinutes ? ` ${hariIni.lateMinutes} mnt` : ''}</span>
            {hariIni.outsideGeofence && <span className="badge badge-oranye">Luar lokasi</span>}
          </div>
        )}
        {lengkap ? <div className="alert alert-sukses"><span>Presensi hari ini sudah lengkap. Terima kasih.</span></div>
          : <KameraPresensi jenis={hariIni?.checkInAt ? 'pulang' : 'masuk'} pemberitahuanPertama={pernah === 0} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <h3 className="card-judul">Riwayat 14 hari</h3>
          {riwayat.length === 0 ? <Kosong pesan="Belum ada riwayat presensi." /> : (
            <Tabel kolom={['Tanggal', 'Masuk', 'Pulang', 'Status', 'Catatan']}>
              {riwayat.map((r) => (
                <tr key={String(r.id)}>
                  <td>{r.date.toLocaleDateString('id-ID', { timeZone: 'UTC' })}</td><td>{r.checkIn ?? jam(r.checkInAt)}</td><td>{r.checkOut ?? jam(r.checkOutAt)}</td>
                  <td>{LABEL_STATUS[r.status]}{r.earlyDeparture ? ' · pulang cepat' : ''}</td>
                  <td style={{ fontSize: 12 }}>{[r.outsideGeofence && 'luar lokasi', r.reviewStatus && `tinjauan: ${r.reviewStatus}`, r.notes].filter(Boolean).join(' · ') || '-'}</td>
                </tr>
              ))}
            </Tabel>
          )}
        </div>
        <div className="card">
          <h3 className="card-judul">Ajukan izin / sakit / cuti / dinas luar</h3>
          <form action={ajukanIzinPegawai} className="grid g2">
            <input type="hidden" name="_kembali" value="/presensi?tab=saya" />
            <div className="field"><label>Jenis</label><select name="jenis"><option>Sakit</option><option>Izin</option><option>Cuti</option><option value="DinasLuar">Dinas luar</option></select></div>
            <div className="field"><label>Lampiran (opsional)</label><input type="file" name="lampiran" accept="image/*,application/pdf" /></div>
            <div className="field"><label>Dari *</label><input type="date" name="dari" required defaultValue={tanggal} /></div>
            <div className="field"><label>Sampai</label><input type="date" name="sampai" defaultValue={tanggal} /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><label>Alasan *</label><input name="alasan" required /></div>
            <button type="submit" className="btn-sekunder">Kirim pengajuan</button>
          </form>
          {izin.length > 0 && (
            <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {izin.map((z) => <li key={String(z.id)}>{z.jenis} {z.dari.toISOString().slice(0, 10)}{z.sampai > z.dari ? ` s.d. ${z.sampai.toISOString().slice(0, 10)}` : ''} — <b>{z.status}</b>{z.note ? ` (${z.note})` : ''}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
