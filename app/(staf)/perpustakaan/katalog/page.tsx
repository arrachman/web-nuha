import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabKatalog } from '../TabKatalog';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Kelola judul buku & eksemplarnya"
      anak={(unit) => <TabKatalog unit={unit} sp={sp} />}
    />
  );
}
