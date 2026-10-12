import type { SearchParams } from '@/components';
import { BingkaiPerpus } from '../Bingkai';
import { TabAnggota } from '../TabAnggota';

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <BingkaiPerpus
      sp={sp}
      sub="Daftar anggota & kartu anggota perpustakaan"
      anak={(unit) => <TabAnggota unit={unit} sp={sp} />}
    />
  );
}
