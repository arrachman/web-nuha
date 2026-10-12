import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { BarisDaftar, InfoSpp } from './DaftarSantri';

const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function labelPeriode(p: string): string {
  const m = p.match(/^(\d{4})-(\d{2})/);
  return m ? `${BULAN_ID[Number(m[2]) - 1]} ${m[1]}` : p;
}

/** Status SPP dari Invoice: belum ada invoice -> "Tidak ada"; ada yang belum
 * lunas -> "Menunggak" + jumlah periode belum lunas; semua lunas -> "Lunas" +
 * periode terakhir. Selaras TabTunggakan: tagihan terbit belum terbayar =
 * tunggakan. */
function statusSpp(faktur: { period: string; amount: unknown; paidAmount: unknown }[]): InfoSpp {
  if (faktur.length === 0) return { label: 'Tidak ada', nada: 'abu', sub: null };
  const belumLunas = faktur.filter((i) => Number(i.paidAmount) < Number(i.amount));
  if (belumLunas.length > 0) {
    const periodeUnik = new Set(belumLunas.map((i) => i.period));
    return { label: 'Menunggak', nada: 'merah', sub: `${periodeUnik.size} bulan` };
  }
  const periode = faktur.map((i) => i.period).sort();
  return { label: 'Lunas', nada: 'hijau', sub: labelPeriode(periode[periode.length - 1]) };
}

/**
 * Ambil satu halaman daftar santri lengkap dengan jenis kelamin, wali utama,
 * dan status SPP — dipakai bersama oleh /induk, /siswa, dan /santri supaya
 * ketiga daftar selalu membaca data dengan cara yang sama persis.
 */
export async function ambilDaftarKaya(
  where: Prisma.SantriWhereInput,
  skip: number,
  take: number,
): Promise<BarisDaftar[]> {
  const daftar = await prisma.santri.findMany({
    where,
    select: {
      id: true, nis: true, nisn: true, status: true,
      person: {
        select: {
          fullName: true, gender: true,
          // Wali utama untuk kolom WALI SANTRI (relasi yang sama dengan
          // TabWali di halaman profil).
          sebagaiAnak: {
            select: { wali: { select: { fullName: true, phone: true } } },
            orderBy: { utama: 'desc' },
            take: 1,
          },
        },
      },
      kelas: { select: { nama: true, unit: { select: { nama: true } } } },
      unit: { select: { nama: true } },
      // Penanda lembaga dibaca dari `kelasLain`: satu santri bisa terdaftar
      // di dua lembaga sekaligus; kolom `unit` hanya memuat penempatan utama.
      kelasLain: { select: { unit: { select: { id: true, nama: true } } } },
    },
    orderBy: { person: { fullName: 'asc' } },
    skip,
    take,
  });

  const faktur = daftar.length === 0 ? [] : await prisma.invoice.findMany({
    where: { santriId: { in: daftar.map((d) => d.id) } },
    select: { santriId: true, period: true, amount: true, paidAmount: true },
  });

  return daftar.map((d) => ({
    id: d.id,
    nis: d.nis,
    nisn: d.nisn,
    status: d.status,
    person: { fullName: d.person.fullName },
    kelas: d.kelas,
    unit: d.unit,
    kelasLain: d.kelasLain,
    jk: d.person.gender,
    wali: d.person.sebagaiAnak[0]?.wali ?? null,
    spp: statusSpp(faktur.filter((i) => i.santriId === d.id)),
  }));
}
