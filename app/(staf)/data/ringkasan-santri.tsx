import { prisma } from '@/lib/prisma';
import { SEMUA } from '@/lib/crud/filter-nilai';

type Pintasan = { label: string; jumlah: number; query: string; sorot?: boolean };

/**
 * Ringkasan sekaligus pintasan filter: angka "belum lengkap" adalah daftar
 * kerja operator, jadi tiap kartu menautkan ke daftar yang sudah tersaring.
 */
export async function RingkasanSantri({ filters }: { filters: Record<string, string> }) {
  const [aktif, tidakAktif, tanpaKelas, tanpaKamar, tanpaNis] = await Promise.all([
    prisma.santri.count({ where: { status: 'Aktif' } }),
    prisma.santri.count({ where: { status: 'TidakAktif' } }),
    prisma.santri.count({ where: { status: 'Aktif', kelasId: null } }),
    prisma.santri.count({ where: { status: 'Aktif', roomId: null } }),
    prisma.santri.count({ where: { status: 'Aktif', nis: null } }),
  ]);

  const pintasan: Pintasan[] = [
    { label: 'Aktif', jumlah: aktif, query: 'status=Aktif' },
    { label: 'Tidak aktif', jumlah: tidakAktif, query: 'status=TidakAktif' },
    { label: 'Belum ada kelas', jumlah: tanpaKelas, query: 'lengkap=tanpaKelas', sorot: true },
    { label: 'Belum ada kamar', jumlah: tanpaKamar, query: 'lengkap=tanpaKamar', sorot: true },
    { label: 'Belum ada NIS', jumlah: tanpaNis, query: 'lengkap=tanpaNis', sorot: true },
  ];

  const isSelected = (query: string) => {
    const [kunci, nilai] = query.split('=');
    return filters[kunci] === nilai;
  };

  return <div className="card ringkas-bar">
    <a className="ringkas-item" href={`/data/santri?status=${SEMUA}`} aria-current={filters.status === SEMUA}>
      <span className="ringkas-angka">{aktif + tidakAktif}</span> Semua santri
    </a>
    {pintasan.map((item) => <a
      key={item.label}
      className={item.sorot ? 'ringkas-item ringkas-item-sorot' : 'ringkas-item'}
      href={`/data/santri?${item.query}`}
      aria-current={isSelected(item.query)}
    >
      <span className="ringkas-angka">{item.jumlah}</span> {item.label}
    </a>)}
  </div>;
}
