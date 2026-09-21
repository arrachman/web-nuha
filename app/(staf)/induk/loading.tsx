import { Skeleton, SkeletonBaris } from '@/components';

/** Kerangka /induk: bilah penyaring lalu tiga panel master-detail. */
export default function Loading() {
  return (
    <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} role="status" aria-label="Memuat data induk santri">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton w={300} h={22} />
        <Skeleton w={460} h={13} />
      </div>
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14 }}>
        <Skeleton w={260} h={34} />
        <Skeleton w={120} h={34} />
        <Skeleton w={120} h={34} />
        <Skeleton w={120} h={34} />
      </div>
      <div className="grid induk-grid" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}><SkeletonBaris jumlah={6} tinggi={26} /></div>
        <div className="card" style={{ padding: 12 }}><SkeletonBaris jumlah={8} tinggi={40} /></div>
        <div className="card" style={{ padding: 14 }}><SkeletonBaris jumlah={7} tinggi={30} /></div>
      </div>
    </div>
  );
}
