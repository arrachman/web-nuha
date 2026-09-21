import { prisma } from '@/lib/prisma';
import { gantiPeran } from '@/lib/samaran';
import { PERAN_SUPERADMIN, type SessionPayload } from '@/lib/auth';
import { PemilihPeranSelect } from '@/components/PemilihPeranSelect';

/**
 * Pemilih peran untuk super admin. Server Action dikirim otomatis saat
 * dropdown berganti (lihat PemilihPeranSelect); halaman dirender ulang
 * dengan menu milik peran yang dipilih.
 */
export async function PemilihPeran({ session }: { session: SessionPayload }) {
  const daftar = await prisma.role.findMany({
    where: { key: { not: PERAN_SUPERADMIN } },
    orderBy: { name: 'asc' },
  });
  const sedang = session.peranAsli ? session.peran[0] : '';

  return (
    <form action={gantiPeran} className="samaran">
      <label htmlFor="samaran-peran" className="label" style={{ margin: 0 }}>Lihat sebagai</label>
      <PemilihPeranSelect daftar={daftar} sedang={sedang} />
    </form>
  );
}
