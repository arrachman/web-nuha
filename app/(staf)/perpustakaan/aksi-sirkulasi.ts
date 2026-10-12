'use server';

import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { jalankanAksi, teks, teksAtauNull, angka, wajib } from '@/lib/aksi-form';
import { bacaAturanPerpus, hitungHariDenda } from './data';

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

function tanggal(fd: FormData, k: string, label: string): Date {
  const d = new Date(wajib(fd, k, label));
  if (Number.isNaN(d.getTime())) throw new Error(`${label} tidak valid.`);
  return d;
}

const fmtTgl = (d: Date) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtRp = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/** Catat peminjaman per eksemplar (pilih dari daftar atau scan kode eksemplar). */
export async function pinjamBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const unitId = Number(teks(fd, 'unitId'));
    const kodeScan = teks(fd, 'kodeEksemplar').toUpperCase().trim();
    const copy = kodeScan
      ? await prisma.bookCopy.findFirst({ where: { unitId, kode: kodeScan }, include: { book: true } })
      : await prisma.bookCopy.findUnique({ where: { id: idBig(fd, 'copyId') }, include: { book: true } });
    if (!copy) throw new Error(kodeScan ? `Eksemplar "${kodeScan}" tidak ditemukan di unit ini.` : 'Eksemplar tidak ditemukan.');
    if (copy.unitId !== unitId) throw new Error('Eksemplar bukan milik unit aktif.');
    if (copy.status !== 'Tersedia' || copy.kondisi === 'Hilang') throw new Error(`Eksemplar ${copy.kode} tidak tersedia (status ${copy.status.toLowerCase()}).`);

    const aturan = await bacaAturanPerpus(unitId);
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
    if (santriId || staffId) {
      const aktif = await prisma.bookLoan.count({
        where: { unitId, status: 'Dipinjam', ...(santriId ? { santriId } : { staffId }) },
      });
      if (aktif >= aturan.maksBuku) throw new Error(`${nama} sudah meminjam ${aktif} buku (maks. ${aturan.maksBuku}). Kembalikan dulu salah satu.`);
    }

    const tglPinjam = tanggal(fd, 'tanggalPinjam', 'Tanggal pinjam');
    const tglJatuhTempo = tanggal(fd, 'tanggalJatuhTempo', 'Jatuh tempo');
    if (tglJatuhTempo < tglPinjam) throw new Error('Jatuh tempo tidak boleh sebelum tanggal pinjam.');

    const loan = await prisma.bookLoan.create({
      data: {
        bookId: copy.bookId, copyId: copy.id, unitId,
        tipePeminjam: tipe, santriId, staffId, namaPeminjam: nama.trim(),
        tanggalPinjam: tglPinjam, tanggalJatuhTempo: tglJatuhTempo,
        status: 'Dipinjam', catatan: teksAtauNull(fd, 'catatan'),
      },
    });
    await prisma.bookCopy.update({ where: { id: copy.id }, data: { status: 'Dipinjam' } });
    await recordAudit({ aksi: 'perpustakaan.pinjam', entitas: 'BookLoan', entitasId: String(loan.id), ringkasan: `${copy.kode} dipinjam ${nama}`, aktor: aktor(session) });
    return `Peminjaman "${copy.book.judul}" (${copy.kode}) oleh ${nama} dicatat — jatuh tempo ${fmtTgl(tglJatuhTempo)}.`;
  }, OPSI);
}

