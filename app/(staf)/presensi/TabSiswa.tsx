import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { can } from '@/lib/access';
import { asramaBolehInput, rombelBolehInput, santriAsrama, santriRombel, statusOtomatis, type IzinPresensi } from '@/lib/presensi/akses';
import { HURUF_STATUS, hariDariTanggal, sesiAktifPadaHari, tanggalDb, tanggalWib, terkunci } from '@/lib/presensi/inti';
import { Kosong, satu, type SearchParams } from '@/components';
import { simpanPresensiRombel } from './actions';

const PILIHAN = [
  { k: 'H', label: 'H', judul: 'Hadir', warna: '#0F6B3D' }, { k: 'S', label: 'S', judul: 'Sakit', warna: '#1D4ED8' },
  { k: 'I', label: 'I', judul: 'Izin', warna: '#B45309' }, { k: 'A', label: 'A', judul: 'Alpa', warna: '#B91C1C' }, { k: 'T', label: 'T', judul: 'Terlambat', warna: '#7C3AED' },
];

/**
 * Input presensi per rombel/asrama (02 §2.2): default semua Hadir, operator
 * cukup mengubah pengecualian. Izin pondok & Poskestren terisi otomatis.
 */
export async function TabSiswa({ session, sp }: { session: SessionPayload; izin: IzinPresensi; sp: SearchParams }) {
  const hariIni = tanggalWib();
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(satu(sp.tanggal)) ? satu(sp.tanggal) : hariIni;
  const semuaSesi = await prisma.attendanceSession.findMany({ where: { aktif: true }, orderBy: { order: 'asc' } });
  const sesiHari = semuaSesi.filter((s) => sesiAktifPadaHari(s.hariAktif, hariDariTanggal(tanggal)));
  const sesi = semuaSesi.find((s) => s.code === satu(sp.sesi)) ?? sesiHari[0] ?? semuaSesi[0];
  if (!sesi) return <div className="card"><Kosong pesan="Belum ada sesi presensi. Atur di tab Pengaturan." /></div>;

  const asrama = sesi.grouping === 'ASRAMA';
  const [rombel, daftarAsrama] = await Promise.all([
    asrama ? Promise.resolve([]) : rombelBolehInput(session, tanggal, sesi.unitId),
    asrama ? asramaBolehInput(session) : Promise.resolve([]),
  ]);
  const pilihanGrup = asrama ? daftarAsrama.map((a) => ({ id: a.id, nama: a.name })) : rombel.map((k) => ({ id: k.id, nama: `${k.nama} — ${k.unit.nama}` }));
  const grupId = Number(satu(asrama ? sp.asrama : sp.kelas)) || pilihanGrup[0]?.id;
  const grup = pilihanGrup.find((g) => g.id === grupId);

  const santri = grup ? (asrama ? await santriAsrama(grup.id) : await santriRombel(grup.id)) : [];
  const ids = santri.map((s) => s.id);
  const [lama, otomatis, bolehKunci, bolehTimpa] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId: { in: ids }, date: tanggalDb(tanggal), session: sesi.code } }),
    statusOtomatis(ids, tanggal),
    can(session, 'presensi.lock'),
    can(session, 'presensi.override'),
  ]);
  const lamaById = new Map(lama.map((r) => [String(r.studentId), r]));
  const kunci = terkunci(tanggal);
  const sudahDiisi = lama.length > 0;
  const kembali = `/presensi?tab=siswa&tanggal=${tanggal}&sesi=${sesi.code}&${asrama ? 'asrama' : 'kelas'}=${grup?.id ?? ''}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form method="get" className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
        <input type="hidden" name="tab" value="siswa" />
        <div className="field" style={{ marginBottom: 0 }}><label>Tanggal</label><input type="date" name="tanggal" defaultValue={tanggal} max={hariIni} /></div>
        <div className="field" style={{ marginBottom: 0 }}><label>Sesi</label>
          <select name="sesi" defaultValue={sesi.code}>{semuaSesi.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.jamMulai})</option>)}</select>
        </div>
        {pilihanGrup.length > 0 && (
          <div className="field" style={{ marginBottom: 0 }}><label>{asrama ? 'Asrama' : 'Rombel'}</label>
            <select name={asrama ? 'asrama' : 'kelas'} defaultValue={grup?.id}>{pilihanGrup.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}</select>
          </div>
        )}
        <button type="submit" className="btn-sekunder">Tampilkan</button>
      </form>

      {!sesiAktifPadaHari(sesi.hariAktif, hariDariTanggal(tanggal)) && <div className="alert alert-peringatan"><span>Sesi {sesi.name} tidak berlangsung pada hari ini.</span></div>}
      {pilihanGrup.length === 0 ? (
        <div className="card"><Kosong pesan={asrama ? 'Anda tidak memegang asrama mana pun untuk sesi pondok.' : 'Tidak ada rombel yang bisa Anda isi hari ini (bukan wali kelas, tidak mengajar, dan tidak piket).'} /></div>
      ) : santri.length === 0 ? (
        <div className="card"><Kosong pesan="Belum ada santri aktif di sini." /></div>
      ) : (
        <form action={simpanPresensiRombel} className="card">
          <input type="hidden" name="_kembali" value={kembali} />
          <input type="hidden" name="tanggal" value={tanggal} />
          <input type="hidden" name="sesi" value={sesi.code} />
          <input type="hidden" name={asrama ? 'asramaId' : 'kelasId'} value={grup!.id} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <h3 className="card-judul" style={{ margin: 0 }}>{grup!.nama} · {sesi.name} · {new Date(`${tanggal}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3>
            <span className={`badge ${sudahDiisi ? 'badge-hijau' : 'badge-kuning'}`}>{sudahDiisi ? `Sudah diisi (${lama.length})` : 'Belum diisi — default semua Hadir'}</span>
          </div>
          {kunci && (
            <div className={`alert ${bolehKunci ? 'alert-peringatan' : 'alert-kritis'}`} style={{ marginBottom: 12 }}>
              <span><b>Presensi tanggal ini sudah terkunci.</b>{bolehKunci ? 'Perubahan wajib disertai alasan dan dicatat di audit.' : 'Perubahan hanya bisa dilakukan kepala unit/pengasuh.'}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {santri.map((s, i) => {
              const k = String(s.id);
              const r = lamaById.get(k);
              const auto = otomatis.get(k);
              const terlindung = (r && ['IZIN', 'POSKESTREN'].includes(r.source)) || (!r && auto);
              const kini = HURUF_STATUS[r?.status ?? auto?.status ?? 'Present'] ?? 'H';
              return (
                <div key={k} data-testid={`santri-${s.id}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0EDE4' }}>
                  <span className="muted" style={{ fontSize: 12 }}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.person.fullName}</div>
                    {terlindung && <span className="badge badge-biru" style={{ fontSize: 10.5 }}>{auto?.ket ?? r?.note ?? r?.source}{bolehTimpa ? '' : ' · terkunci otomatis'}</span>}
                    <input name={`cat_${k}`} defaultValue={r?.source === 'MANUAL' ? r?.note ?? '' : ''} placeholder="catatan" aria-label={`Catatan ${s.person.fullName}`} style={{ marginTop: 4, width: '100%', maxWidth: 260, padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--garis)' }} />
                  </div>
                  <div role="radiogroup" aria-label={`Status ${s.person.fullName}`} style={{ display: 'flex', gap: 4 }}>
                    {PILIHAN.map((p) => (
                      <label key={p.k} title={p.judul} style={{ cursor: 'pointer' }}>
                        <input type="radio" name={`st_${k}`} value={p.k} defaultChecked={kini === p.k} aria-label={`${p.judul} ${s.person.fullName}`} className="pilih-status" style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
                        <span className="chip-status" style={{ ['--warna' as string]: p.warna }}>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {kunci && bolehKunci && <div className="field" style={{ marginTop: 12 }}><label>Alasan perubahan *</label><input name="alasan" required placeholder="mis. koreksi surat sakit menyusul" /></div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <button type="submit" className="btn" disabled={kunci && !bolehKunci}>Simpan presensi</button>
            <span className="muted" style={{ fontSize: 12 }}>H Hadir · S Sakit · I Izin · A Alpa · T Terlambat</span>
          </div>
        </form>
      )}
    </div>
  );
}
