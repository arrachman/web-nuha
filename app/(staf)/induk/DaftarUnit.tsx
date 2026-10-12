import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { JudulHalaman, bacaHalaman, UKURAN_HALAMAN, Pagination, FilterAktif, Button, ButtonLink, Input, Select, type ChipFilter } from '@/components';
import { DaftarSantri } from './DaftarSantri';
import { ambilDaftarKaya } from './kaya';
import { bacaFilter, queryFilter, STATUS_SANTRI, type FilterInduk } from './filter';
import { ambilAngkatan } from './pohon';

type OpsiKelas = { id: number; nama: string; unitNama: string };

/** Href ke halaman daftar ini sendiri dengan filter sekarang + perubahan. */
function hrefUnit(basis: string, f: FilterInduk, ubah: Partial<FilterInduk> = {}, halaman?: number): string {
  const gabung = { ...f, ...ubah };
  const p = new URLSearchParams(queryFilter(gabung));
  if (halaman && halaman > 1) p.set('halaman', String(halaman));
  const s = p.toString();
  return s ? `${basis}?${s}` : basis;
}

function Opsi({ basis, f, ubah, aktif, anak }: { basis: string; f: FilterInduk; ubah: Partial<FilterInduk>; aktif: boolean; anak: React.ReactNode }) {
  const mati = Object.fromEntries(Object.keys(ubah).map((k) => [k, undefined])) as Partial<FilterInduk>;
  return (
    <ButtonLink varian="chip" aktif={aktif} href={hrefUnit(basis, f, aktif ? mati : ubah)} aria-pressed={aktif} aria-current={aktif ? 'true' : undefined}>
      {anak}
    </ButtonLink>
  );
}

function Kelompok({ judul, anak }: { judul: string; anak: React.ReactNode }) {
  return (
    <div className="chip-baris">
      <span className="chip-label">{judul}</span>
      {anak}
    </div>
  );
}

/** Penyaring untuk daftar per unit — pola visual sama dengan BarisFilter di
 * /induk (form cari + dropdown kelas + chip), tapi tautannya pulang ke
 * halaman ini sendiri, bukan ke /induk. */
function FilterDaftarUnit({
  basis, f, hasil, sebutan, opsiKelas, angkatan,
}: { basis: string; f: FilterInduk; hasil: number; sebutan: string; opsiKelas: OpsiKelas[]; angkatan: string[] }) {
  const nilaiKelas = f.kelasId === 'none' ? 'none' : f.kelasId ? String(f.kelasId) : '';
  const namaKelas = typeof f.kelasId === 'number' ? opsiKelas.find((k) => k.id === f.kelasId)?.nama : undefined;
  const copot: ChipFilter[] = [
    ...(f.q ? [{ label: `Cari: "${f.q}"`, href: hrefUnit(basis, f, { q: '' }) }] : []),
    ...(f.kelasId ? [{ label: f.kelasId === 'none' ? 'Belum berkelas' : `Kelas: ${namaKelas ?? f.kelasId}`, href: hrefUnit(basis, f, { kelasId: undefined }) }] : []),
    ...(f.status && f.status !== 'Aktif' ? [{ label: `Status: ${f.status}`, href: hrefUnit(basis, f, { status: undefined }) }] : []),
    ...(f.jk ? [{ label: `Jenis kelamin: ${f.jk === 'L' ? 'Putra' : 'Putri'}`, href: hrefUnit(basis, f, { jk: undefined }) }] : []),
    ...(f.angkatan ? [{ label: `Angkatan: ${f.angkatan}`, href: hrefUnit(basis, f, { angkatan: undefined }) }] : []),
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <form action={basis} method="get" style={{ display: 'flex', gap: 7, alignItems: 'center', flex: '1 1 260px' }}>
          {f.kelasId && <Input type="hidden" name="kelas" value={f.kelasId} />}
          {f.status && <Input type="hidden" name="status" value={f.status} />}
          {f.jk && <Input type="hidden" name="jk" value={f.jk} />}
          {f.angkatan && <Input type="hidden" name="angkatan" value={f.angkatan} />}
          <Input
            varian="cari"
            type="search"
            name="q"
            defaultValue={f.q}
            placeholder="Cari nama, NIS, atau NISN…"
            aria-label={`Cari ${sebutan}`}
            style={{ flex: 1, minWidth: 0 }}
          />
          <Button varian="sekunder" type="submit" style={{ padding: '9px 16px' }}>
            Cari
          </Button>
        </form>
        <span className="muted" style={{ fontSize: 12.5 }}>
          <strong style={{ color: 'var(--teks-kuat)' }}>{hasil}</strong> {sebutan} cocok
        </span>
      </div>

      {opsiKelas.length > 0 && (
        <form action={basis} method="get" style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          {f.q && <Input type="hidden" name="q" value={f.q} />}
          {f.status && <Input type="hidden" name="status" value={f.status} />}
          {f.jk && <Input type="hidden" name="jk" value={f.jk} />}
          {f.angkatan && <Input type="hidden" name="angkatan" value={f.angkatan} />}
          <Select name="kelas" defaultValue={nilaiKelas} aria-label="Kelas" className="input-cari" style={{ minWidth: 190 }}>
            <option value="">Semua kelas</option>
            {opsiKelas.map((k) => (
              <option key={k.id} value={k.id}>{`${k.nama} — ${k.unitNama}`}</option>
            ))}
            <option value="none">Belum berkelas</option>
          </Select>
          <Button varian="sekunder" type="submit" style={{ padding: '9px 14px' }}>
            Terapkan
          </Button>
        </form>
      )}

      <Kelompok
        judul="Status"
        anak={STATUS_SANTRI.map((s) => (
          <Opsi
            key={s}
            basis={basis}
            f={f}
            ubah={{ status: s }}
            aktif={s === 'Aktif' ? !f.status || f.status === 'Aktif' : f.status === s}
            anak={s === 'TidakAktif' ? 'Tidak Aktif' : s}
          />
        ))}
      />
      <Kelompok
        judul="Jenis kelamin"
        anak={[
          <Opsi key="L" basis={basis} f={f} ubah={{ jk: 'L' }} aktif={f.jk === 'L'} anak="Putra" />,
          <Opsi key="P" basis={basis} f={f} ubah={{ jk: 'P' }} aktif={f.jk === 'P'} anak="Putri" />,
        ]}
      />
      {angkatan.length > 0 && (
        <Kelompok
          judul="Angkatan"
          anak={angkatan.map((a) => (
            <Opsi key={a} basis={basis} f={f} ubah={{ angkatan: a }} aktif={f.angkatan === a} anak={a} />
          ))}
        />
      )}
      <FilterAktif chip={copot} hrefBersih={basis} />
    </div>
  );
}

