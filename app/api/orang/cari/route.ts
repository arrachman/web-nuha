import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';

/** Saran dibatasi pendek: daftar panjang justru bikin operator menyisir. */
const BATAS = 5;

/**
 * Pencarian identitas untuk pemilih wali. Daftar `orang` bisa ribuan baris,
 * jadi jangan dikirim utuh ke browser — cari sesuai ketikan saja.
 */
export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi tidak ditemukan.' } }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  // `santri=1` dipakai pemilih wali: hanya orang yang benar-benar terdaftar
  // sebagai santri yang boleh jadi pihak "anak" dalam relasi wali.
  const hanyaSantri = params.get('santri') === '1';
  // `ids=1,2` dipakai form ubah untuk memuat nama orang yang sudah terpilih —
  // tanpa ini pemilih hanya menyimpan id dan tampil kosong saat dibuka lagi.
  const ids = (params.get('ids') ?? '').split(',').map((item) => item.trim()).filter((item) => /^\d+$/.test(item));

  const rows = await prisma.person.findMany({
    where: ids.length ? { id: { in: ids.map((item) => BigInt(item)) } } : {
      AND: [
        // `q` kosong sah: pemilih menampilkan saran awal begitu diklik.
        ...(q ? [{ OR: [{ fullName: { contains: q } }, { nik: { contains: q } }, { phone: { contains: q } }] }] : []),
        ...(hanyaSantri ? [{ santri: { isNot: null } }] : []),
      ],
    },
    select: { id: true, fullName: true, phone: true, nik: true, santri: { select: { nis: true } } },
    orderBy: { fullName: 'asc' },
    take: ids.length ? ids.length : BATAS,
  });

  return NextResponse.json({
    success: true,
    data: rows.map((row) => ({
      id: String(row.id),
      nama: row.fullName,
      keterangan: [row.phone, row.nik ? `NIK ${row.nik}` : null, row.santri ? `santri ${row.santri.nis ?? ''}`.trim() : null].filter(Boolean).join(' · '),
    })),
  });
}
