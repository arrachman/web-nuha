import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabPengaturan } from '../TabPengaturan';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Aturan peminjaman & denda per unit"
      anak={(unit) => <TabPengaturan unit={unit} />}
    />
  );
}