/**
 * Halaman daftar santri yang cakupannya dikunci ke sekumpulan unit
 * (dipakai /siswa = SMP+MA dan /santri = Pondok Pesantren). Keanggotaan unit
 * dibaca dari penempatan rombel (SantriKelas) ATAU kolom unit utama: santri
 * pondok tidak punya rombel sama sekali, jadi syarat rombel saja akan
 * mengosongkan daftar pondok. Pemilih unit global di topbar sengaja tidak
 * diterapkan di sini — cakupan halaman ini sudah dikunci oleh rutenya.
 */
export async function HalamanDaftarUnit({
  sp, basis, namaUnit, judul, sub, sebutan,
}: {
  sp: Record<string, string | string[] | undefined>;
  basis: string;
  namaUnit: string[];
  judul: string;
  sub: string;
  sebutan: string;
}) {
  const unitRows = await prisma.unit.findMany({ where: { nama: { in: namaUnit } }, select: { id: true } });
  const scope = unitRows.map((u) => u.id);

  const mentah = bacaFilter(sp);
  const f: FilterInduk = { ...mentah, unitId: undefined, alumniUnitId: undefined };
  const halaman = bacaHalaman(sp);

  const anggotaUnit: Prisma.SantriWhereInput = {
    OR: [
      { kelasLain: { some: { unitId: { in: scope } } } },
      { unitId: { in: scope } },
    ],
  };
  const syarat: Prisma.SantriWhereInput[] = [anggotaUnit, { status: f.status ?? 'Aktif' }];
  if (f.kelasId === 'none') syarat.push({ kelasLain: { none: {} } });
  else if (f.kelasId) syarat.push({ kelasLain: { some: { kelasId: f.kelasId } } });
  if (f.angkatan) syarat.push({ tahunMasuk: f.angkatan });
  if (f.jk) syarat.push({ person: { gender: f.jk } });
  if (f.q) {
    syarat.push({
      OR: [
        { person: { fullName: { contains: f.q } } },
        { nis: { contains: f.q } },
        { nisn: { contains: f.q } },
      ],
    });
  }
  const where: Prisma.SantriWhereInput = { AND: syarat };

  const [daftar, total, kelasRows, angkatan] = await Promise.all([
    ambilDaftarKaya(where, (halaman - 1) * UKURAN_HALAMAN, UKURAN_HALAMAN),
    prisma.santri.count({ where }),
    prisma.kelas.findMany({
      where: { unitId: { in: scope } },
      select: { id: true, nama: true, unit: { select: { nama: true } } },
      orderBy: [{ unitId: 'asc' }, { nama: 'asc' }],
    }),
    ambilAngkatan(),
  ]);
  const opsiKelas: OpsiKelas[] = kelasRows.map((k) => ({ id: k.id, nama: k.nama, unitNama: k.unit?.nama ?? '' }));
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <>
      <JudulHalaman judul={judul} sub={sub} />
      <div style={{ marginTop: 12 }}>
        <FilterDaftarUnit basis={basis} f={f} hasil={total} sebutan={sebutan} opsiKelas={opsiKelas} angkatan={angkatan} />
      </div>
      <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <div className="label" style={{ paddingLeft: 4 }}>Hasil ({total})</div>
        <DaftarSantri daftar={daftar} f={f} halaman={halaman} basisDetail={basis} />
        {totalHalaman > 1 && (
          <Pagination
            halaman={halaman}
            totalHalaman={totalHalaman}
            total={total}
            jumlahBaris={daftar.length}
            ukuranHalaman={UKURAN_HALAMAN}
            buatHref={(p) => hrefUnit(basis, f, {}, p)}
          />
        )}
      </div>
    </>
  );
}
