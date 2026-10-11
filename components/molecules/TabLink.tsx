'use client';

import Link, { useLinkStatus } from 'next/link';

/** Titik berdenyut di tab yang sedang dimuat — umpan balik klik seketika. */
function PenandaTab() {
  const { pending } = useLinkStatus();
  return pending ? <span className="tabpending" aria-hidden /> : null;
}

/**
 * Tautan tab: tanpa scroll (halaman tidak loncat ke atas saat ganti tab) dan
 * tanpa prefetch (belasan varian ?tab= tidak berebut server dengan navigasi
 * yang benar-benar diklik).
 */
export function TabLink({ href, aktif, label }: { href: string; aktif: boolean; label: string }) {
  return (
    <Link href={href} scroll={false} prefetch={false} className={`tab ${aktif ? 'active' : ''}`}>
      {label}
      <PenandaTab />
    </Link>
  );
}
