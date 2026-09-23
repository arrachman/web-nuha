import { prisma } from '@/lib/prisma';
import { Tabel } from '@/components';
import { hapusLibur, simpanJadwalKerja, simpanSesi, simpanTitikUnit, tambahLibur } from './actions';

const K = '/presensi?tab=pengaturan';
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
const gaya = { padding: '7px 9px', borderRadius: 8, border: '1px solid var(--garis)' } as const;
const kembali = <input type="hidden" name="_kembali" value={K} />;

/** Pengaturan presensi (02 §6 langkah 2): sesi, jam kerja per unit, libur, titik & radius unit. */
export async function TabPengaturan() {
  const [sesi, units, jadwal, libur] = await Promise.all([
    prisma.attendanceSession.findMany({ orderBy: { order: 'asc' } }),
    prisma.unit.findMany({ orderBy: { id: 'asc' } }),
    prisma.workSchedule.findMany({ where: { staffId: null } }),
    prisma.holiday.findMany({ where: { date: { gte: new Date(Date.now() - 30 * 86_400_000) } }, orderBy: { date: 'asc' } }),
  ]);
  const namaUnit = new Map(units.map((u) => [u.id, u.nama]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 className="card-judul">Sesi presensi santri</h3>
        <Tabel kolom={['Kode', 'Nama', 'Unit', 'Per', 'Mulai', 'Batas terlambat', 'Hari aktif', 'Status']}>
          {sesi.map((s) => (
            <tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td>{s.unitId ? namaUnit.get(s.unitId) : 'SMP & MA'}</td><td>{s.grouping === 'ASRAMA' ? 'Asrama' : 'Rombel'}</td>
              <td>{s.jamMulai}</td><td>{s.batasTerlambat}</td><td style={{ fontSize: 12 }}>{HARI.filter((_, i) => s.hariAktif & (1 << i)).map((h) => h.slice(0, 3)).join(', ')}</td>
              <td>{s.aktif ? <span className="badge badge-hijau">Aktif</span> : <span className="badge badge-netral">Nonaktif</span>}</td></tr>
          ))}
        </Tabel>
        <form action={simpanSesi} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          {kembali}
          <input name="code" required placeholder="KODE" style={{ ...gaya, width: 130 }} />
          <input name="name" required placeholder="Nama sesi" style={gaya} />
          <select name="unitId" style={gaya}><option value="">SMP & MA</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
          <select name="grouping" style={gaya}><option value="KELAS">per rombel</option><option value="ASRAMA">per asrama</option></select>
          <input name="jamMulai" type="time" required style={gaya} aria-label="Jam mulai" />
          <input name="batasTerlambat" type="time" required style={gaya} aria-label="Batas terlambat" />
          {HARI.map((h, i) => <label key={h} style={{ fontSize: 12 }}><input type="checkbox" name="hari" value={i + 1} defaultChecked={i < 6} /> {h.slice(0, 3)}</label>)}
          <label style={{ fontSize: 12 }}><input type="checkbox" name="aktif" defaultChecked /> aktif</label>
          <button type="submit" className="btn-sekunder">Simpan sesi</button>
        </form>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Kode yang sudah ada akan diperbarui (mis. ubah jam MADIN dengan kode MADIN).</p>
      </div>

      <div className="card">
        <h3 className="card-judul">Jam kerja pegawai per unit</h3>
        <div className="grid g2">
          {units.filter((u) => u.key !== 'Poskestren').map((u) => (
            <form key={u.id} action={simpanJadwalKerja} style={{ border: '1px solid var(--garis)', borderRadius: 10, padding: 10 }}>
              {kembali}<input type="hidden" name="unitId" value={u.id} />
              <b style={{ fontSize: 13 }}>{u.nama}</b>
              {HARI.map((h, i) => {
                const j = jadwal.find((x) => x.unitId === u.id && x.hari === i + 1);
                return (
                  <div key={h} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 70px', gap: 6, marginTop: 6, fontSize: 12, alignItems: 'center' }}>
                    <span>{h}</span>
                    <input type="time" name={`masuk_${i + 1}`} defaultValue={j?.jamMasuk ?? ''} style={gaya} aria-label={`Masuk ${h} ${u.nama}`} />
                    <input type="time" name={`pulang_${i + 1}`} defaultValue={j?.jamPulang ?? ''} style={gaya} aria-label={`Pulang ${h} ${u.nama}`} />
                    <input type="number" name={`toleransi_${i + 1}`} defaultValue={j?.toleransiMenit ?? 15} min={0} style={gaya} aria-label={`Toleransi ${h} ${u.nama}`} />
                  </div>
                );
              })}
              <button type="submit" className="btn-sekunder" style={{ marginTop: 8 }}>Simpan jam {u.nama}</button>
            </form>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Kosongkan jam untuk hari tanpa kerja. Kolom terakhir = toleransi terlambat (menit).</p>
      </div>

      <section className="grid g2">
        <div className="card">
          <h3 className="card-judul">Hari libur</h3>
          <Tabel kolom={['Tanggal', 'Nama', 'Unit', 'Aksi']}>
            {libur.map((l) => (
              <tr key={l.id}><td>{l.date.toISOString().slice(0, 10)}</td><td>{l.name}</td><td>{l.unitId ? namaUnit.get(l.unitId) : 'Semua'}</td>
                <td><form action={hapusLibur}>{kembali}<input type="hidden" name="id" value={l.id} /><button type="submit" className="btn-sekunder" style={{ fontSize: 12 }}>Hapus</button></form></td></tr>
            ))}
          </Tabel>
          <form action={tambahLibur} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {kembali}
            <input type="date" name="date" required style={gaya} aria-label="Tanggal libur" />
            <input name="name" required placeholder="Nama libur" style={gaya} />
            <select name="unitId" style={gaya}><option value="">Semua unit</option>{units.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}</select>
            <button type="submit" className="btn-sekunder">Tambah</button>
          </form>
        </div>
        <div className="card">
          <h3 className="card-judul">Titik & radius presensi selfie</h3>
          {units.map((u) => (
            <form key={u.id} action={simpanTitikUnit} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 80px auto', gap: 6, marginBottom: 6, alignItems: 'center', fontSize: 12 }}>
              {kembali}<input type="hidden" name="unitId" value={u.id} />
              <b>{u.nama}</b>
              <input name="latitude" defaultValue={u.latitude ? String(u.latitude) : ''} placeholder="lintang" style={gaya} aria-label={`Lintang ${u.nama}`} />
              <input name="longitude" defaultValue={u.longitude ? String(u.longitude) : ''} placeholder="bujur" style={gaya} aria-label={`Bujur ${u.nama}`} />
              <input name="radius" type="number" defaultValue={u.radiusPresensiM} style={gaya} aria-label={`Radius ${u.nama}`} />
              <button type="submit" className="btn-sekunder" style={{ fontSize: 12 }}>Simpan</button>
            </form>
          ))}
          <p className="muted" style={{ fontSize: 12 }}>Di luar radius presensi tetap diterima, tetapi wajib alasan dan masuk antrean tinjau.</p>
        </div>
      </section>
    </div>
  );
}
