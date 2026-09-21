import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong, Tabel, Pagination, UKURAN_HALAMAN, satu, bacaHalaman, type SearchParams } from '@/components';

function hrefPengguna(params: Record<string, string>) {
  const qs = new URLSearchParams({ tab: 'pengguna', ...params });
  for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
  return `/pengaturan?${qs.toString()}`;
}

/** Pengguna & peran — mencakup akun santri/wali portal, bukan cuma staf, jadi dipagination. */
export async function TabPengguna({ searchParams }: { searchParams: SearchParams }) {
  const q = satu(searchParams.q);
  const halaman = bacaHalaman(searchParams);

  const where = q
    ? { OR: [{ email: { contains: q } }, { person: { fullName: { contains: q } } }] }
    : undefined;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { person: true, roles: { include: { role: true } } },
      orderBy: { email: 'asc' },
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Pengguna &amp; peran</h3>
        <form method="get" style={{ display: 'flex' }}>
          <input type="hidden" name="tab" value="pengguna" />
          <input className="field" name="q" defaultValue={q} placeholder="Cari nama / email" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--garis)', minWidth: 230 }} />
        </form>
      </div>
      {users.length === 0 ? (
        <Kosong pesan="Belum ada pengguna yang cocok." />
      ) : (
        <Tabel kolom={['Pengguna', 'Peran', 'Cakupan unit', 'Status']}>
          {users.map((user) => (
            <tr key={String(user.id)}>
              <td>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar nama={user.person.fullName} size={30} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.person.fullName}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{user.email}</div>
                  </div>
                </div>
              </td>
              <td>{user.roles.map((r) => r.role.name).join(', ') || '-'}</td>
              <td className="muted">{user.unitScope ?? 'Seluruh unit'}</td>
              <td><Badge status={user.aktif ? 'Aktif' : 'Nonaktif'} /></td>
            </tr>
          ))}
        </Tabel>
      )}
      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        total={total}
        jumlahBaris={users.length}
        ukuranHalaman={UKURAN_HALAMAN}
        buatHref={(p) => hrefPengguna({ q, halaman: String(p) })}
      />
    </div>
  );
}
