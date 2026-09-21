import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

const jam = (d: Date) => d.toLocaleString('id-ID', {
  weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
});

/**
 * Kartu ujian siap cetak, satu kartu per peserta. Sengaja tidak memuat token:
 * token diumumkan pengawas saat sesi dibuka, sedangkan kartu dibagikan
 * jauh-jauh hari — mencetaknya di kartu sama saja membocorkan sesi.
 */
export async function TabKartu({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sesiTerpilih = Number(searchParams.sesi ?? 0);

  const daftarSesi = await prisma.sesiCbt.findMany({
    include: { paket: { select: { nama: true } }, kelas: { select: { nama: true } } },
    orderBy: { mulai: 'desc' },
  });
  if (daftarSesi.length === 0) return <Kosong pesan="Belum ada sesi CBT." />;

  const aktif = daftarSesi.find((s) => s.id === sesiTerpilih) ?? daftarSesi[0];

  const [sesi, peserta] = await Promise.all([
    prisma.sesiCbt.findUnique({
      where: { id: aktif.id },
      include: {
        paket: { select: { nama: true, durasi: true, mapel: { select: { nama: true } } } },
        kelas: { select: { nama: true, unit: { select: { nama: true } } } },
      },
    }),
    prisma.pesertaCbt.findMany({
      where: { sesiId: aktif.id },
      include: { santri: { select: { nis: true, person: { select: { fullName: true } } } } },
      orderBy: { noPeserta: 'asc' },
    }),
  ]);
  if (!sesi) return <Kosong pesan="Sesi tidak ditemukan." />;

  return (
    <>
      <div className="card kartu-kendali">
        <h3 className="card-judul">Cetak kartu ujian</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {daftarSesi.map((s) => (
            <a
              key={s.id}
              href={`/ujian?tab=kartu&sesi=${s.id}`}
              className={`btn ${s.id === aktif.id ? 'btn' : 'btn-sekunder'}`}
              style={{ fontSize: 12.5 }}
            >
              {s.paket.nama} · {s.kelas.nama}
            </a>
          ))}
        </div>
        <p className="card-sub" style={{ marginTop: 12 }}>
          {peserta.length} kartu. Gunakan cetak peramban (Ctrl+P) — kendali dan menu tidak ikut tercetak.
          Token sesi sengaja tidak dicantumkan; pengawas mengumumkannya saat ujian dimulai.
        </p>
      </div>

      {peserta.length === 0
        ? <Kosong pesan="Peserta belum diterbitkan untuk sesi ini." />
        : (
          <div className="kartu-lembar">
            {peserta.map((p) => (
              <article className="kartu-ujian" key={String(p.id)}>
                <header>
                  <p className="label">{sesi.kelas.unit.nama}</p>
                  <h4>Kartu Peserta Ujian</h4>
                </header>
                <dl>
                  <div><dt>No. Peserta</dt><dd><b>{p.noPeserta}</b></dd></div>
                  <div><dt>Nama</dt><dd>{p.santri.person.fullName}</dd></div>
                  <div><dt>NIS</dt><dd>{p.santri.nis}</dd></div>
                  <div><dt>Kelas</dt><dd>{sesi.kelas.nama}</dd></div>
                  <div><dt>Mata Pelajaran</dt><dd>{sesi.paket.mapel.nama}</dd></div>
                  <div><dt>Waktu</dt><dd>{jam(sesi.mulai)} · {sesi.paket.durasi} menit</dd></div>
                </dl>
                <footer>
                  <span>Tanda tangan peserta</span>
                  <span>Pengawas</span>
                </footer>
              </article>
            ))}
          </div>
        )}
    </>
  );
}
