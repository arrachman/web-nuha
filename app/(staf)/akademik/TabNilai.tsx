import { prisma } from '@/lib/prisma';
import { Kosong, satu, type SearchParams } from '@/components';
import { simpanNilaiKelas } from './actions';
import { bacaFilter } from './filter';
import { bacaKelasOpsi } from './kelas-opsi';

const PERIODE_DEFAULT = 'Ganjil 2026/2027';

type Params = SearchParams;

export async function TabNilai({ searchParams }: { searchParams: Params }) {
  const f = bacaFilter(searchParams);
  const [kelasOpts, mapelOpts] = await Promise.all([
    bacaKelasOpsi(f),
    prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } }),
  ]);

  // Kelas dari penjelajah menang; kalau belum memilih, jatuh ke rombel pertama
  // yang tersisa setelah unit/tingkat dipersempit.
  const kelasId = (f.kelasId && kelasOpts.some((k) => k.id === f.kelasId) ? f.kelasId : 0) || kelasOpts[0]?.id;
  const mapelId = Number(satu(searchParams.mapel)) || mapelOpts[0]?.id;
  const periode = satu(searchParams.periode) || PERIODE_DEFAULT;
  const kelas = kelasOpts.find((k) => k.id === kelasId);
  const mapel = mapelOpts.find((m) => m.id === mapelId);

  const siswa = kelasId
    ? await prisma.santri.findMany({ where: { kelasId }, include: { person: true }, orderBy: { person: { fullName: 'asc' } } })
    : [];
  const nilaiAda = kelasId && mapelId
    ? await prisma.nilai.findMany({ where: { mapelId, periode, santri: { kelasId } } })
    : [];
  const nilaiBySantri = new Map(nilaiAda.map((n) => [String(n.santriId), n]));

  return (
    <div className="card">
      <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <input type="hidden" name="tab" value="nilai" />
        {f.unit && <input type="hidden" name="unit" value={f.unit} />}
        {f.tingkat && <input type="hidden" name="tingkat" value={f.tingkat} />}
        <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
          <label>Kelas</label>
          <select name="kelas" defaultValue={kelasId}>
            {kelasOpts.map((o) => <option key={o.id} value={o.id}>{o.unit.nama} · {o.nama}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 200, marginBottom: 0 }}>
          <label>Mata pelajaran</label>
          <select name="mapel" defaultValue={mapelId}>
            {mapelOpts.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 170, marginBottom: 0 }}>
          <label>Periode</label>
          <input type="text" name="periode" defaultValue={periode} />
        </div>
        <button type="submit" className="btn-sekunder">Tampilkan</button>
      </form>

      {(!kelas || !mapel) && <Kosong pesan="Belum ada kelas atau mata pelajaran yang bisa dipilih." />}
      {kelas && mapel && siswa.length === 0 && <Kosong pesan="Kelas ini belum punya siswa." />}

      {kelas && mapel && siswa.length > 0 && (
        <form action={simpanNilaiKelas}>
          <input type="hidden" name="kelasId" value={kelasId} />
          <input type="hidden" name="mapelId" value={mapelId} />
          <input type="hidden" name="periode" value={periode} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 className="card-judul">Input nilai — {kelas.unit.nama} {kelas.nama}, {mapel.nama}</h3>
              <p className="card-sub">Periode {periode} · KKM {mapel.kkm}</p>
            </div>
            <button type="submit" className="btn">Simpan nilai</button>
          </div>
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr>
                  <th>Santri</th>
                  <th className="num">Tugas</th>
                  <th className="num">UTS</th>
                  <th className="num">UAS</th>
                  <th className="num">Nilai akhir</th>
                </tr>
              </thead>
              <tbody>
                {siswa.map((s) => {
                  const n = nilaiBySantri.get(String(s.id));
                  return (
                    <tr key={String(s.id)}>
                      <td>
                        <input type="hidden" name="santriId" value={String(s.id)} />
                        {s.person.fullName}
                      </td>
                      <td className="num"><input type="number" min={0} max={100} name={`tugas-${s.id}`} defaultValue={n ? Number(n.tugas) : 0} style={{ width: 64 }} /></td>
                      <td className="num"><input type="number" min={0} max={100} name={`uts-${s.id}`} defaultValue={n ? Number(n.uts) : 0} style={{ width: 64 }} /></td>
                      <td className="num"><input type="number" min={0} max={100} name={`uas-${s.id}`} defaultValue={n ? Number(n.uas) : 0} style={{ width: 64 }} /></td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--hijau-gelap)' }}>{n ? Number(n.akhir).toFixed(1) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </div>
  );
}
