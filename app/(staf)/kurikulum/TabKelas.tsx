import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth';
import { Kosong, ProgressBar } from '@/components';
import { ambilKelasGuru, type KartuKelas } from './kelas-guru';

const warnaKelengkapan = (pct: number) => (pct >= 90 ? '#0F6B3D' : pct >= 60 ? '#E8973A' : '#B91C1C');

const tanggal = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

/**
 * Kelas & mapel yang diampu guru, dikelompokkan per unit karena seorang guru
 * lazim mengajar di SMP dan MA sekaligus, bahkan merangkap ustadz di pondok.
 * Kecocokan masih lewat nama pada jadwal pelajaran — jadwal belum ber-FK pegawai.
 */
export async function TabKelas({ session }: { session: SessionPayload }) {
  const namaGuru = session.nama?.trim();
  if (!namaGuru) return <Kosong pesan="Nama pengguna tidak tersedia." />;

  const grup = await ambilKelasGuru(namaGuru);
  if (grup.length === 0) {
    // Bedakan "belum diampukan" dari "namanya tidak cocok": keduanya tampak
    // sama di layar tetapi penyelesaiannya berbeda.
    const adaJadwal = await prisma.jadwalPelajaran.count({ where: { guru: { not: null } } });
    return (
      <Kosong
        pesan={adaJadwal > 0
          ? `Tidak ada jadwal atas nama "${namaGuru}". Nama pada jadwal pelajaran harus sama persis dengan nama akun.`
          : 'Jadwal pelajaran masih kosong. Isi lewat Master Data terlebih dahulu.'}
      />
    );
  }

  const totalKelas = grup.reduce((total, g) => total + g.kartu.length, 0);
  const totalJam = grup.reduce((total, g) => total + g.kartu.reduce((n, k) => n + k.jamPerPekan, 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p className="muted" style={{ fontSize: 13 }}>
        {totalKelas} pengampuan · {totalJam} JP per pekan · {grup.length} unit
      </p>
      {grup.map((g) => (
        <section key={g.unit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 className="card-judul" style={{ marginBottom: 0 }}>{g.unit}</h3>
          <div className="grid g2">
            {g.kartu.map((k) => <Kartu key={k.key} k={k} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Kartu({ k }: { k: KartuKelas }) {
  const { presensi: p } = k;
  const sudahAbsen = p.hadir + p.sakit + p.izin + p.alpa;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 className="card-judul">Kelas {k.kelas} · {k.mapel}</h3>
          <p className="muted" style={{ marginTop: 3, fontSize: 12.5 }}>
            {k.jumlahSiswa} siswa · {k.jamPerPekan} JP/pekan · {k.hari.join(', ')}
            {k.kkm !== null && ` · KKM ${k.kkm}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {k.peran.map((peran) => (
            <span key={peran} className={peran === 'Wali Kelas' ? 'badge badge-kuning' : 'badge badge-toska'}>{peran}</span>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span className="muted">Kelengkapan input nilai</span>
          <strong style={{ color: warnaKelengkapan(k.nilaiMasuk) }}>
            {k.nilaiMasuk}%{k.rerataNilai !== null && ` · rerata ${k.rerataNilai.toFixed(1)}`}
          </strong>
        </div>
        <ProgressBar pct={k.nilaiMasuk} warna={warnaKelengkapan(k.nilaiMasuk)} />
      </div>

      <div className="inset" style={{ fontSize: 12.5 }}>
        {k.jumlahSiswa === 0
          ? 'Kelas ini belum berisi santri, jadi presensi dan nilai belum bisa diisi.'
          : sudahAbsen === 0
            ? `Presensi hari ini belum diisi untuk ${k.jumlahSiswa} santri.`
            : `Presensi hari ini: ${p.hadir} hadir · ${p.sakit} sakit · ${p.izin} izin · ${p.alpa} alpa`
              + (p.belum > 0 ? ` · ${p.belum} belum tercatat` : '')}
      </div>

      {k.ujianBerikut && (
        <div className="alert alert-info" style={{ fontSize: 12.5 }}>
          <span>
            <strong>{k.ujianBerikut.nama}</strong> — {tanggal(k.ujianBerikut.tgl)}, {k.ujianBerikut.waktu}.
            {k.ujianBerikut.belumDinilai > 0
              ? ` ${k.ujianBerikut.belumDinilai} santri belum dinilai.`
              : ' Semua nilai sudah masuk.'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/akademik?tab=nilai&kelas=${encodeURIComponent(k.kelas)}`} className="btn btn-sekunder">Input nilai</Link>
        <Link href={`/akademik?tab=presensi&kelas=${encodeURIComponent(k.kelas)}`} className="btn btn-sekunder">Presensi</Link>
        <Link href="/ujian?tab=nilai" className="btn btn-sekunder">Nilai ujian</Link>
      </div>
    </div>
  );
}
