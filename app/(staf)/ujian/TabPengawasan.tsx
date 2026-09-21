import { prisma } from '@/lib/prisma';
import { Kosong, Tabel } from '@/components';
import { bukaBekuan } from './cbt-actions';
import { PanelEsai } from './PanelEsai';

const WARNA_PESERTA: Record<string, string> = {
  Belum: 'badge-netral',
  Mengerjakan: 'badge-kuning',
  Selesai: 'badge-hijau',
  Dibekukan: 'badge-merah',
};

/** Nama jenis pelanggaran dalam bahasa yang dimengerti pengawas. */
const NAMA_PELANGGARAN: Record<string, string> = {
  PINDAH_TAB: 'Pindah tab / jendela',
  KELUAR_FULLSCREEN: 'Keluar mode layar penuh',
  TEMPEL_TEKS: 'Menempel teks dari luar',
  SALIN_TEKS: 'Menyalin soal',
  TOKEN_SALAH: 'Token salah',
  DI_LUAR_ZONA: 'Di luar zona jaringan',
  BUKAN_EXAM_BROWSER: 'Bukan Exam Browser',
};

const jam = (d: Date) => d.toLocaleString('id-ID', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

/**
 * Layar pengawas: hasil tiap peserta, jejak pelanggarannya, dan tombol membuka
 * kembali sesi yang dibekukan. Pembekuan tidak pernah dibatalkan otomatis —
 * pengawas yang memutuskan, dan keputusannya masuk audit.
 */
export async function TabPengawasan({
  searchParams,
  bolehKelola,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  bolehKelola: boolean;
}) {
  const sesiTerpilih = Number(searchParams.sesi ?? 0);

  const daftarSesi = await prisma.sesiCbt.findMany({
    include: { paket: { select: { nama: true } }, kelas: { select: { nama: true } } },
    orderBy: { mulai: 'desc' },
  });
  if (daftarSesi.length === 0) return <Kosong pesan="Belum ada sesi CBT untuk diawasi." />;

  const aktif = daftarSesi.find((s) => s.id === sesiTerpilih) ?? daftarSesi[0];

  const peserta = await prisma.pesertaCbt.findMany({
    where: { sesiId: aktif.id },
    include: {
      santri: { select: { nis: true, person: { select: { fullName: true } } } },
      log: { orderBy: { at: 'desc' }, take: 5 },
      _count: { select: { jawaban: true } },
    },
    orderBy: { noPeserta: 'asc' },
  });

  return (
    <>
      <div className="card">
        <h3 className="card-judul">Pilih sesi</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {daftarSesi.map((s) => (
            <a
              key={s.id}
              href={`/ujian?tab=pengawasan&sesi=${s.id}`}
              className={`btn ${s.id === aktif.id ? 'btn' : 'btn-sekunder'}`}
              style={{ fontSize: 12.5 }}
            >
              {s.paket.nama} · {s.kelas.nama}
            </a>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-judul">Peserta {aktif.paket.nama} — {aktif.kelas.nama}</h3>
        <p className="card-sub" style={{ marginBottom: 14 }}>
          Sesi dibekukan otomatis setelah {aktif.batasPelanggaran} pelanggaran. Skor peserta yang masih
          punya esai belum dinilai bersifat sementara.
        </p>
        {peserta.length === 0
          ? <Kosong pesan="Peserta belum diterbitkan untuk sesi ini." />
          : (
            <Tabel kolom={['No', 'Santri', 'Dijawab', 'Benar', 'Salah', 'Kosong', 'Skor', 'Theta', 'Pelanggaran', 'Status', bolehKelola ? 'Tindakan' : '']}>
              {peserta.map((p) => (
                <tr key={String(p.id)}>
                  <td><code>{p.noPeserta}</code></td>
                  <td>
                    {p.santri.person.fullName}
                    <div className="muted" style={{ fontSize: 12 }}>{p.santri.nis}</div>
                  </td>
                  <td className="num">{p._count.jawaban}</td>
                  <td className="num">{p.benar}</td>
                  <td className="num">{p.salah}</td>
                  <td className="num">{p.kosong}</td>
                  <td className="num"><b>{Number(p.skor).toFixed(2)}</b></td>
                  <td className="num">{p.theta === null ? '—' : Number(p.theta).toFixed(2)}</td>
                  <td style={{ fontSize: 12 }}>
                    {p.pelanggaran === 0
                      ? <span className="muted">Bersih</span>
                      : (
                        <>
                          <b>{p.pelanggaran}×</b>
                          {p.log.map((l) => (
                            <div key={String(l.id)} className="muted">
                              {NAMA_PELANGGARAN[l.jenis] ?? l.jenis} · {jam(l.at)}
                            </div>
                          ))}
                        </>
                      )}
                  </td>
                  <td><span className={`badge ${WARNA_PESERTA[p.status] ?? 'badge-netral'}`}>{p.status}</span></td>
                  {bolehKelola && (
                    <td>
                      {p.status === 'Dibekukan' && (
                        <form action={bukaBekuan}>
                          <input type="hidden" name="pesertaId" value={String(p.id)} />
                          <button className="btn btn-sekunder" style={{ fontSize: 12 }}>Buka kembali</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </Tabel>
          )}
      </div>
      <PanelEsai sesiId={aktif.id} />
    </>
  );
}
