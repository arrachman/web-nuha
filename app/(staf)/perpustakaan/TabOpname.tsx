import { prisma } from '@/lib/prisma';
import { Button, Input, Kosong, Select, satu, type SearchParams } from '@/components';
import { OpnameSesi, type SalinanOpname } from './OpnameSesi';

type Unit = { id: number; nama: string };

const gayaInput = { padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)' } as const;

/**
 * Tab Stock Opname: pilih rak, lalu sesi pemindaian berjalan di OpnameSesi
 * (client) membandingkan kode ter-scan dengan seluruh eksemplar unit ini.
 * Catatan integrasi: page.tsx perlu meneruskan sp agar pilihan rak terbaca.
 */
export async function TabOpname({ unit, sp }: { unit: Unit; sp?: SearchParams }) {
  const rakDipilih = sp ? satu(sp.rak) : '';

  const daftarRak = await prisma.book.findMany({
    where: { unitId: unit.id, rak: { not: null } },
    select: { rak: true },
    distinct: ['rak'],
    orderBy: { rak: 'asc' },
  });
  const namaRak = daftarRak.map((r) => r.rak!).filter(Boolean);
  const rakValid = rakDipilih && namaRak.includes(rakDipilih) ? rakDipilih : '';

  let salinan: SalinanOpname[] = [];
  if (rakValid) {
    const copies = await prisma.bookCopy.findMany({
      where: { unitId: unit.id },
      include: { book: { select: { judul: true, rak: true } } },
      orderBy: { kode: 'asc' },
    });
    salinan = copies.map((c) => ({
      id: String(c.id),
      kode: c.kode,
      status: c.status,
      kondisi: c.kondisi,
      judul: c.book.judul,
      rakBuku: c.book.rak,
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 className="card-judul">Stock opname per rak</h3>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
          Pilih rak yang akan diperiksa. Selama sesi, scan label eksemplar di rak itu —
          hasil langsung dibandingkan dengan database: sesuai, tidak ditemukan, salah rak,
          atau berstatus dipinjam tapi ada di rak.
        </p>
        {namaRak.length === 0 ? (
          <div style={{ marginTop: 12 }}>
            <Kosong pesan="Belum ada buku dengan lokasi rak di unit ini. Isi kolom Rak pada katalog dulu." />
          </div>
        ) : (
          <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Input type="hidden" name="tab" value="opname" />
            <Input type="hidden" name="unit" value={unit.id} />
            <Select name="rak" defaultValue={rakValid} required style={{ ...gayaInput, minWidth: 200 }} aria-label="Rak sesi ini">
              <option value="" disabled>Pilih rak…</option>
              {namaRak.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Button type="submit">{rakValid ? 'Ganti rak' : 'Mulai sesi'}</Button>
          </form>
        )}
      </div>

      {rakValid && <OpnameSesi rak={rakValid} salinan={salinan} />}
    </div>
  );
}
