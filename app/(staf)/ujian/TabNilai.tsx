import { prisma } from '@/lib/prisma';
import { Button, ButtonLink, Input, Kosong, Tabel } from '@/components';
import { simpanNilaiUjian } from './actions';

const tanggal = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

/**
 * Input nilai satu sesi ujian. Sesi yang bisa dipilih dibatasi ke mapel yang
 * diampu guru; kepala unit melihat semuanya agar bisa menambal sesi tertinggal.
 */
export async function TabNilai({
  searchParams,
  namaGuru,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  namaGuru: string | null;
}) {
  let mapelDiampu: string[] | null = null;
  if (namaGuru) {
    const jadwal = await prisma.jadwalPelajaran.findMany({
      where: { guru: namaGuru }, distinct: ['mapel'], select: { mapel: true },
    });
    mapelDiampu = jadwal.map((j) => j.mapel);
  }

  const sesiSemua = await prisma.jadwalUjian.findMany({
    where: {
      ujian: { status: { not: 'Draf' } },
      ...(mapelDiampu ? { mapel: { nama: { in: mapelDiampu } } } : {}),
    },
    include: { mapel: true, kelas: true, ujian: true },
    orderBy: [{ tgl: 'desc' }],
    take: 40,
  });

  if (sesiSemua.length === 0) {
    return <Kosong pesan="Belum ada sesi ujian berjalan yang bisa dinilai." />;
  }

  const dipilih = Number(searchParams.sesi) || sesiSemua[0].id;
  const sesi = await prisma.jadwalUjian.findUnique({
    where: { id: dipilih },
    include: {
      mapel: true, ujian: true,
      // Nama santri tersimpan di `Orang`, bukan di `Santri`.
      kelas: {
        include: {
          santri: {
            orderBy: { person: { fullName: 'asc' } },
            select: { id: true, nis: true, person: { select: { fullName: true } } },
          },
        },
      },
      nilai: true,
    },
  });
  if (!sesi) return <Kosong pesan="Sesi ujian tidak ditemukan." />;

  const tersimpan = new Map(sesi.nilai.map((n) => [String(n.santriId), n]));
  // Gelombang yang sudah ditutup dikunci: nilainya sudah dipakai rapor.
  const terkunci = sesi.ujian.status === 'Selesai';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {sesiSemua.map((s) => (
          <ButtonLink
            key={s.id}
            href={`/ujian?tab=nilai&sesi=${s.id}`}
            varian={s.id === dipilih ? 'primer' : 'sekunder'}
          >
            {s.mapel.nama} · {s.kelas.nama} · {tanggal(s.tgl)}
          </ButtonLink>
        ))}
      </div>

      <form action={simpanNilaiUjian} className="card">
        <Input type="hidden" name="jadwalId" value={sesi.id} />
        <h3 className="card-judul">
          {sesi.mapel.nama} · Kelas {sesi.kelas.nama}
        </h3>
        <p className="card-sub" style={{ marginBottom: 14 }}>
          {sesi.ujian.nama} · {tanggal(sesi.tgl)} {sesi.waktu} · {sesi.durasi} menit
          {terkunci && ' · gelombang sudah ditutup, nilai terkunci'}
        </p>

        {sesi.kelas.santri.length === 0 ? (
          <Kosong pesan="Kelas ini belum berisi santri." />
        ) : (
          <>
            <Tabel kolom={['NIS', 'Nama', 'Hadir', { label: 'Nilai (0–100)', num: true }]}>
              {sesi.kelas.santri.map((santri) => {
                const ada = tersimpan.get(String(santri.id));
                return (
                  <tr key={String(santri.id)}>
                    <td className="muted">{santri.nis}</td>
                    <td>{santri.person.fullName}</td>
                    <td>
                      <Input
                        type="checkbox"
                        name={`hadir-${santri.id}`}
                        defaultChecked={ada ? ada.hadir : true}
                        disabled={terkunci}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        style={{ width: 96, textAlign: 'right', padding: '7px 10px', border: '1px solid var(--garis-input)', borderRadius: 10, background: 'var(--krem-2)', fontSize: 13, fontFamily: 'inherit', color: 'var(--teks)' }}
                        name={`nilai-${santri.id}`}
                        defaultValue={ada ? Number(ada.nilai) : ''}
                        disabled={terkunci}
                      />
                    </td>
                  </tr>
                );
              })}
            </Tabel>
            {!terkunci && (
              <div style={{ marginTop: 14 }}>
                <Button type="submit">Simpan nilai</Button>
              </div>
            )}
          </>
        )}
      </form>
    </div>
  );
}
