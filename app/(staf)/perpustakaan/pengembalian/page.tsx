import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabPengembalian } from '../TabPengembalian';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Terima pengembalian, hitung denda, catat pembayaran denda"
      anak={(unit) => <TabPengembalian unit={unit} sp={sp} />}
    />
  );
}
