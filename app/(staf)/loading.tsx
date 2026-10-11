import { SkeletonHalaman } from '@/components';

/**
 * Kerangka muat untuk seluruh segmen staf. Tanpa berkas ini, klik menu tidak
 * memberi respons visual apa pun sampai render server selesai (45–500ms) lalu
 * halaman bertukar mendadak. Rute dengan loading.tsx sendiri (induk,
 * akademik, kepegawaian, data/[entity]) tetap memakai miliknya — yang
 * terdekat yang menang.
 */
export default function Loading() {
  return <SkeletonHalaman baris={8} />;
}
