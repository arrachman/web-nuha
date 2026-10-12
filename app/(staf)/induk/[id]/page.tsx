import { requirePage } from '@/lib/access';
import { ProfilSantri } from '../ProfilSantri';

/** Profil satu santri di Data Induk — render bersama ProfilSantri
 * (dipakai juga /siswa/[id] & /santri/[id] dengan basis modul masing-masing). */
export default async function DetailSantriPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePage('induk');
  const { id } = await params;
  const sp = await searchParams;
  return <ProfilSantri idParam={id} sp={sp} basis="/induk" />;
}
