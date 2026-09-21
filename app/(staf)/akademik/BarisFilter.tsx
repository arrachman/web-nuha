import { FilterAktif, PenyaringOtomatis, type ChipFilter } from '@/components';
import { hrefAkademik, filterKosong, STATUS_SANTRI, URUT, type FilterAkademik } from './filter';

export type OpsiFilter = {
  program: string[];
  angkatan: string[];
  asrama: { id: number; nama: string }[];
};

/**
 * Penyaring lanjutan + ringkasan filter aktif.
 *
 * Aturan tunggal di seluruh app: **pilihan berlaku seketika, ketikan berlaku
 * saat Enter**. Jadi tiap `<select>` memakai `PenyaringOtomatis` (navigasi saat
 * diubah) sementara pencarian tetap form GET dengan tombol — mengetik tidak
 * boleh memicu navigasi per ketukan.
 *
 * Hasilnya tetap URL yang bisa dibookmark dan dibagikan. Chip "aktif" di bawah
 * membuat tiap penyaring bisa dicopot satu per satu.
 */
export function BarisFilter({ f, opsi, tab }: { f: FilterAkademik; opsi: OpsiFilter; tab: string }) {
  const namaAsrama = (id: number) => opsi.asrama.find((a) => a.id === id)?.nama ?? String(id);

  const copot: ChipFilter[] = [
    ...(f.q ? [{ label: `Cari: "${f.q}"`, href: hrefAkademik(tab, f, { q: '' }) }] : []),
    ...(f.status ? [{ label: `Status: ${f.status}`, href: hrefAkademik(tab, f, { status: undefined }) }] : []),
    ...(f.jk ? [{ label: `Jenis kelamin: ${f.jk === 'L' ? 'Putra' : 'Putri'}`, href: hrefAkademik(tab, f, { jk: undefined }) }] : []),
    ...(f.program ? [{ label: `Program: ${f.program}`, href: hrefAkademik(tab, f, { program: undefined }) }] : []),
    ...(f.angkatan ? [{ label: `Angkatan: ${f.angkatan}`, href: hrefAkademik(tab, f, { angkatan: undefined }) }] : []),
    ...(f.asramaId ? [{ label: `Asrama: ${namaAsrama(f.asramaId)}`, href: hrefAkademik(tab, f, { asramaId: undefined }) }] : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <form method="get" style={{ display: 'flex', gap: 10, flex: '1 1 210px', minWidth: 210 }}>
          <input type="hidden" name="tab" value={tab} />
          {/* Penjelajah unit/tingkat/kelas dipertahankan saat form disubmit. */}
          {f.unit && <input type="hidden" name="unit" value={f.unit} />}
          {f.tingkat && <input type="hidden" name="tingkat" value={f.tingkat} />}
          {f.kelasId && <input type="hidden" name="kelas" value={f.kelasId} />}
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Pencarian</label>
            <input type="search" name="q" placeholder="Nama, NIS, atau NISN" defaultValue={f.q} />
          </div>
          <button type="submit" className="btn" style={{ alignSelf: 'end' }}>Cari</button>
        </form>

        <PenyaringOtomatis
          label="Status"
          nilai={f.status ?? ''}
          opsi={[
            { nilai: '', label: 'Semua status', href: hrefAkademik(tab, f, { status: undefined }) },
            ...STATUS_SANTRI.map((o) => ({ nilai: o, label: o, href: hrefAkademik(tab, f, { status: o }) })),
          ]}
        />
        <PenyaringOtomatis
          label="Jenis kelamin"
          nilai={f.jk ?? ''}
          opsi={[
            { nilai: '', label: 'Semua', href: hrefAkademik(tab, f, { jk: undefined }) },
            { nilai: 'L', label: 'Putra', href: hrefAkademik(tab, f, { jk: 'L' }) },
            { nilai: 'P', label: 'Putri', href: hrefAkademik(tab, f, { jk: 'P' }) },
          ]}
        />
        {opsi.program.length > 0 && (
          <PenyaringOtomatis
            label="Program"
            nilai={f.program ?? ''}
            opsi={[
              { nilai: '', label: 'Semua program', href: hrefAkademik(tab, f, { program: undefined }) },
              ...opsi.program.map((o) => ({ nilai: o, label: o, href: hrefAkademik(tab, f, { program: o }) })),
            ]}
          />
        )}
        {opsi.angkatan.length > 0 && (
          <PenyaringOtomatis
            label="Angkatan"
            lebar={116}
            nilai={f.angkatan ?? ''}
            opsi={[
              { nilai: '', label: 'Semua', href: hrefAkademik(tab, f, { angkatan: undefined }) },
              ...opsi.angkatan.map((o) => ({ nilai: o, label: o, href: hrefAkademik(tab, f, { angkatan: o }) })),
            ]}
          />
        )}
        {opsi.asrama.length > 0 && (
          <PenyaringOtomatis
            label="Asrama"
            nilai={f.asramaId ? String(f.asramaId) : ''}
            opsi={[
              { nilai: '', label: 'Semua asrama', href: hrefAkademik(tab, f, { asramaId: undefined }) },
              ...opsi.asrama.map((o) => ({ nilai: String(o.id), label: o.nama, href: hrefAkademik(tab, f, { asramaId: o.id }) })),
            ]}
          />
        )}
        <PenyaringOtomatis
          label="Urutkan"
          nilai={f.urut}
          opsi={Object.entries(URUT).map(([k, v]) => ({
            nilai: k, label: v.label, href: hrefAkademik(tab, f, { urut: k as FilterAkademik['urut'] }),
          }))}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <FilterAktif chip={copot} hrefBersih={hrefAkademik(tab, filterKosong(f))} />
      </div>
    </>
  );
}
