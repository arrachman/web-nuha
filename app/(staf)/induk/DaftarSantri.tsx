import Link from 'next/link';
import { Avatar, Kosong } from '@/components';
import { hrefInduk, type FilterInduk } from './filter';

export type BarisDaftar = {
  id: bigint;
  nis: string | null;
  nisn: string | null;
  status: string;
  person: { fullName: string };
  kelas: { nama: string } | null;
  unit: { nama: string } | null;
  kelasLain?: { unit: { id: number; nama: string } | null }[];
};

/** Nama lembaga tempat santri terdaftar, unik & terurut tetap (SMP, MA, Madin)
 * supaya dua santri dengan lembaga sama selalu tampil dengan urutan sama. */
const URUTAN_UNIT = ['SMP', 'MA', 'Madin'];

function unitSantri(baris: BarisDaftar): string[] {
  const nama = new Set<string>();
  for (const k of baris.kelasLain ?? []) if (k.unit) nama.add(k.unit.nama);
  // Santri tanpa penempatan rombel (mis. alumni) tetap perlu penanda — jatuh ke
  // kolom `unit` penempatan utamanya.
  if (nama.size === 0 && baris.unit) nama.add(baris.unit.nama);
  return [...nama].sort((a, b) => {
    const ia = URUTAN_UNIT.indexOf(a);
    const ib = URUTAN_UNIT.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

const WARNA_STATUS: Record<string, string> = {
  TidakAktif: 'badge-netral',
};

/** Panel daftar hasil. Seleksi dibawa lewat query ?sel= (bukan state klien) supaya
 * satu tautan mewakili satu tampilan penuh: filter + santri terpilih + tab. */
export function DaftarSantri({
  daftar, f, selId, tab, halaman,
}: { daftar: BarisDaftar[]; f: FilterInduk; selId?: bigint; tab?: string; halaman?: number }) {
  // Penanda lembaga hanya berguna saat daftar memuat lebih dari satu lembaga.
  // Begitu satu lembaga dipilih di tab, semua baris akan berlabel sama — itu
  // pengulangan yang cuma memakan ruang baris.
  const tampilUnit = !f.unitId && !f.alumniUnitId && f.kelasId === undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {daftar.length === 0 && <Kosong pesan="Tidak ada santri yang cocok dengan penyaring ini." />}
      {daftar.map((baris) => {
        const aktif = selId !== undefined && baris.id === selId;
        return (
          <Link
            key={String(baris.id)}
            href={hrefInduk(f, {}, { sel: baris.id, tab, halaman })}
            scroll={false}
            className="baris-santri"
            style={{
              display: 'flex', gap: 10, alignItems: 'center', padding: '9px 10px', borderRadius: 10,
              borderLeft: `3px solid ${aktif ? 'var(--hijau)' : 'transparent'}`,
              background: aktif ? 'var(--krem-3)' : 'transparent',
            }}
          >
            <Avatar nama={baris.person.fullName} size={30} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--teks-kuat)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {baris.person.fullName}
              </div>
              <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, minWidth: 0 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {baris.nis ?? baris.nisn ?? '—'} · {baris.kelas?.nama ?? 'Belum berkelas'}
                </span>
                {tampilUnit && unitSantri(baris).map((n) => (
                  <span key={n} className="tanda-unit">{n}</span>
                ))}
              </div>
            </div>
            <span className={`badge ${WARNA_STATUS[baris.status] ?? 'badge-netral'}`} style={{ fontSize: 10, padding: '2px 7px' }}>
              {baris.status}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
