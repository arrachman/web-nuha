import type { ReactNode } from 'react';
import { requirePage } from '@/lib/access';
import { getUnitAktif } from '@/lib/unit-scope';
import { JudulHalaman, PesanAksi, satu, type SearchParams } from '@/components';
import { unitPerpustakaan } from './data';

export type UnitPerpus = { id: number; nama: string };

/** Bingkai bersama semua halaman perpustakaan: gerbang menu, pemilih unit
 * global, judul, dan pesan hasil aksi. Isi halaman dirender lewat `anak`
 * yang menerima unit aktif. */
export async function BingkaiPerpus({
  sp,
  sub,
  anak,
}: {
  sp: SearchParams;
  sub: string;
  anak: (unit: UnitPerpus) => ReactNode;
}) {
  const session = await requirePage('perpustakaan');
  const units = await unitPerpustakaan();
  // Unit mengikuti pemilih unit global di bilah atas (sama seperti halaman buku).
  const unitAktif = await getUnitAktif(session);
  const unit = units.find((u) => u.id === unitAktif) ?? units[0];
  return (
    <>
      <div className="kepala-halaman">
        <JudulHalaman judul="Perpustakaan" sub={sub} />
      </div>
      <PesanAksi pesan={satu(sp.pesan) || undefined} galat={satu(sp.galat) || undefined} />
      {unit ? (
        anak(unit)
      ) : (
        <div className="card">Buat unit dulu dari menu Lembaga agar modul perpustakaan dapat dipakai.</div>
      )}
    </>
  );
}
