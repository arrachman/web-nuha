import { prisma } from '@/lib/prisma';
import { Avatar, Badge, Kosong, Pagination, UKURAN_HALAMAN, bacaHalaman, type SearchParams } from '@/components';
import { bacaFilter, whereFilter, hrefAkademik, queryFilter, URUT } from './filter';

export async function TabSiswa({ searchParams }: { searchParams: SearchParams }) {
  const f = bacaFilter(searchParams);
  const halaman = bacaHalaman(searchParams);
  const where = whereFilter(f);

  const [total, siswaRows] = await Promise.all([
    prisma.santri.count({ where }),
    prisma.santri.findMany({
      where,
      include: { person: true, unit: true, kelas: true, room: { include: { dormitory: true } } },
      orderBy: URUT[f.urut].orderBy,
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));

  const queryExport = queryFilter(f).toString();

  return (
    <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '0 0 10px' }}>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {total.toLocaleString('id-ID')} santri cocok · halaman {halaman} dari {totalHalaman}
          </div>
          <a href={`/akademik/export${queryExport ? `?${queryExport}` : ''}`} className="btn btn-sekunder" style={{ whiteSpace: 'nowrap' }}>
            Ekspor CSV (SMP &amp; MA)
          </a>
        </div>

        <div className="tabel-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIS / NISN</th>
                <th>Unit · Kelas</th>
                <th>Asrama</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {siswaRows.map((x) => (
                <tr key={String(x.id)}>
                  <td>
                    <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                      <Avatar nama={x.person.fullName} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{x.person.fullName}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>{x.person.gender} · {x.program ?? '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num">{x.nis}{x.nisn ? ` / ${x.nisn}` : ''}</td>
                  <td>{x.unit ? `${x.unit.nama} · ${x.kelas?.nama ?? '-'}` : '-'}</td>
                  <td>{x.room ? `${x.room.dormitory.name} ${x.room.code}` : '-'}</td>
                  <td><Badge status={x.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {siswaRows.length === 0 && <Kosong pesan="Tidak ada santri yang cocok dengan penyaring ini." />}
        <Pagination
          halaman={halaman}
          totalHalaman={totalHalaman}
          total={total}
          jumlahBaris={siswaRows.length}
          ukuranHalaman={UKURAN_HALAMAN}
          buatHref={(p) => hrefAkademik('siswa', f, {}, { halaman: p })}
        />
    </div>
  );
}
