import Link from 'next/link';
import { Avatar, Kosong } from '@/components';
import { queryFilter, type FilterInduk } from './filter';

export type InfoSpp = {
  label: 'Lunas' | 'Menunggak' | 'Tidak ada';
  nada: 'hijau' | 'merah' | 'abu';
  sub: string | null;
};

export type BarisDaftar = {
  id: bigint;
  nis: string | null;
  nisn: string | null;
  status: string;
  person: { fullName: string };
  kelas: { nama: string; unit: { nama: string } | null } | null;
  unit: { nama: string } | null;
  kelasLain?: { unit: { id: number; nama: string } | null }[];
  /** Jenis kelamin dari Person ('L' | 'P'). */
  jk: string;
  /** Wali utama (GuardianRelation.utama) — null bila belum tercatat. */
  wali: { fullName: string; phone: string | null } | null;
  /** Status SPP terhitung dari invoice di page.tsx. */
  spp: InfoSpp;
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

const LABEL_STATUS: Record<string, string> = { TidakAktif: 'Tidak Aktif' };

/**
 * Daftar hasil sebagai tabel kaya (mengikuti mockup): tiap baris memuat
 * avatar + nama + NIS, L/P, kelas + unit, wali + HP, pill status, dan status
 * SPP dari sistem keuangan. Seluruh baris tautan ke profil di modul
 * pemilik daftar (`basisDetail`, bawaan /induk/[id]);
 * konteks daftar (filter + halaman) ikut di query supaya halaman profil
 * bisa mengembalikan operator ke daftar yang sama persis.
 */
export function DaftarSantri({
  daftar, f, halaman, basisDetail = '/induk',
}: { daftar: BarisDaftar[]; f: FilterInduk; halaman?: number; basisDetail?: string }) {
  const konteks = [queryFilter(f), halaman && halaman > 1 ? `halaman=${halaman}` : '']
    .filter(Boolean)
    .join('&');

  if (daftar.length === 0) return <Kosong pesan="Tidak ada santri yang cocok dengan penyaring ini." />;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="tabel-santri">
        <div className="ts-head" aria-hidden>
          <span>Santri</span>
          <span>L/P</span>
          <span>Kelas</span>
          <span>Wali Santri</span>
          <span>Status</span>
          <span>SPP</span>
          <span />
        </div>
        {daftar.map((baris) => {
          const unitKelas = baris.kelas?.unit?.nama ?? unitSantri(baris)[0] ?? null;
          return (
            <Link
              key={String(baris.id)}
              href={konteks ? `${basisDetail}/${baris.id}?${konteks}` : `${basisDetail}/${baris.id}`}
              className="ts-row baris-santri"
            >
              <span className="ts-sel-santri">
                <Avatar nama={baris.person.fullName} size={42} />
                <span style={{ minWidth: 0 }}>
                  <span className="ts-nama">{baris.person.fullName}</span>
                  <span className="ts-sub ts-nis">{baris.nis ?? baris.nisn ?? '—'}</span>
                </span>
              </span>
              <span className="ts-lp">{baris.jk}</span>
              <span>
                <span className="ts-utama">{baris.kelas?.nama ?? 'Belum berkelas'}</span>
                {unitKelas && <span className="ts-sub">{unitKelas}</span>}
              </span>
              <span>
                {baris.wali ? (
                  <>
                    <span className="ts-utama">{baris.wali.fullName}</span>
                    <span className="ts-sub">{baris.wali.phone ?? '—'}</span>
                  </>
                ) : (
                  <span className="ts-sub" style={{ marginTop: 0 }}>Belum ada data wali</span>
                )}
              </span>
              <span>
                <span className={`badge ${baris.status === 'Aktif' ? 'badge-hijau' : 'badge-netral'}`}>
                  {LABEL_STATUS[baris.status] ?? baris.status}
                </span>
              </span>
              <span>
                <span className={`spp spp-${baris.spp.nada}`}>
                  <span className="titik" />
                  {baris.spp.label}
                </span>
                {baris.spp.sub && <span className="ts-sub">{baris.spp.sub}</span>}
              </span>
              <span className="ts-chev" aria-hidden>›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
