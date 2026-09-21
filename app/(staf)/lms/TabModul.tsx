import { prisma } from '@/lib/prisma';
import { Card, Tabel, Badge, Kosong, ProgressBar } from '@/components';

export async function TabModul({ q }: { q: string }) {
  const materi = await prisma.materiLms.findMany({
    where: q
      ? { OR: [{ judul: { contains: q } }, { kursus: { nama: { contains: q } } }] }
      : undefined,
    include: { kursus: true },
    orderBy: { tgl: 'desc' },
  });

  return (
    <Card
      judul="Katalog modul pembelajaran"
      sub="Ketuntasan diambil dari progres kursus induk modul tersebut."
    >
      <form method="get" style={{ marginBottom: 14 }}>
        <input type="hidden" name="tab" value="modul" />
        <input className="field" name="q" defaultValue={q} placeholder="Cari modul / kursus" style={{ minWidth: 220 }} />
      </form>
      {materi.length === 0 ? (
        <Kosong pesan="Tidak ada modul yang cocok dengan pencarian." />
      ) : (
        <Tabel kolom={['Modul', 'Kursus', 'Tipe', 'Ketuntasan kursus', 'Status']}>
          {materi.map((m) => {
            const pct = m.kursus.modul > 0 ? Math.round((m.kursus.selesai / m.kursus.modul) * 100) : 0;
            return (
              <tr key={m.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.judul}</div>
                  <div className="muted">{m.tgl.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</div>
                </td>
                <td>{m.kursus.nama}<div className="muted">{m.kursus.guru}</div></td>
                <td>{m.tipe}</td>
                <td style={{ minWidth: 160 }}>
                  <ProgressBar pct={pct} />
                  <div className="muted">{m.kursus.selesai}/{m.kursus.modul} modul kursus tuntas</div>
                </td>
                <td><Badge status={m.status} /></td>
              </tr>
            );
          })}
        </Tabel>
      )}
    </Card>
  );
}
