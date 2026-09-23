import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { readSession, isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { can } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { pathAbsolutBerkas } from '@/lib/berkas';
import { recordAudit, requestIp } from '@/lib/audit';

/**
 * Route bergerbang tunggal untuk SEMUA berkas terunggah (01-fondasi §5.4),
 * menggantikan pola per-modul (`kepegawaian/berkas/[nama]`, `docs/tangkapan`).
 * Mengecek sesi + izin domain (`<domain>.view`) — foto presensi dan dokumen
 * lamaran adalah data pribadi, jadi setiap akses diaudit.
 */
const DOMAIN_DIAUDIT = new Set(['presensi', 'rekrutmen']);

async function bolehLihatBerkasPresensi(session: SessionPayload, fileId: bigint, uploadedBy: bigint | null): Promise<boolean> {
  if (isSuperAdmin(session)) return true;
  if (uploadedBy != null && String(uploadedBy) === session.userId) return true;
  if (!(await can(session, 'presensi.review'))) return false;
  if (session.unitIds == null) return true;
  const rujukan = await prisma.staffAttendance.findFirst({ where: { OR: [{ checkInPhotoId: fileId }, { checkOutPhotoId: fileId }] }, select: { staffId: true } })
    ?? await prisma.staffLeave.findFirst({ where: { lampiranId: fileId }, select: { staffId: true } });
  if (!rujukan) return false;
  const staff = await prisma.staff.findUnique({ where: { id: rujukan.staffId }, include: { otherUnits: true } });
  const units = [staff?.unitId, ...(staff?.otherUnits.map((u) => u.unitId) ?? [])].filter((x): x is number => x != null);
  return units.some((u) => session.unitIds!.includes(u));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return new NextResponse('Tidak berwenang', { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse('Tidak ditemukan', { status: 404 });

  const berkas = await prisma.fileObject.findUnique({ where: { id: BigInt(id) } });
  if (!berkas || berkas.deletedAt) return new NextResponse('Tidak ditemukan', { status: 404 });

  // Domain berkas → menu izinnya: berkas `aset` (foto aset, BA, foto kerusakan) dijaga `sarpras.view`.
  const permKey = `${berkas.domain === 'aset' ? 'sarpras' : berkas.domain}.view`;
  if (berkas.domain === 'presensi') {
    // 02 §3.9: foto presensi hanya untuk pemiliknya, kepala unitnya, SDM, dan
    // ketua (= pemegang presensi.review, dibatasi unit pegawai pemilik foto).
    if (!(await bolehLihatBerkasPresensi(session, berkas.id, berkas.uploadedBy))) {
      return new NextResponse('Tidak berwenang', { status: 403 });
    }
  } else if (!isSuperAdmin(session) && !(await can(session, permKey))) {
    return new NextResponse('Tidak berwenang', { status: 403 });
  }

  try {
    const isi = await readFile(pathAbsolutBerkas(berkas.path));
    if (DOMAIN_DIAUDIT.has(berkas.domain)) {
      await recordAudit({
        aksi: 'BERKAS_DIBUKA',
        entitas: 'file_objects',
        entitasId: String(berkas.id),
        ringkasan: `Membuka berkas ${berkas.originalName} (${berkas.domain})`,
        aktor: { id: session.userId, nama: session.nama },
        ip: requestIp(_request),
      });
    }
    return new NextResponse(new Uint8Array(isi), {
      headers: {
        'Content-Type': berkas.mime,
        'Content-Disposition': `inline; filename="${encodeURIComponent(berkas.originalName)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return new NextResponse('Berkas fisik tidak ditemukan', { status: 404 });
  }
}
