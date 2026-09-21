import { FilterAktif, PenyaringOtomatis, type ChipFilter } from '@/components';
import { hrefKepegawaian, filterPegawaiKosong, URUT_PEGAWAI, type FilterPegawai } from './filter';

/**
 * Pencarian + penyaring ringan.
 *
 * Aturan tunggal di seluruh app: **pilihan berlaku seketika, ketikan berlaku
 * saat Enter**. Dulu chip lembaga di atas berlaku instan sementara select di
 * sini menunggu tombol "Terapkan" — dua idiom bertumpuk di satu layar. Kini
 * select memakai `PenyaringOtomatis`, pencarian tetap form GET.
 *
 * Keadaan tetap hidup di query supaya URL bisa dibookmark dan dibagikan.
 */
export function BarisFilter({ f, tab }: { f: FilterPegawai; tab: string }) {
  // Unit tidak dijadikan chip: penjelajah lembaga di atas sudah menyorotnya.
  const copot: ChipFilter[] = [
    ...(f.q ? [{ label: `Cari: "${f.q}"`, href: hrefKepegawaian(tab, f, { q: '' }) }] : []),
    ...(f.status ? [{ label: `Status: ${f.status}`, href: hrefKepegawaian(tab, f, { status: undefined }) }] : []),
    ...(f.jk ? [{ label: `Jenis kelamin: ${f.jk === 'L' ? 'Putra' : 'Putri'}`, href: hrefKepegawaian(tab, f, { jk: undefined }) }] : []),
  ];

  return (
    <>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <form method="get" style={{ display: 'flex', gap: 10, flex: '1 1 220px', minWidth: 220 }}>
        <input type="hidden" name="tab" value={tab} />
        {/* Penjelajah lembaga/status dipertahankan saat form disubmit. */}
        {f.unit && <input type="hidden" name="unit" value={f.unit} />}
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label>Pencarian</label>
          <input type="search" name="q" placeholder="Nama, NIP, jabatan, atau mapel" defaultValue={f.q} />
        </div>
        <button type="submit" className="btn" style={{ alignSelf: 'end' }}>Cari</button>
      </form>

      <PenyaringOtomatis
        label="Jenis kelamin"
        lebar={138}
        nilai={f.jk ?? ''}
        opsi={[
          { nilai: '', label: 'Semua', href: hrefKepegawaian(tab, f, { jk: undefined }) },
          { nilai: 'L', label: 'Putra', href: hrefKepegawaian(tab, f, { jk: 'L' }) },
          { nilai: 'P', label: 'Putri', href: hrefKepegawaian(tab, f, { jk: 'P' }) },
        ]}
      />
      <PenyaringOtomatis
        label="Urutkan"
        lebar={138}
        nilai={f.urut}
        opsi={Object.entries(URUT_PEGAWAI).map(([k, v]) => ({
          nilai: k, label: v.label, href: hrefKepegawaian(tab, f, { urut: k as FilterPegawai['urut'] }),
        }))}
      />
    </div>
    <div style={{ marginTop: 12 }}>
      <FilterAktif chip={copot} hrefBersih={hrefKepegawaian(tab, filterPegawaiKosong(f))} />
    </div>
    </>
  );
}
