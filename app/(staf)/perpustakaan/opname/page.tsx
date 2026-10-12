import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabOpname } from '../TabOpname';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Cocokkan isi rak dengan catatan sistem"
      anak={(unit) => <TabOpname unit={unit} sp={sp} />}
    />
  );
}
