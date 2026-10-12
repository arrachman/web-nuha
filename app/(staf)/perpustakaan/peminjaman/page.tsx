import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabPeminjaman } from '../TabPeminjaman';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Pinjamkan eksemplar ke santri, pegawai, atau umum"
      anak={(unit) => <TabPeminjaman unit={unit} sp={sp} />}
    />
  );
}
