'use server';

import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { jalankanAksi, teks, teksAtauNull, angka, wajib } from '@/lib/aksi-form';
import { sisaEksemplar } from './data';

const OPSI = { bawaan: '/perpustakaan', prefiks: ['/perpustakaan'], revalidate: ['/perpustakaan'] };

async function sesi() {
  const s = await readSession();
  if (!s) throw new Error('Sesi tidak ditemukan, silakan masuk kembali.');
  return s;
}

function aktor(session: { userId: string; nama: string }) {
  return { id: session.userId, nama: session.nama };
}

function idBig(fd: FormData, k = 'id'): bigint {
  const v = teks(fd, k);
  if (!/^\d+$/.test(v)) throw new Error('ID tidak valid.');
  return BigInt(v);
}

function idInt(fd: FormData, k: string): number {
  const n = Number(teks(fd, k));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Nilai ${k} tidak valid.`);
  return n;
}

function tanggal(fd: FormData, k: string, label: string): Date {
  const d = new Date(wajib(fd, k, label));
  if (Number.isNaN(d.getTime())) throw new Error(`${label} tidak valid.`);
  return d;
}

async function pastikanUnit(unitId: number) {
  const unit = await prisma.unit.findFirst({ where: { id: unitId, aktif: true, jenjang: { in: ['SMP', 'MA', 'Pesantren'] } } });
  if (!unit) throw new Error('Unit perpustakaan tidak valid.');
  return unit;
}

/** Tambah buku baru ke katalog unit. */
export async function tambahBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const unitId = idInt(fd, 'unitId');
    await pastikanUnit(unitId);
    const kode = wajib(fd, 'kode', 'Kode buku').toUpperCase().trim();
    const judul = wajib(fd, 'judul', 'Judul');
    const jumlah = Math.max(1, angka(fd, 'jumlah') || 1);
    const duplikat = await prisma.book.count({ where: { unitId, kode } });
    if (duplikat > 0) throw new Error(`Kode "${kode}" sudah dipakai di unit ini.`);

    const buku = await prisma.book.create({
      data: {
        unitId,
        kode,
        judul: judul.trim(),
        penulis: teksAtauNull(fd, 'penulis'),
        penerbit: teksAtauNull(fd, 'penerbit'),
        tahunTerbit: (() => { const t = teks(fd, 'tahunTerbit'); return t ? Number(t) || null : null; })(),
        isbn: teksAtauNull(fd, 'isbn'),
        kategori: teksAtauNull(fd, 'kategori'),
        rak: teksAtauNull(fd, 'rak'),
        jumlah,
        keterangan: teksAtauNull(fd, 'keterangan'),
      },
    });
    await recordAudit({ aksi: 'perpustakaan.buku.tambah', entitas: 'Book', entitasId: String(buku.id), ringkasan: `${kode} — ${judul}`, aktor: aktor(session) });
    return `Buku "${judul}" ditambahkan ke katalog.`;
  }, OPSI);
}

/** Ubah data buku. */
export async function ubahBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const buku = await prisma.book.findUnique({ where: { id }, include: { unit: true } });
    if (!buku) throw new Error('Buku tidak ditemukan.');
    const kode = wajib(fd, 'kode', 'Kode buku').toUpperCase().trim();
    const judul = wajib(fd, 'judul', 'Judul');
    const jumlah = Math.max(1, angka(fd, 'jumlah') || 1);
    const duplikat = await prisma.book.count({ where: { unitId: buku.unitId, kode, id: { not: id } } });
    if (duplikat > 0) throw new Error(`Kode "${kode}" sudah dipakai di unit ini.`);
    const sedangDipinjam = await prisma.bookLoan.count({ where: { bookId: id, status: 'Dipinjam' } });
    if (jumlah < sedangDipinjam) throw new Error(`Jumlah tidak boleh kurang dari ${sedangDipinjam} (sedang dipinjam).`);

    await prisma.book.update({
      where: { id },
      data: {
        kode,
        judul: judul.trim(),
        penulis: teksAtauNull(fd, 'penulis'),
        penerbit: teksAtauNull(fd, 'penerbit'),
        tahunTerbit: (() => { const t = teks(fd, 'tahunTerbit'); return t ? Number(t) || null : null; })(),
        isbn: teksAtauNull(fd, 'isbn'),
        kategori: teksAtauNull(fd, 'kategori'),
        rak: teksAtauNull(fd, 'rak'),
        jumlah,
        keterangan: teksAtauNull(fd, 'keterangan'),
      },
    });
    await recordAudit({ aksi: 'perpustakaan.buku.ubah', entitas: 'Book', entitasId: String(id), ringkasan: `${kode} — ${judul}`, aktor: aktor(session) });
    return `Buku "${judul}" diperbarui.`;
  }, OPSI);
}

/** Hapus buku (hanya bila tidak ada peminjaman aktif). */
export async function hapusBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const buku = await prisma.book.findUnique({ where: { id } });
    if (!buku) throw new Error('Buku tidak ditemukan.');
    const aktif = await prisma.bookLoan.count({ where: { bookId: id, status: 'Dipinjam' } });
    if (aktif > 0) throw new Error('Buku masih dipinjam, tidak bisa dihapus.');
    await prisma.bookLoan.deleteMany({ where: { bookId: id } });
    await prisma.book.delete({ where: { id } });
    await recordAudit({ aksi: 'perpustakaan.buku.hapus', entitas: 'Book', entitasId: String(id), ringkasan: `${buku.kode} — ${buku.judul}`, aktor: aktor(session) });
    return `Buku "${buku.judul}" dihapus dari katalog.`;
  }, OPSI);
}

/** Catat peminjaman baru. */
export async function pinjamBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const bookId = idBig(fd, 'bookId');
    const buku = await prisma.book.findUnique({ where: { id: bookId } });
    if (!buku) throw new Error('Buku tidak ditemukan.');
    const sisa = await sisaEksemplar(bookId);
    if (sisa <= 0) throw new Error('Stok buku habis, tidak bisa dipinjam.');

    const tipe = wajib(fd, 'tipePeminjam', 'Tipe peminjam');
    if (!['santri', 'pegawai', 'umum'].includes(tipe)) throw new Error('Tipe peminjam tidak valid.');
    let santriId: bigint | null = null;
    let staffId: bigint | null = null;
    let nama = '';
    if (tipe === 'santri') {
      santriId = idBig(fd, 'santriId');
      const s = await prisma.santri.findUnique({ where: { id: santriId }, include: { person: true } });
      if (!s) throw new Error('Santri tidak ditemukan.');
      nama = s.person.fullName;
    } else if (tipe === 'pegawai') {
      staffId = idBig(fd, 'staffId');
      const st = await prisma.staff.findUnique({ where: { id: staffId }, include: { person: true } });
      if (!st) throw new Error('Pegawai tidak ditemukan.');
      nama = st.person.fullName;
    } else {
      nama = wajib(fd, 'namaPeminjam', 'Nama peminjam');
    }

    const tglPinjam = tanggal(fd, 'tanggalPinjam', 'Tanggal pinjam');
    const tglJatuhTempo = tanggal(fd, 'tanggalJatuhTempo', 'Jatuh tempo');
    if (tglJatuhTempo < tglPinjam) throw new Error('Jatuh tempo tidak boleh sebelum tanggal pinjam.');

    const loan = await prisma.bookLoan.create({
      data: {
        bookId, unitId: buku.unitId, tipePeminjam: tipe,
        santriId, staffId, namaPeminjam: nama.trim(),
        tanggalPinjam: tglPinjam, tanggalJatuhTempo: tglJatuhTempo,
        status: 'Dipinjam', catatan: teksAtauNull(fd, 'catatan'),
      },
    });
    await recordAudit({ aksi: 'perpustakaan.pinjam', entitas: 'BookLoan', entitasId: String(loan.id), ringkasan: `${buku.kode} dipinjam ${nama}`, aktor: aktor(session) });
    return `Peminjaman "${buku.judul}" oleh ${nama} dicatat.`;
  }, OPSI);
}

/** Tandai buku dikembalikan. */
export async function kembalikanBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const loan = await prisma.bookLoan.findUnique({ where: { id }, include: { book: true } });
    if (!loan) throw new Error('Data peminjaman tidak ditemukan.');
    if (loan.status !== 'Dipinjam') throw new Error('Buku sudah dikembalikan.');
    const tglKembali = tanggal(fd, 'tanggalKembali', 'Tanggal kembali');
    await prisma.bookLoan.update({ where: { id }, data: { tanggalKembali: tglKembali, status: 'Dikembalikan' } });
    await recordAudit({ aksi: 'perpustakaan.kembali', entitas: 'BookLoan', entitasId: String(id), ringkasan: `${loan.book.kode} kembali dari ${loan.namaPeminjam}`, aktor: aktor(session) });
    const terlambat = Math.floor((tglKembali.getTime() - loan.tanggalJatuhTempo.getTime()) / 86400000);
    return terlambat > 0
      ? `Buku dikembalikan (terlambat ${terlambat} hari).`
      : 'Buku dikembalikan tepat waktu.';
  }, OPSI);
}
