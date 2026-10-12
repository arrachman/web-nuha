import { prisma } from '@/lib/prisma';
import { isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { getUnitAktif } from '@/lib/unit-scope';
import { PemilihUnitSelect } from '@/components/PemilihUnitSelect';

/** Jenjang unit utama yang bisa difokuskan: SMP, MA, Pondok Pesantren. */
const JENJANG_UTAMA = ['SMP', 'MA', 'Pesantren'];

/**
 * Dropdown fokus unit di topbar (pola sama dengan PemilihPeran). Hanya
 * tampil bila user berhak atas lebih dari satu unit utama; pilihan adalah
 * filter tampilan global di atas cakupan akses (`unitIds`) sesi.
 */
export async function PemilihUnit({ session }: { session: SessionPayload }) {
  const semua = await prisma.unit.findMany({
    where: { aktif: true, jenjang: { in: JENJANG_UTAMA } },
    select: { id: true, nama: true, jenjang: true },
  });
  const urut = [...semua].sort(
    (a, b) => JENJANG_UTAMA.indexOf(a.jenjang ?? '') - JENJANG_UTAMA.indexOf(b.jenjang ?? ''),
  );
  const boleh =
    isSuperAdmin(session) || session.unitIds == null
      ? urut
      : urut.filter((u) => session.unitIds!.includes(u.id));
  if (boleh.length <= 1) return null;

  const aktif = await getUnitAktif(session);

  return (
    <div className="samaran">
      <label htmlFor="pemilih-unit" className="label" style={{ margin: 0 }}>Unit</label>
      <PemilihUnitSelect
        daftar={boleh.map((u) => ({ id: u.id, nama: u.nama }))}
        sedang={aktif ? String(aktif) : ''}
      />
    </div>
  );
}
