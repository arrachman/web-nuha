import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ambilRekapLaporan } from '../data';

function baris(nilai: Array<string | number>): string {
  return nilai
    .map((v) => {
      const teks = String(v);
      return /[",\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
    })
    .join(',');
}

/** Unduh rekap laporan sebagai CSV — dipakai tombol "Ekspor CSV" di halaman laporan. */
export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Perlu masuk.' } }, { status: 401 });

  const granted = await prisma.menuRole.count({ where: { menu: { key: 'laporan' }, role: { key: { in: session.peran } } } });
  if (!granted) return Response.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Tidak berwenang mengakses laporan.' } }, { status: 403 });

  const rows = await ambilRekapLaporan();
  const csv = [
    baris(['Unit', 'Populasi', 'Kehadiran', 'Catatan capaian', 'Nilai keuangan']),
    ...rows.map((row) => baris([row.unit, row.siswa, row.hadir, row.capaian, row.keuangan])),
  ].join('\r\n');

  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="laporan-rekap.csv"',
    },
  });
}
