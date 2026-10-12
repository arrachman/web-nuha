import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabPerpanjangan } from '../TabPerpanjangan';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Perpanjang pinjaman yang masih aktif"
      anak={(unit) => <TabPerpanjangan unit={unit} sp={sp} />}
    />
  );
}
