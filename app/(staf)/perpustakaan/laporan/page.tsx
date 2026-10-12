import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabLaporan } from '../TabLaporan';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Rekap sirkulasi, keterlambatan, dan denda"
      anak={(unit) => <TabLaporan unit={unit} />}
    />
  );
}
