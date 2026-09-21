import Link from 'next/link';
import type { TabDef } from '@/components/utils/tabs';

type Props = {
  tabs: TabDef[];
  aktif: string;
  basePath: string;
  /** Pembangun tautan per tab. Berikan bila halaman punya penyaring yang harus
   * ikut terbawa saat berpindah tab — tanpa ini tautan hanya membawa `?tab=`
   * sehingga filter ter-reset. */
  hrefTab?: (key: string) => string;
};

/** Tab bar server-side: state hidup di query ?tab= supaya bisa di-bookmark & di-render server. */
export function Tabs({ tabs, aktif, basePath, hrefTab }: Props) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={hrefTab ? hrefTab(t.key) : t.key === tabs[0].key ? basePath : `${basePath}?tab=${t.key}`}
          className={`tab ${t.key === aktif ? 'active' : ''}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
