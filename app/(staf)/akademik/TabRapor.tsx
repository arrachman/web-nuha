import { prisma } from '@/lib/prisma';
import { Kosong, type SearchParams } from '@/components';
import { bacaFilter } from './filter';
import { bacaKelasOpsi } from './kelas-opsi';

type Params = SearchParams;

export async function TabRapor({ searchParams }: { searchParams: Params }) {
  const f = bacaFilter(searchParams);
  const kelasOpts = await bacaKelasOpsi(f);
  // Rombel dari penjelajah menang; kalau belum dipilih, ambil yang pertama tersisa.
  const kelasId = (f.kelasId && kelasOpts.some((k) => k.id === f.kelasId) ? f.kelasId : 0) || kelasOpts[0]?.id;
  const kelas = kelasOpts.find((k) => k.id === kelasId);

  const siswa = kelasId
    ? await prisma.santri.findMany({
        where: { kelasId },
        include: {
          person: true,
          nilai: true,
          memorization: true,
          discipline: true,
          attendance: true,
        },
        orderBy: { person: { fullName: 'asc' } },
      })
    : [];

  return (
    <div className="card">
      <h3 className="card-judul">Cetak rapor</h3>
      <p className="card-sub" style={{ maxWidth: 640 }}>
        Rapor menggabungkan nilai akademik unit sekolah, capaian hafalan Al-Qur&apos;an, catatan
        kepesantrenan, dan rekap kehadiran jamaah dalam satu dokumen. Pilih rombel untuk melihat
        ringkasan sebelum dikirim ke antrean cetak.
      </p>
      <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', margin: '16px 0' }}>
        <input type="hidden" name="tab" value="rapor" />
        {f.unit && <input type="hidden" name="unit" value={f.unit} />}
        {f.tingkat && <input type="hidden" name="tingkat" value={f.tingkat} />}
        <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
          <label>Rombel</label>
          <select name="kelas" defaultValue={kelasId}>
            {kelasOpts.map((o) => <option key={o.id} value={o.id}>{o.unit.nama} · {o.nama}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-sekunder">Tampilkan</button>
      </form>

      {!kelas && <Kosong pesan="Belum ada rombel yang bisa dipilih." />}
      {kelas && siswa.length === 0 && <Kosong pesan="Rombel ini belum punya siswa." />}

      {kelas && siswa.length > 0 && (
        <div className="tabel-wrap">
          <table>
            <thead>
              <tr>
                <th>Santri</th>
                <th className="num">Rata-rata nilai</th>
                <th className="num">Hafalan tercatat</th>
                <th className="num">Poin ta&apos;zir</th>
                <th className="num">Kehadiran jamaah</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => {
                const rataNilai = s.nilai.length === 0 ? null : s.nilai.reduce((sum, n) => sum + Number(n.akhir), 0) / s.nilai.length;
                const poinTazir = s.discipline.reduce((sum, t) => sum + t.points, 0);
                const hadir = s.attendance.filter((p) => p.status === 'Present').length;
                const persenHadir = s.attendance.length === 0 ? null : (hadir / s.attendance.length) * 100;
                return (
                  <tr key={String(s.id)}>
                    <td>{s.person.fullName}</td>
                    <td className="num">{rataNilai === null ? '-' : rataNilai.toFixed(1)}</td>
                    <td className="num">{s.memorization.length}</td>
                    <td className="num">{poinTazir}</td>
                    <td className="num">{persenHadir === null ? '-' : `${Math.round(persenHadir)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