/** Catat pengembalian: hitung & simpan denda, bebaskan eksemplar. */
export async function kembalikanBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const loan = await prisma.bookLoan.findUnique({ where: { id }, include: { book: true } });
    if (!loan) throw new Error('Data peminjaman tidak ditemukan.');
    if (loan.status !== 'Dipinjam') throw new Error('Buku sudah dikembalikan.');
    const tglKembali = tanggal(fd, 'tanggalKembali', 'Tanggal kembali');
    const kondisiKembali = teks(fd, 'kondisiKembali') || 'Baik';
    if (!['Baik', 'Rusak', 'Hilang'].includes(kondisiKembali)) throw new Error('Kondisi kembali tidak valid.');

    const aturan = await bacaAturanPerpus(loan.unitId);
    const hariDenda = hitungHariDenda(loan.tanggalJatuhTempo, tglKembali, aturan.libur);
    const denda = hariDenda * aturan.dendaPerHari;

    await prisma.bookLoan.update({
      where: { id },
      data: { tanggalKembali: tglKembali, status: 'Dikembalikan', denda },
    });
    if (loan.copyId) {
      await prisma.bookCopy.update({
        where: { id: loan.copyId },
        data: {
          kondisi: kondisiKembali,
          status: kondisiKembali === 'Hilang' ? 'Hilang' : 'Tersedia',
        },
      });
    }
    await recordAudit({ aksi: 'perpustakaan.kembali', entitas: 'BookLoan', entitasId: String(id), ringkasan: `${loan.book.kode} kembali dari ${loan.namaPeminjam}${denda > 0 ? ` — denda ${fmtRp(denda)}` : ''}`, aktor: aktor(session) });
    if (kondisiKembali === 'Hilang') return `Buku ditandai HILANG saat pengembalian.${denda > 0 ? ` Denda keterlambatan ${fmtRp(denda)}.` : ''}`;
    return hariDenda > 0
      ? `Buku dikembalikan — terlambat ${hariDenda} hari, denda ${fmtRp(denda)} (belum dibayar).`
      : 'Buku dikembalikan tepat waktu, tanpa denda.';
  }, OPSI);
}

/** Catat pembayaran denda (boleh sebagian; lunas bila total bayar >= denda). */
export async function bayarDenda(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const loan = await prisma.bookLoan.findUnique({ where: { id }, include: { book: true } });
    if (!loan) throw new Error('Data peminjaman tidak ditemukan.');
    if (loan.denda <= 0) throw new Error('Peminjaman ini tidak memiliki denda.');
    const sisa = loan.denda - loan.dendaDibayar;
    if (sisa <= 0) throw new Error('Denda sudah lunas.');
    const nominal = angka(fd, 'nominal') || sisa;
    if (nominal <= 0) throw new Error('Nominal pembayaran tidak valid.');
    const dibayar = Math.min(loan.denda, loan.dendaDibayar + nominal);
    await prisma.bookLoan.update({ where: { id }, data: { dendaDibayar: dibayar } });
    await recordAudit({ aksi: 'perpustakaan.denda.bayar', entitas: 'BookLoan', entitasId: String(id), ringkasan: `Bayar denda ${loan.book.kode} (${loan.namaPeminjam}) ${fmtRp(dibayar - loan.dendaDibayar)}`, aktor: aktor(session) });
    const sisaBaru = loan.denda - dibayar;
    return sisaBaru <= 0
      ? `Denda ${loan.namaPeminjam} LUNAS (${fmtRp(loan.denda)}).`
      : `Pembayaran denda dicatat — sisa ${fmtRp(sisaBaru)}.`;
  }, OPSI);
}

/** Perpanjang jatuh tempo pinjaman aktif sesuai aturan unit. */
export async function perpanjangBuku(fd: FormData): Promise<never> {
  return jalankanAksi(fd, async () => {
    const session = await sesi();
    const id = idBig(fd);
    const loan = await prisma.bookLoan.findUnique({ where: { id }, include: { book: true } });
    if (!loan) throw new Error('Data peminjaman tidak ditemukan.');
    if (loan.status !== 'Dipinjam') throw new Error('Buku sudah dikembalikan, tidak bisa diperpanjang.');
    const aturan = await bacaAturanPerpus(loan.unitId);
    if (loan.jumlahPerpanjang >= aturan.maksPerpanjang) {
      throw new Error(`Sudah diperpanjang ${loan.jumlahPerpanjang} kali (maks. ${aturan.maksPerpanjang}). Buku harus dikembalikan.`);
    }
    const hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
    const tempo = new Date(loan.tanggalJatuhTempo); tempo.setHours(0, 0, 0, 0);
    const basis = tempo > hariIni ? tempo : hariIni;
    const baru = new Date(basis);
    baru.setDate(baru.getDate() + aturan.lamaPinjam);
    await prisma.bookLoan.update({
      where: { id },
      data: { tanggalJatuhTempo: baru, jumlahPerpanjang: loan.jumlahPerpanjang + 1 },
    });
    await recordAudit({ aksi: 'perpustakaan.perpanjang', entitas: 'BookLoan', entitasId: String(id), ringkasan: `${loan.book.kode} diperpanjang s.d. ${fmtTgl(baru)} (${loan.namaPeminjam})`, aktor: aktor(session) });
    return `Jatuh tempo "${loan.book.judul}" diperpanjang s.d. ${fmtTgl(baru)}.`;
  }, OPSI);
}
