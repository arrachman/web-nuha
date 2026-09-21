import { prisma } from '@/lib/prisma';
import { Kosong, Tabel } from '@/components';

/** Akumulasi poin dihitung berjalan per santri, urut tanggal — bukan angka hardcode. */
export async function TabTazir() {
  const tazir = await prisma.discipline.findMany({
    include: { student: { include: { person: true, room: true } } },
    orderBy: { date: 'asc' },
  });

  const akumulasi = new Map<string, number>();
  const baris = tazir.map((t) => {
    const key = String(t.studentId);
    const total = (akumulasi.get(key) ?? 0) + t.points;
    akumulasi.set(key, total);
    return { ...t, total };
  });
  baris.reverse(); // tampilkan terbaru di atas

  return (
    <div className="card">
      <div className="card-judul" style={{ marginBottom: 4 }}>Buku pelanggaran &amp; poin ta&apos;zir</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        Akumulasi 25 poin memicu panggilan wali; 50 poin sidang pengasuh.
      </div>
      {baris.length === 0 ? (
        <Kosong pesan="Belum ada catatan pelanggaran." />
      ) : (
        <Tabel kolom={['Tanggal', 'Santri', 'Pelanggaran', 'Sanksi', { label: 'Poin', num: true }, { label: 'Akumulasi', num: true }]}>
          {baris.map((t) => (
            <tr key={String(t.id)}>
              <td>{t.date.toLocaleDateString('id-ID')}</td>
              <td>
                {t.student.person.fullName}
                <div className="muted" style={{ fontSize: 11.5 }}>Kamar {t.student.room?.code ?? '—'}</div>
              </td>
              <td>{t.violation}</td>
              <td>
                {t.sanction ?? '—'}
                <div className="muted" style={{ fontSize: 11.5 }}>{t.officer}</div>
              </td>
              <td className="num"><span className="badge badge-kuning">{t.points}</span></td>
              <td className="num"><strong style={{ color: '#B91C1C' }}>{t.total}</strong></td>
            </tr>
          ))}
        </Tabel>
      )}
    </div>
  );
}
