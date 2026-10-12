import { prisma } from '@/lib/prisma';
import { Button, Input, Kosong, Select, satu, type SearchParams } from '@/components';
import { LabelPicker, type SalinanLabel } from './LabelPicker';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;
const BATAS = 300;

/** Tab Cetak Label: saring eksemplar unit ini lalu pilih yang labelnya akan dicetak. */
export async function TabLabel({ unit, sp }: { unit: Unit; sp: SearchParams }) {
  const q = satu(sp.q);
  const rak = satu(sp.rak);

  const daftarRak = await prisma.book.findMany({
    where: { unitId: unit.id, rak: { not: null } },
    select: { rak: true },
    distinct: ['rak'],
    orderBy: { rak: 'asc' },
  });

  const whereBuku = {
    ...(q ? { OR: [{ judul: { contains: q } }, { kode: { contains: q } }] } : {}),
    ...(rak ? { rak } : {}),
  };
  const where = { unitId: unit.id, ...(Object.keys(whereBuku).length ? { book: whereBuku } : {}) };

  const [total, copies] = await Promise.all([
    prisma.bookCopy.count({ where }),
    prisma.bookCopy.findMany({
      where,
      include: { book: { select: { kode: true, judul: true, rak: true } } },
      orderBy: { kode: 'asc' },
      take: BATAS,
    }),
  ]);

  const salinan: SalinanLabel[] = copies.map((c) => ({
    id: String(c.id),
    kodeEksemplar: c.kode,
    kodeBuku: c.book.kode,
    judul: c.book.judul,
    rak: c.book.rak,
    status: c.status,
    kondisi: c.kondisi,
  }));

  return (
    <div className="card">
      <h3 className="card-judul">Cetak label eksemplar</h3>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
        Centang eksemplar yang labelnya akan dicetak, lalu tekan “Cetak label terpilih”.
        Label berisi QR kode eksemplar untuk dipindai saat sirkulasi &amp; stock opname.
      </p>

      <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 14px' }}>
        <Input type="hidden" name="tab" value="label" />
        <Input type="hidden" name="unit" value={unit.id} />
        <Input name="q" defaultValue={q} placeholder="Cari judul / kode buku" style={{ ...gayaInput, minWidth: 240 }} />
        <Select name="rak" defaultValue={rak} style={gayaInput}>
          <option value="">Semua rak</option>
          {daftarRak.map((r) => <option key={r.rak!} value={r.rak!}>{r.rak}</option>)}
        </Select>
        <Button type="submit" varian="sekunder">Saring</Button>
      </form>

      {total > BATAS && (
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Menampilkan {BATAS} pertama dari {total} eksemplar — persempit penyaring untuk melihat sisanya.
        </p>
      )}

      {salinan.length === 0 ? (
        <Kosong pesan="Belum ada eksemplar yang cocok di unit ini." />
      ) : (
        <LabelPicker salinan={salinan} />
      )}
    </div>
  );
}
