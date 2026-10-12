import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabLabel } from '../TabLabel';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Pilih eksemplar untuk dicetak labelnya"
      anak={(unit) => <TabLabel unit={unit} sp={sp} />}
    />
  );
}
