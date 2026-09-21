import { avaBg, inisial } from '@/components/utils/format';

export function Avatar({ nama, size = 32 }: { nama: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', background: avaBg(nama), color: '#FFF',
        fontWeight: 700, fontSize: size * 0.37, display: 'grid', placeItems: 'center', flex: '0 0 auto',
      }}
    >
      {inisial(nama)}
    </span>
  );
}
