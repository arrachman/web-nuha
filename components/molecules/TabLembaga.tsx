import Link from 'next/link';

export type ItemLembaga = { key: string; label: string; jumlah: number };

type Props = {
  /** Lembaga yang bisa dipilih, sudah terurut oleh pemanggil. */
  items: ItemLembaga[];
  /** `key` lembaga aktif; `undefined` berarti lintas-lembaga ("Semua"). */
  aktif?: string;
  /** Tautan per pilihan. `undefined` = pilihan "Semua lembaga". */
  hrefItem: (key?: string) => string;
  /** Cacah untuk pilihan "Semua" — dihitung pemanggil karena tiap modul
   * mencacah subjek berbeda (santri, pegawai). */
  jumlahSemua: number;
  labelSemua?: string;
};

/**
 * Pemilih lembaga lintas-modul: SMP, MA, dan Madin adalah organisasi terpisah
 * (jenjang, wali kelas, dan operatornya beda), jadi memilih lembaga adalah
 * keputusan **pertama** di sebuah halaman — bukan penyaring yang harus dicari.
 *
 * Dirender sebagai tabbar, bukan chip, supaya bacanya "saya sedang di dalam
 * konteks SMP" alih-alih "saya menambahkan satu filter". Pada halaman yang sudah
 * punya tabbar modul sendiri (`?tab=`), komponen ini WAJIB berada di ATAS tabbar
 * itu: pilihan lembaga harus bertahan saat operator berpindah tab, dan urutan
 * visualnya mencerminkan bahwa lembaga melingkupi tab, bukan sebaliknya.
 *
 * Kuncinya string demi satu bentuk data untuk semua pemanggil — modul yang
 * memakai id numerik cukup mengonversi di tepi (`String(id)`).
 */
export function TabLembaga({ items, aktif, hrefItem, jumlahSemua, labelSemua = 'Semua lembaga' }: Props) {
  return (
    <nav className="tabbar" aria-label="Lembaga">
      <Link
        href={hrefItem(undefined)}
        className={`tab ${aktif ? '' : 'active'}`}
        aria-current={aktif ? undefined : 'true'}
      >
        {labelSemua}
        <span className="tab-cacah">{jumlahSemua}</span>
      </Link>

      {items.map((it) => {
        const ini = it.key === aktif;
        return (
          <Link
            key={it.key}
            href={hrefItem(it.key)}
            className={`tab ${ini ? 'active' : ''}`}
            aria-current={ini ? 'true' : undefined}
          >
            {it.label}
            <span className="tab-cacah">{it.jumlah}</span>
          </Link>
        );
      })}
    </nav>
  );
}
