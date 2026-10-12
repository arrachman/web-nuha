import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, readSession } from '@/lib/auth';

const JENIS = ['transaksi', 'terlambat', 'denda'] as const;
type Jenis = (typeof JENIS)[number];

function selCsv(nilai: unknown): string {
  const s = nilai == null ? '' : String(nilai);
  return `"${s.replace(/"/g, '""')}"`;
}

function barisCsv(kolom: unknown[]): string {
  return kolom.map(selCsv).join(',');
}

const tgl = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** Ekspor CSV laporan perpustakaan per unit: transaksi | terlambat | denda. */
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
  const boleh = isSuperAdmin(session)
    || (await prisma.menuRole.count({
      where: { menu: { key: 'perpustakaan' }, role: { key: { in: session.peran } } },
    })) > 0;
  if (!boleh) return NextResponse.json({ error: 'Tidak berhak mengakses laporan perpustakaan.' }, { status: 403 });

  const unitId = Number(req.nextUrl.searchParams.get('unit'));
  const jenis = (req.nextUrl.searchParams.get('jenis') ?? '') as Jenis;
  if (!Number.isInteger(unitId) || unitId <= 0 || !JENIS.includes(jenis)) {
    return NextResponse.json({ error: 'Parameter unit / jenis tidak valid.' }, { status: 400 });
  }

  const sekarang = new Date();
  const baris: string[] = [];

  if (jenis === 'transaksi') {
    const data = await prisma.bookLoan.findMany({
      where: { unitId },
      include: { book: { select: { kode: true, judul: true } }, copy: { select: { kode: true } } },
      orderBy: { tanggalPinjam: 'desc' },
      take: 5000,
    });
    baris.push(barisCsv(['tanggal_pinjam', 'peminjam', 'tipe', 'kode_buku', 'judul', 'kode_eksemplar', 'jatuh_tempo', 'tanggal_kembali', 'status', 'denda', 'denda_dibayar']));
    for (const l of data) {
      baris.push(barisCsv([
        tgl(l.tanggalPinjam), l.namaPeminjam, l.tipePeminjam, l.book.kode, l.book.judul,
        l.copy?.kode ?? '', tgl(l.tanggalJatuhTempo), tgl(l.tanggalKembali), l.status, l.denda, l.dendaDibayar,
      ]));
    }
  } else if (jenis === 'terlambat') {
    const data = await prisma.bookLoan.findMany({
      where: { unitId, status: 'Dipinjam', tanggalJatuhTempo: { lt: sekarang } },
      include: { book: { select: { judul: true } }, copy: { select: { kode: true } } },
      orderBy: { tanggalJatuhTempo: 'asc' },
      take: 5000,
    });
    baris.push(barisCsv(['peminjam', 'judul', 'kode_eksemplar', 'jatuh_tempo', 'hari_terlambat']));
    for (const l of data) {
      const hari = Math.floor((sekarang.getTime() - new Date(l.tanggalJatuhTempo).getTime()) / 86400000);
      baris.push(barisCsv([l.namaPeminjam, l.book.judul, l.copy?.kode ?? '', tgl(l.tanggalJatuhTempo), hari]));
    }
  } else {
    const data = await prisma.bookLoan.findMany({
      where: { unitId, denda: { gt: 0 } },
      include: { book: { select: { judul: true } } },
      orderBy: { tanggalKembali: 'desc' },
      take: 5000,
    });
    baris.push(barisCsv(['peminjam', 'judul', 'tanggal_kembali', 'denda', 'dibayar', 'sisa']));
    for (const l of data) {
      baris.push(barisCsv([
        l.namaPeminjam, l.book.judul, tgl(l.tanggalKembali), l.denda, l.dendaDibayar,
        Math.max(0, l.denda - l.dendaDibayar),
      ]));
    }
  }

  return new NextResponse('\uFEFF' + baris.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-perpustakaan-${jenis}.csv"`,
    },
  });
}
