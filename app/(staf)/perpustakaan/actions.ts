'use server';

import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { jalankanAksi, teks, teksAtauNull, angka, wajib } from '@/lib/aksi-form';
import { formatKodeEksemplar } from './data';

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


/** Nomor urut eksemplar berikutnya untuk sebuah buku (dari sufiks kode terbesar). */
async function urutBerikutnya(bookId: bigint): Promise<number> {
  const copies = await prisma.bookCopy.findMany({ where: { bookId }, select: { kode: true } });
  let maks = 0;
  for (const c of copies) {
    const m = /-(\d+)$/.exec(c.kode);
    if (m) maks = Math.max(maks, Number(m[1]));
  }
  return maks + 1;
}

/** Buat N eksemplar baru untuk buku (kode berurutan). */
async function buatEksemplar(buku: { id: bigint; unitId: number; kode: string }, jumlah: number) {
  let urut = await urutBerikutnya(buku.id);
  const data: { bookId: bigint; unitId: number; kode: string }[] = [];
  for (let i = 0; i < jumlah; i++, urut++) {
    data.push({ bookId: buku.id, unitId: buku.unitId, kode: formatKodeEksemplar(buku.kode, urut) });
  }
  if (data.length) await prisma.bookCopy.createMany({ data });
}

/** Samakan Book.jumlah dengan jumlah baris eksemplar. */
async function sinkronJumlah(bookId: bigint) {
  const n = await prisma.bookCopy.count({ where: { bookId } });
  await prisma.book.update({ where: { id: bookId }, data: { jumlah: n } });
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
    await buatEksemplar(buku, jumlah);
    await recordAudit({ aksi: 'perpustakaan.buku.tambah', entitas: 'Book', entitasId: String(buku.id), ringkasan: `${kode} — ${judul}`, aktor: aktor(session) });
    return `Buku "${judul}" ditambahkan ke katalog (${jumlah} eksemplar dibuat).`;
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
    // Sinkronkan eksemplar: ganti kode mengikuti kode buku baru, lalu samakan jumlahnya.
    const copies = await prisma.bookCopy.findMany({ where: { bookId: id }, orderBy: { kode: 'asc' } });
    if (kode !== buku.kode) {
      for (const c of copies) {
        const m = /-(\d+)$/.exec(c.kode);
        const suffix = m ? Number(m[1]) : 0;
        await prisma.bookCopy.update({ where: { id: c.id }, data: { kode: formatKodeEksemplar(kode, suffix) } });
      }
    }
    if (jumlah > copies.length) {
      await buatEksemplar({ id, unitId: buku.unitId, kode }, jumlah - copies.length);
    } else if (jumlah < copies.length) {
      const bisaHapus = copies.filter((c) => c.status === 'Tersedia').slice(-(copies.length - jumlah));
      if (copies.length - bisaHapus.length > jumlah) {
        throw new Error('Tidak bisa mengurangi jumlah: sebagian eksemplar sedang dipinjam/hilang.');
      }
      if (bisaHapus.length) await prisma.bookCopy.deleteMany({ where: { id: { in: bisaHapus.map((c) => c.id) } } });
    }
    await sinkronJumlah(id);
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
    await prisma.bookCopy.deleteMany({ where: { bookId: id } });
    await prisma.bookLoan.deleteMany({ where: { bookId: id } });
    await prisma.book.delete({ where: { id } });
    await recordAudit({ aksi: 'perpustakaan.buku.hapus', entitas: 'Book', entitasId: String(id), ringkasan: `${buku.kode} — ${buku.judul}`, aktor: aktor(session) });
    return `Buku "${buku.judul}" dihapus dari katalog.`;
  }, OPSI);
}

