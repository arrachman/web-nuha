import './docs.css';

/** Dokumentasi berdiri sendiri: tanpa sidebar modul, agar terbaca seperti buku panduan. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
