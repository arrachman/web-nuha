import { prisma } from '@/lib/prisma';
import { Button, ButtonLink, Input, Kosong, Tabel, rp, satu, type SearchParams } from '@/components';

type Unit = { id: number; nama: string };

/**
 * Daftar anggota perpustakaan unit ini: santri aktif (dari kelas unit ini)
 * atau staf unit ini, lengkap dengan pinjaman aktif & sisa denda.
 */
export async function TabAnggota({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const tipe = satu(sp.anggota) === 'staf' ? 'staf' : 'santri';
  const q = satu(sp.q) ?? '';

  type Baris = {
    id: string;
    nama: string;
    identitas: string;
    kelas: string | null;
    aktif: number;
    sisaDenda: number;
  };
  let daftar: Baris[] = [];

  if (tipe === 'santri') {
    const santri = await prisma.santri.findMany({
      where: {
        status: 'Aktif',
        kelas: { unitId: unit.id },
        ...(q ? { person: { fullName: { contains: q } } } : {}),
      },
      select: {
        id: true,
        nis: true,
        person: { select: { fullName: true } },
        kelas: { select: { nama: true } },
      },
      orderBy: { person: { fullName: 'asc' } },
      take: 100,
    });
    const ids = santri.map((s) => s.id);
    const [petaAktif, petaDenda] = await agregat(unit.id, 'santriId', ids);
    daftar = santri.map((s) => ({
      id: String(s.id),
      nama: s.person.fullName,
      identitas: s.nis ?? '-',
      kelas: s.kelas?.nama ?? '-',
      aktif: petaAktif.get(String(s.id)) ?? 0,
      sisaDenda: petaDenda.get(String(s.id)) ?? 0,
    }));
  } else {
    const staf = await prisma.staff.findMany({
      where: {
        unitId: unit.id,
        ...(q ? { person: { fullName: { contains: q } } } : {}),
      },
      select: {
        id: true,
        position: true,
        person: { select: { fullName: true } },
      },
      orderBy: { person: { fullName: 'asc' } },
      take: 100,
    });
    const ids = staf.map((s) => s.id);
    const [petaAktif, petaDenda] = await agregat(unit.id, 'staffId', ids);
    daftar = staf.map((s) => ({
      id: String(s.id),
      nama: s.person.fullName,
      identitas: s.position,
      kelas: null,
      aktif: petaAktif.get(String(s.id)) ?? 0,
      sisaDenda: petaDenda.get(String(s.id)) ?? 0,
    }));
  }

  const kolom = tipe === 'santri'
    ? ['Nama', 'NIS', 'Kelas', 'Pinjaman aktif', 'Denda belum lunas', 'Aksi']
    : ['Nama', 'Jabatan', 'Pinjaman aktif', 'Denda belum lunas', 'Aksi'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <ButtonLink varian="chip" aktif={tipe === 'santri'} href={`/perpustakaan/anggota?anggota=santri`}>Santri</ButtonLink>
        <ButtonLink varian="chip" aktif={tipe === 'staf'} href={`/perpustakaan/anggota?anggota=staf`}>Staf / Guru</ButtonLink>
      </div>

      <div className="card">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Input type="hidden" name="tab" value="anggota" />
          <Input type="hidden" name="anggota" value={tipe} />
          <Input varian="cari" name="q" defaultValue={q} placeholder="Cari nama anggota" style={{ minWidth: 240 }} />
          <Button type="submit" varian="sekunder">Cari</Button>
        </form>

        {daftar.length === 0 ? (
          <Kosong pesan={q ? `Tidak ada anggota cocok dengan "${q}".` : 'Belum ada anggota pada unit ini.'} />
        ) : (
          <>
            <Tabel kolom={kolom}>
              {daftar.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.nama}</td>
                  <td>{a.identitas}</td>
                  {tipe === 'santri' && <td>{a.kelas}</td>}
                  <td className="num">{a.aktif}</td>
                  <td className="num" style={a.sisaDenda > 0 ? { color: 'var(--merah, #b3261e)', fontWeight: 700 } : undefined}>
                    {a.sisaDenda > 0 ? rp(a.sisaDenda) : '-'}
                  </td>
                  <td>
                    <ButtonLink varian="sekunder" href={`/cetak/kartu-anggota?tipe=${tipe}&id=${a.id}`} style={{ fontSize: 12.5 }}>
                      Kartu anggota
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </Tabel>
            {daftar.length >= 100 && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Menampilkan 100 anggota pertama — persempit lewat pencarian nama.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Pinjaman aktif (count) & sisa denda (sum denda - dendaDibayar) per anggota, sekali query per agregat. */
async function agregat(
  unitId: number,
  kolomId: 'santriId' | 'staffId',
  ids: bigint[],
): Promise<[Map<string, number>, Map<string, number>]> {
  const petaAktif = new Map<string, number>();
  const petaDenda = new Map<string, number>();
  if (ids.length === 0) return [petaAktif, petaDenda];

  const isiDenda = (id: bigint | null, denda: number, dendaDibayar: number) => {
    if (id == null) return;
    const sisa = Math.max(0, denda - dendaDibayar);
    if (sisa > 0) petaDenda.set(String(id), (petaDenda.get(String(id)) ?? 0) + sisa);
  };

  if (kolomId === 'santriId') {
    const [grupAktif, barisDenda] = await Promise.all([
      prisma.bookLoan.groupBy({
        by: ['santriId'],
        where: { unitId, status: 'Dipinjam', santriId: { in: ids } },
        _count: { id: true },
      }),
      prisma.bookLoan.findMany({
        where: { unitId, status: 'Dikembalikan', santriId: { in: ids }, denda: { gt: 0 } },
        select: { santriId: true, denda: true, dendaDibayar: true },
      }),
    ]);
    for (const g of grupAktif) if (g.santriId != null) petaAktif.set(String(g.santriId), g._count.id);
    for (const l of barisDenda) isiDenda(l.santriId, l.denda, l.dendaDibayar);
  } else {
    const [grupAktif, barisDenda] = await Promise.all([
      prisma.bookLoan.groupBy({
        by: ['staffId'],
        where: { unitId, status: 'Dipinjam', staffId: { in: ids } },
        _count: { id: true },
      }),
      prisma.bookLoan.findMany({
        where: { unitId, status: 'Dikembalikan', staffId: { in: ids }, denda: { gt: 0 } },
        select: { staffId: true, denda: true, dendaDibayar: true },
      }),
    ]);
    for (const g of grupAktif) if (g.staffId != null) petaAktif.set(String(g.staffId), g._count.id);
    for (const l of barisDenda) isiDenda(l.staffId, l.denda, l.dendaDibayar);
  }
  return [petaAktif, petaDenda];
}