/** Tambah eksemplar untuk buku yang sudah ada. */
export async function tambahEksemplar(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const bookId = idBig(fd);
    const buku = await prisma.book.findUnique({ where: { id: bookId } });
    if (!buku) throw new Error('Buku tidak ditemukan.');
    const jumlah = Math.max(1, angka(fd, 'jumlah') || 1);
    await buatEksemplar(buku, jumlah);
    await sinkronJumlah(bookId);
    await recordAudit({ aksi: 'perpustakaan.eksemplar.tambah', entitas: 'Book', entitasId: String(bookId), ringkasan: `+${jumlah} eksemplar ${buku.kode}`, aktor: aktor(session) });
    return `${jumlah} eksemplar baru untuk "${buku.judul}" dibuat.`;
  }, OPSI);
}

/** Ubah kondisi/status satu eksemplar. */
export async function ubahEksemplar(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const copy = await prisma.bookCopy.findUnique({ where: { id }, include: { book: true } });
    if (!copy) throw new Error('Eksemplar tidak ditemukan.');
    if (copy.status === 'Dipinjam') throw new Error('Eksemplar sedang dipinjam — kembalikan dulu untuk mengubahnya.');
    const kondisi = wajib(fd, 'kondisi', 'Kondisi');
    if (!['Baik', 'Rusak', 'Diperbaiki', 'Hilang'].includes(kondisi)) throw new Error('Kondisi tidak valid.');
    const status = kondisi === 'Hilang' ? 'Hilang' : 'Tersedia';
    await prisma.bookCopy.update({ where: { id }, data: { kondisi, status } });
    await recordAudit({ aksi: 'perpustakaan.eksemplar.ubah', entitas: 'BookCopy', entitasId: String(id), ringkasan: `${copy.kode} → ${kondisi}/${status}`, aktor: aktor(session) });
    return `Eksemplar ${copy.kode} kini ${kondisi.toLowerCase()} (${status.toLowerCase()}).`;
  }, OPSI);
}

/** Hapus satu eksemplar (tidak sedang dipinjam). */
export async function hapusEksemplar(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const copy = await prisma.bookCopy.findUnique({ where: { id }, include: { book: true } });
    if (!copy) throw new Error('Eksemplar tidak ditemukan.');
    if (copy.status === 'Dipinjam') throw new Error('Eksemplar sedang dipinjam, tidak bisa dihapus.');
    await prisma.bookCopy.delete({ where: { id } });
    await sinkronJumlah(copy.bookId);
    await recordAudit({ aksi: 'perpustakaan.eksemplar.hapus', entitas: 'BookCopy', entitasId: String(id), ringkasan: `Hapus eksemplar ${copy.kode}`, aktor: aktor(session) });
    return `Eksemplar ${copy.kode} dihapus.`;
  }, OPSI);
}

/** Simpan aturan sirkulasi per unit (AppSetting perpus:<unitId>:*). */
export async function simpanAturanPerpus(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const unitId = idInt(fd, 'unitId');
    await pastikanUnit(unitId);
    const positif = (k: string, label: string, min = 0) => {
      const n = angka(fd, k);
      if (n === null || !Number.isFinite(n) || n < min) throw new Error(`${label} tidak valid.`);
      return String(Math.floor(n));
    };
    const nilai: Record<string, string> = {
      'lama-pinjam': positif('lamaPinjam', 'Lama pinjam', 1),
      'maks-buku': positif('maksBuku', 'Maks. buku', 1),
      'denda-per-hari': positif('dendaPerHari', 'Denda per hari'),
      'maks-perpanjang': positif('maksPerpanjang', 'Maks. perpanjangan', 1),
      'libur': teks(fd, 'libur').split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)).join('\n'),
    };
    for (const [nama, value] of Object.entries(nilai)) {
      const key = `perpus:${unitId}:${nama}`;
      await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await recordAudit({ aksi: 'perpustakaan.aturan.simpan', entitas: 'AppSetting', entitasId: String(unitId), ringkasan: `Aturan sirkulasi unit ${unitId} diperbarui`, aktor: aktor(session) });
    return 'Aturan peminjaman & denda disimpan.';
  }, OPSI);
}
