'use server';

import { Prisma, type AssetCondition, type LocationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readSession, isSuperAdmin, type SessionPayload } from '@/lib/auth';
import { can, requireAction } from '@/lib/access';
import { recordAudit } from '@/lib/audit';
import { simpanBerkas, BerkasError } from '@/lib/berkas';
import { kirimWa } from '@/lib/wa';
import { log } from '@/lib/logger';
import { assertUnit } from '@/lib/unit-scope';
import { jalankanAksi, teks, teksAtauNull, angka, wajib } from '@/lib/aksi-form';
import { parseCsv } from '@/lib/csv';
import { buatQrToken, denganRetryUnik, kodeBerikutnya, nomorDokumen, prefiksKodeInventaris } from '@/lib/aset/kode';
import { hitungSusut } from '@/lib/aset/susut';
import { assertUnitAset } from '@/lib/aset/akses';
import {
  ALASAN_HAPUS, AMBANG_KAPITALISASI_BAWAAN, CARA_PEROLEHAN, JENIS_BERKAS_ASET, METODE_HAPUS, SETTING_AMBANG_KAPITALISASI,
  SETTING_AMBANG_PENGADAAN, STATUS_KERUSAKAN, STATUS_PINJAM_AKTIF, TINGKAT_KERUSAKAN,
} from '@/lib/aset/konstanta';
import { bacaAngkaSetting, buatJenjang, jenjangPengadaan, jenjangPenghapusan, putuskanTahap } from '@/lib/aset/persetujuan';

const OPSI = { bawaan: '/sarpras', prefiks: ['/sarpras', '/lapor-kerusakan', '/a/', '/r/'], revalidate: ['/sarpras'] };

function aktor(session: SessionPayload) {
  return { id: session.userId, nama: session.nama };
}
function uid(session: SessionPayload) {
  return BigInt(session.userId);
}
function idBig(fd: FormData, k = 'id'): bigint {
  const v = teks(fd, k);
  if (!/^\d+$/.test(v)) throw new Error('ID tidak valid.');
  return BigInt(v);
}
function idInt(fd: FormData, k: string): number | null {
  const v = teks(fd, k);
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`Nilai ${k} tidak valid.`);
  return n;
}
function tanggal(fd: FormData, k: string, label: string): Date {
  const d = new Date(wajib(fd, k, label));
  if (Number.isNaN(d.getTime())) throw new Error(`${label} tidak valid.`);
  return d;
}
async function berkasDariForm(fd: FormData, k: string, session: SessionPayload) {
  const f = fd.get(k);
  if (!(f instanceof File) || f.size === 0) return null;
  try {
    return await simpanBerkas({ domain: 'aset', buffer: Buffer.from(await f.arrayBuffer()), originalName: f.name, uploadedBy: uid(session) });
  } catch (err) {
    if (err instanceof BerkasError) throw new Error(err.message);
    throw err;
  }
}

/** Nomor dokumen berurut per tahun — dibaca dari kode terakhir, dibungkus retry-on-P2002 oleh pemanggil. */
async function nomorBaru(jenis: 'KRS' | 'PJM' | 'PGD' | 'OPN' | 'HPS', percobaan: number): Promise<string> {
  const tahun = new Date().getFullYear();
  const where = { code: { startsWith: `${jenis}-${tahun}-` } };
  const arg = { where, orderBy: { code: 'desc' as const }, select: { code: true } };
  const terakhir =
    jenis === 'KRS' ? await prisma.damageReport.findFirst(arg)
      : jenis === 'PJM' ? await prisma.assetLoan.findFirst(arg)
        : jenis === 'PGD' ? await prisma.procurement.findFirst(arg)
          : jenis === 'OPN' ? await prisma.stockOpname.findFirst(arg)
            : await prisma.assetDisposal.findFirst(arg);
  return nomorDokumen(jenis, tahun, terakhir?.code ?? null, percobaan);
}

async function kodeInventarisBaru(ownerUnitId: number, categoryId: number, tahun: number, percobaan: number) {
  const [unit, kategori] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { id: ownerUnitId } }),
    prisma.assetCategory.findUniqueOrThrow({ where: { id: categoryId } }),
  ]);
  const prefiks = prefiksKodeInventaris(unit.key, kategori.code, tahun);
  const terakhir = await prisma.asset.findFirst({ where: { inventoryCode: { startsWith: prefiks } }, orderBy: { inventoryCode: 'desc' }, select: { inventoryCode: true } });
  return kodeBerikutnya(prefiks, terakhir?.inventoryCode ?? null, percobaan);
}

type DataAsetBaru = Omit<Prisma.AssetUncheckedCreateInput, 'inventoryCode' | 'qrToken'>;

/** Buat satu aset + mutasi "Registrasi", dengan kode inventaris unik (retry saat dua orang mendaftar bersamaan). */
async function buatAset(data: DataAsetBaru, actorId: bigint) {
  const tahun = new Date(data.acquisitionDate as Date).getFullYear();
  return denganRetryUnik(async (percobaan) => {
    const inventoryCode = await kodeInventarisBaru(data.ownerUnitId, data.categoryId, tahun, percobaan);
    return prisma.$transaction(async (tx) => {
      const aset = await tx.asset.create({ data: { ...data, inventoryCode, qrToken: buatQrToken() } });
      await tx.assetMovement.create({
        data: { assetId: aset.id, type: 'Registrasi', toLocationId: aset.locationId, toUnitId: aset.ownerUnitId, toHolderId: aset.holderStaffId, date: new Date(), reason: 'Registrasi aset', actorId },
      });
      return aset;
    });
  });
}

// ─────────────────────────────── Master ───────────────────────────────

export async function simpanKategori(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.master_manage');
    const code = wajib(fd, 'code', 'Kode kategori');
    const kibGroup = wajib(fd, 'kibGroup', 'Golongan KIB').toUpperCase();
    if (!/^[A-F]$/.test(kibGroup)) throw new Error('Golongan KIB harus A–F.');
    const data = {
      name: wajib(fd, 'name', 'Nama kategori'), kibGroup, usefulLifeYears: angka(fd, 'usefulLifeYears'),
      needsMaintenance: fd.get('needsMaintenance') === 'on', isConsumable: fd.get('isConsumable') === 'on',
    };
    await prisma.assetCategory.upsert({ where: { code }, create: { code, ...data }, update: data });
    await recordAudit({ aksi: 'SARPRAS_KATEGORI_SIMPAN', entitas: 'asset_categories', entitasId: code, ringkasan: `Kategori ${code} ${data.name} disimpan.`, aktor: aktor(session) });
    return `Kategori ${code} tersimpan.`;
  }, OPSI);
}

export async function simpanSumberDana(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.master_manage');
    const code = wajib(fd, 'code', 'Kode').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const data = { name: wajib(fd, 'name', 'Nama'), restrictedDisposal: fd.get('restrictedDisposal') === 'on' };
    await prisma.fundingSource.upsert({ where: { code }, create: { code, ...data }, update: data });
    await recordAudit({ aksi: 'SARPRAS_DANA_SIMPAN', entitas: 'funding_sources', entitasId: code, ringkasan: `Sumber dana ${code} disimpan.`, aktor: aktor(session) });
    return `Sumber dana ${code} tersimpan.`;
  }, OPSI);
}

export async function simpanVendor(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.master_manage');
    const v = await prisma.vendor.create({
      data: { name: wajib(fd, 'name', 'Nama vendor'), phone: teksAtauNull(fd, 'phone'), address: teksAtauNull(fd, 'address'), npwp: teksAtauNull(fd, 'npwp'), note: teksAtauNull(fd, 'note') },
    });
    await recordAudit({ aksi: 'SARPRAS_VENDOR_TAMBAH', entitas: 'vendors', entitasId: String(v.id), ringkasan: `Vendor ${v.name} ditambahkan.`, aktor: aktor(session) });
    return `Vendor ${v.name} ditambahkan.`;
  }, OPSI);
}

export async function simpanAmbang(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.master_manage');
    const pengadaan = angka(fd, 'ambangPengadaan');
    const kapitalisasi = angka(fd, 'ambangKapitalisasi');
    if (pengadaan == null || kapitalisasi == null || pengadaan < 0 || kapitalisasi < 0) throw new Error('Ambang harus angka ≥ 0.');
    await prisma.appSetting.upsert({ where: { key: SETTING_AMBANG_PENGADAAN }, create: { key: SETTING_AMBANG_PENGADAAN, value: String(pengadaan) }, update: { value: String(pengadaan) } });
    await prisma.appSetting.upsert({ where: { key: SETTING_AMBANG_KAPITALISASI }, create: { key: SETTING_AMBANG_KAPITALISASI, value: String(kapitalisasi) }, update: { value: String(kapitalisasi) } });
    await recordAudit({ aksi: 'SARPRAS_AMBANG_SIMPAN', entitas: 'app_settings', entitasId: 'sarpras', ringkasan: `Ambang pengadaan yayasan ${pengadaan}, kapitalisasi ${kapitalisasi}.`, aktor: aktor(session) });
    return 'Ambang persetujuan tersimpan.';
  }, OPSI);
}

export async function tambahPersediaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const unitId = idInt(fd, 'unitId');
    assertUnit(session, unitId);
    const item = await prisma.consumableItem.create({
      data: { name: wajib(fd, 'name', 'Nama barang'), unitOfMeasure: wajib(fd, 'unitOfMeasure', 'Satuan'), stock: angka(fd, 'stock') ?? 0, minStock: angka(fd, 'minStock') ?? 0, unitId, storage: teksAtauNull(fd, 'storage') },
    });
    await recordAudit({ aksi: 'SARPRAS_PERSEDIAAN_TAMBAH', entitas: 'consumable_items', entitasId: String(item.id), ringkasan: `Barang habis pakai ${item.name} ditambahkan.`, aktor: aktor(session) });
    return `${item.name} ditambahkan ke persediaan.`;
  }, OPSI);
}

export async function mutasiPersediaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const itemId = idInt(fd, 'itemId')!;
    const direction = teks(fd, 'direction') === 'Keluar' ? 'Keluar' : 'Masuk';
    const qty = angka(fd, 'quantity') ?? 0;
    if (qty <= 0) throw new Error('Jumlah harus lebih dari 0.');
    const item = await prisma.consumableItem.findUniqueOrThrow({ where: { id: itemId } });
    assertUnit(session, item.unitId);
    if (direction === 'Keluar' && item.stock < qty) throw new Error(`Stok ${item.name} tidak cukup (sisa ${item.stock}).`);
    await prisma.$transaction([
      prisma.consumableItem.update({ where: { id: itemId }, data: { stock: { [direction === 'Masuk' ? 'increment' : 'decrement']: qty } } }),
      prisma.consumableMovement.create({ data: { itemId, direction, quantity: qty, purpose: teksAtauNull(fd, 'purpose'), actorId: uid(session) } }),
    ]);
    return `Stok ${item.name} ${direction === 'Masuk' ? 'bertambah' : 'berkurang'} ${qty}.`;
  }, OPSI);
}

// ─────────────────────────────── Lokasi ───────────────────────────────

const TIPE_LOKASI: LocationType[] = ['Kampus', 'Gedung', 'Lantai', 'Ruang', 'Area'];

export async function simpanLokasi(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.location_manage');
    const unitId = idInt(fd, 'unitId');
    assertUnit(session, unitId);
    const type = teks(fd, 'type') as LocationType;
    if (!TIPE_LOKASI.includes(type)) throw new Error('Tipe lokasi tidak valid.');
    const kondisi = teks(fd, 'condition');
    const data = {
      name: wajib(fd, 'name', 'Nama lokasi'), type, parentId: idInt(fd, 'parentId'), unitId,
      roomUsage: teksAtauNull(fd, 'roomUsage'), areaM2: angka(fd, 'areaM2'), capacity: angka(fd, 'capacity'),
      condition: (kondisi || null) as AssetCondition | null, picStaffId: teks(fd, 'picStaffId') ? idBig(fd, 'picStaffId') : null,
    };
    const idRaw = teks(fd, 'id');
    if (idRaw) {
      const lama = await prisma.assetLocation.findUniqueOrThrow({ where: { id: Number(idRaw) } });
      assertUnit(session, lama.unitId);
      await prisma.assetLocation.update({ where: { id: lama.id }, data });
      await recordAudit({ aksi: 'SARPRAS_LOKASI_UBAH', entitas: 'asset_locations', entitasId: idRaw, ringkasan: `Lokasi ${lama.code} diubah.`, aktor: aktor(session) });
      return `Lokasi ${lama.code} diperbarui.`;
    }
    const code = wajib(fd, 'code', 'Kode lokasi').toUpperCase();
    const lok = await prisma.assetLocation.create({ data: { ...data, code, qrToken: buatQrToken() } }).catch((e) => {
      if ((e as { code?: string }).code === 'P2002') throw new Error(`Kode lokasi ${code} sudah dipakai.`);
      throw e;
    });
    await recordAudit({ aksi: 'SARPRAS_LOKASI_TAMBAH', entitas: 'asset_locations', entitasId: String(lok.id), ringkasan: `Lokasi ${code} ${lok.name} ditambahkan.`, aktor: aktor(session) });
    return `Lokasi ${code} ditambahkan.`;
  }, OPSI);
}

/** Skrip pembangkit lokasi dari data Kelas & Room asrama yang sudah ada (04 §11 langkah 2). Idempoten. */
export async function bangkitkanLokasiDariData(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.location_manage');
    let dibuat = 0;
    const kelas = await prisma.kelas.findMany({ include: { unit: true } });
    for (const k of kelas) {
      if (!isSuperAdmin(session) && session.unitIds && !session.unitIds.includes(k.unitId)) continue;
      const ada = await prisma.assetLocation.findFirst({ where: { kelasId: k.id } });
      if (ada) continue;
      const code = `KLS-${k.unit.key.toUpperCase()}-${k.nama.replace(/\s+/g, '')}-${k.id}`.slice(0, 32);
      await prisma.assetLocation.create({ data: { code, name: `Kelas ${k.nama} (${k.unit.nama})`, type: 'Ruang', unitId: k.unitId, roomUsage: 'Kelas', kelasId: k.id, picStaffId: k.homeroomStaffId, qrToken: buatQrToken(), condition: 'Baik' } }).catch(() => undefined);
      dibuat++;
    }
    const pondok = await prisma.unit.findUnique({ where: { key: 'Pondok' } });
    if (isSuperAdmin(session) || !session.unitIds || (pondok && session.unitIds.includes(pondok.id))) {
      const kamar = await prisma.room.findMany({ include: { dormitory: true } });
      for (const r of kamar) {
        const ada = await prisma.assetLocation.findFirst({ where: { roomId: r.id } });
        if (ada) continue;
        const code = `KMR-${r.dormitoryId}-${r.code}`.slice(0, 32);
        await prisma.assetLocation.create({ data: { code, name: `Kamar ${r.code} — ${r.dormitory.name}`, type: 'Ruang', unitId: pondok?.id ?? null, roomUsage: 'Asrama', roomId: r.id, capacity: r.capacity, qrToken: buatQrToken(), condition: 'Baik' } }).catch(() => undefined);
        dibuat++;
      }
    }
    await recordAudit({ aksi: 'SARPRAS_LOKASI_BANGKITKAN', entitas: 'asset_locations', entitasId: '-', ringkasan: `${dibuat} lokasi dibangkitkan dari data kelas & kamar.`, aktor: aktor(session) });
    return `${dibuat} lokasi baru dibangkitkan dari data kelas & kamar asrama.`;
  }, OPSI);
}

// ─────────────────────────────── Aset ───────────────────────────────

async function bacaDataAset(fd: FormData, session: SessionPayload, ubah = false): Promise<DataAsetBaru> {
  const ownerUnitId = idInt(fd, 'ownerUnitId');
  if (!ownerUnitId) throw new Error('Unit pemilik wajib dipilih.');
  assertUnitAset(session, ownerUnitId);
  const categoryId = idInt(fd, 'categoryId');
  if (!categoryId) throw new Error('Kategori wajib dipilih.');
  const fundingSourceId = idInt(fd, 'fundingSourceId');
  if (!fundingSourceId) throw new Error('Sumber dana wajib dipilih.');
  const locationId = idInt(fd, 'locationId');
  if (!ubah && !locationId && !teks(fd, 'holderStaffId')) throw new Error('Lokasi wajib dipilih (atau isi pemegang untuk aset yang dibawa pegawai).');
  const acquisitionMethod = teks(fd, 'acquisitionMethod') || 'Pembelian';
  if (!CARA_PEROLEHAN.includes(acquisitionMethod)) throw new Error('Cara perolehan tidak valid.');
  const cost = angka(fd, 'acquisitionCost');
  if (cost == null || cost < 0) throw new Error('Harga perolehan wajib diisi (boleh 0 untuk wakaf yang tidak diketahui nilainya).');
  const kategori = await prisma.assetCategory.findUniqueOrThrow({ where: { id: categoryId } });
  const attributes: Record<string, string> = {};
  for (const k of ['nopol', 'noRangka', 'noMesin', 'tglPajak', 'luasM2', 'noSertifikat', 'noAIW', 'atasNama', 'nazhir', 'jumlahLantai', 'tahunBangun', 'imbPbg']) {
    const v = teks(fd, `attr_${k}`);
    if (v) attributes[k] = v;
  }
  return {
    name: wajib(fd, 'name', 'Nama aset'), categoryId, ownerUnitId, locationId,
    holderStaffId: teks(fd, 'holderStaffId') ? idBig(fd, 'holderStaffId') : null,
    brand: teksAtauNull(fd, 'brand'), model: teksAtauNull(fd, 'model'), specification: teksAtauNull(fd, 'specification'), serialNumber: teksAtauNull(fd, 'serialNumber'),
    quantity: Math.max(1, angka(fd, 'quantity') ?? 1), unitOfMeasure: teks(fd, 'unitOfMeasure') || 'unit',
    acquisitionDate: tanggal(fd, 'acquisitionDate', 'Tanggal perolehan'), acquisitionMethod, acquisitionCost: cost, isEstimatedValue: fd.get('isEstimatedValue') === 'on' || cost === 0,
    fundingSourceId, donorName: teksAtauNull(fd, 'donorName'), vendorId: idInt(fd, 'vendorId'),
    usefulLifeYears: angka(fd, 'usefulLifeYears') ?? kategori.usefulLifeYears, residualValue: angka(fd, 'residualValue'),
    warrantyUntil: teks(fd, 'warrantyUntil') ? new Date(teks(fd, 'warrantyUntil')) : null,
    condition: (teks(fd, 'condition') || 'Baik') as AssetCondition, isBorrowable: fd.get('isBorrowable') === 'on',
    attributes: Object.keys(attributes).length ? attributes : undefined, note: teksAtauNull(fd, 'note'), createdBy: uid(session),
  };
}

export async function registrasiAset(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const s = await requireAction('sarpras.asset_manage');
    const data = await bacaDataAset(fd, s);
    const foto = await berkasDariForm(fd, 'foto', s);
    const aset = await buatAset(data, uid(s));
    const asetId = String(aset.id);
    if (foto) await prisma.assetFile.create({ data: { assetId: aset.id, fileId: foto.id, kind: 'FOTO' } });
    await recordAudit({ aksi: 'SARPRAS_ASET_REGISTRASI', entitas: 'assets', entitasId: asetId, ringkasan: `Aset ${aset.inventoryCode} ${aset.name} diregistrasi.`, aktor: aktor(s) });
    fd.set('_kembali', `/sarpras/aset/${asetId}`);
    return `Aset ${aset.inventoryCode} berhasil diregistrasi.`;
  }, OPSI);
}

export async function ubahAset(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const id = idBig(fd);
    const lama = await prisma.asset.findUniqueOrThrow({ where: { id } });
    assertUnitAset(session, lama.ownerUnitId);
    const data = await bacaDataAset(fd, session, true);
    // Unit/lokasi/pemegang berubah HANYA lewat mutasi (jejak AssetMovement), bukan form ubah.
    const { ownerUnitId: _u, locationId: _l, holderStaffId: _h, createdBy: _c, ...sisa } = data;
    void _u; void _l; void _h; void _c;
    await prisma.asset.update({ where: { id }, data: { ...sisa, status: (teks(fd, 'status') || lama.status) as never } });
    await recordAudit({ aksi: 'SARPRAS_ASET_UBAH', entitas: 'assets', entitasId: String(id), ringkasan: `Data aset ${lama.inventoryCode} diubah.`, aktor: aktor(session) });
    return 'Data aset diperbarui.';
  }, OPSI);
}

export async function unggahBerkasAset(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const id = idBig(fd);
    const aset = await prisma.asset.findUniqueOrThrow({ where: { id } });
    assertUnitAset(session, aset.ownerUnitId);
    const kind = teks(fd, 'kind');
    if (!JENIS_BERKAS_ASET.includes(kind)) throw new Error('Jenis berkas tidak valid.');
    const berkas = await berkasDariForm(fd, 'berkas', session);
    if (!berkas) throw new Error('Pilih berkas untuk diunggah.');
    await prisma.assetFile.create({ data: { assetId: id, fileId: berkas.id, kind } });
    await recordAudit({ aksi: 'SARPRAS_ASET_BERKAS', entitas: 'assets', entitasId: String(id), ringkasan: `Berkas ${kind} diunggah untuk aset ${aset.inventoryCode}.`, aktor: aktor(session) });
    return `Berkas ${kind} diunggah.`;
  }, OPSI);
}

/** Mutasi: pindah lokasi / pindah unit / serah terima pemegang (04 §2 no.5). */
export async function mutasiAset(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const id = idBig(fd);
    const aset = await prisma.asset.findUniqueOrThrow({ where: { id } });
    assertUnitAset(session, aset.ownerUnitId);
    const toLocationId = idInt(fd, 'toLocationId');
    const toUnitId = idInt(fd, 'toUnitId');
    const toHolderRaw = teks(fd, 'toHolderId');
    const toHolderId = toHolderRaw === 'kosong' ? null : toHolderRaw ? BigInt(toHolderRaw) : aset.holderStaffId;
    if (toUnitId) assertUnitAset(session, toUnitId);
    const pindahLokasi = toLocationId != null && toLocationId !== aset.locationId;
    const pindahUnit = toUnitId != null && toUnitId !== aset.ownerUnitId;
    const gantiPemegang = toHolderId !== aset.holderStaffId;
    if (!pindahLokasi && !pindahUnit && !gantiPemegang) throw new Error('Tidak ada perubahan lokasi, unit, atau pemegang.');
    const type = pindahUnit ? 'PindahUnit' : pindahLokasi ? 'PindahLokasi' : 'SerahTerimaPemegang';
    const bast = await berkasDariForm(fd, 'bast', session);
    await prisma.$transaction([
      prisma.assetMovement.create({
        data: {
          assetId: id, type, fromLocationId: aset.locationId, toLocationId: pindahLokasi ? toLocationId : aset.locationId,
          fromUnitId: aset.ownerUnitId, toUnitId: pindahUnit ? toUnitId : aset.ownerUnitId, fromHolderId: aset.holderStaffId, toHolderId,
          date: new Date(), reason: teksAtauNull(fd, 'reason'), bastFileId: bast?.id ?? null, actorId: uid(session),
        },
      }),
      prisma.asset.update({ where: { id }, data: { locationId: pindahLokasi ? toLocationId : undefined, ownerUnitId: pindahUnit ? toUnitId! : undefined, holderStaffId: toHolderId } }),
    ]);
    await recordAudit({ aksi: 'SARPRAS_ASET_MUTASI', entitas: 'assets', entitasId: String(id), ringkasan: `Mutasi ${type} aset ${aset.inventoryCode}.`, aktor: aktor(session) });
    return 'Mutasi aset tercatat.';
  }, OPSI);
}

/**
 * Importir CSV buku inventaris lama (04 §6.1). Kolom (baris pertama = header):
 * nama, kode_kategori, unit, kode_lokasi, tanggal_perolehan (YYYY-MM-DD),
 * cara_perolehan, harga, kode_sumber_dana, jumlah, satuan, merk, kondisi, pemberi
 * Baris gagal dilaporkan per nomor baris; baris valid tetap masuk.
 */
export async function imporAsetCsv(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const f = fd.get('berkas');
    if (!(f instanceof File) || f.size === 0) throw new Error('Pilih berkas CSV.');
    if (f.size > 2 * 1024 * 1024) throw new Error('Berkas CSV maksimal 2 MB.');
    const rows = parseCsv(await f.text());
    if (rows.length < 2) throw new Error('CSV kosong atau hanya berisi header.');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (r: string[], nama: string) => (r[header.indexOf(nama)] ?? '').trim();
    const [kategori, units, lokasi, dana] = await Promise.all([
      prisma.assetCategory.findMany(), prisma.unit.findMany(), prisma.assetLocation.findMany(), prisma.fundingSource.findMany(),
    ]);
    const gagal: string[] = [];
    let berhasil = 0;
    for (const [i, r] of rows.slice(1).entries()) {
      const baris = i + 2;
      try {
        const k = kategori.find((x) => x.code === col(r, 'kode_kategori'));
        const u = units.find((x) => x.key.toLowerCase() === col(r, 'unit').toLowerCase());
        const l = lokasi.find((x) => x.code === col(r, 'kode_lokasi').toUpperCase());
        const d = dana.find((x) => x.code === col(r, 'kode_sumber_dana').toUpperCase());
        const tgl = new Date(col(r, 'tanggal_perolehan'));
        const harga = Number(col(r, 'harga').replace(/[^\d.]/g, '') || '0');
        if (!col(r, 'nama')) throw new Error('nama kosong');
        if (!k) throw new Error(`kategori "${col(r, 'kode_kategori')}" tidak dikenal`);
        if (!u) throw new Error(`unit "${col(r, 'unit')}" tidak dikenal`);
        assertUnitAset(session, u.id);
        if (!l) throw new Error(`lokasi "${col(r, 'kode_lokasi')}" tidak dikenal`);
        if (!d) throw new Error(`sumber dana "${col(r, 'kode_sumber_dana')}" tidak dikenal`);
        if (Number.isNaN(tgl.getTime())) throw new Error('tanggal_perolehan tidak valid');
        const kondisi = (['Baik', 'RusakRingan', 'RusakBerat', 'Hilang'].includes(col(r, 'kondisi')) ? col(r, 'kondisi') : 'Baik') as AssetCondition;
        await buatAset({
          name: col(r, 'nama'), categoryId: k.id, ownerUnitId: u.id, locationId: l.id, quantity: Math.max(1, Number(col(r, 'jumlah')) || 1),
          unitOfMeasure: col(r, 'satuan') || 'unit', acquisitionDate: tgl, acquisitionMethod: CARA_PEROLEHAN.includes(col(r, 'cara_perolehan')) ? col(r, 'cara_perolehan') : 'Pembelian',
          acquisitionCost: harga, isEstimatedValue: harga === 0, fundingSourceId: d.id, brand: col(r, 'merk') || null, condition: kondisi,
          donorName: col(r, 'pemberi') || null, usefulLifeYears: k.usefulLifeYears, createdBy: uid(session),
        }, uid(session));
        berhasil++;
      } catch (err) {
        gagal.push(`baris ${baris}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await recordAudit({ aksi: 'SARPRAS_ASET_IMPOR', entitas: 'assets', entitasId: '-', ringkasan: `Impor CSV: ${berhasil} berhasil, ${gagal.length} gagal.`, aktor: aktor(session) });
    if (gagal.length && !berhasil) throw new Error(`Impor gagal seluruhnya — ${gagal.slice(0, 8).join('; ')}`);
    return `Impor selesai: ${berhasil} aset masuk${gagal.length ? `, ${gagal.length} baris gagal (${gagal.slice(0, 8).join('; ')}${gagal.length > 8 ? '; …' : ''})` : ''}.`;
  }, OPSI);
}

// ─────────────────────────────── Kerusakan ───────────────────────────────

async function notifikasiDarurat(kode: string, uraian: string) {
  try {
    const petugas = await prisma.user.findMany({ where: { aktif: true, roles: { some: { role: { key: 'sarpras' } } } }, include: { person: true } });
    for (const u of petugas) {
      if (!u.person.phone) continue;
      await kirimWa({ nomor: u.person.phone, tujuan: u.person.fullName, isi: `[DARURAT] Laporan kerusakan ${kode}: ${uraian}. Mohon segera ditindaklanjuti di menu Sarpras.` });
    }
  } catch (err) {
    log('error', 'Notifikasi kerusakan darurat gagal', { error: err instanceof Error ? err.message : String(err) });
  }
}

/** Laporan kerusakan dari siapa pun yang login (04 §6.2) — form 3 kolom: apa yang rusak, tingkat, foto. */
export async function laporKerusakan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.damage_report');
    const severity = teks(fd, 'severity');
    if (!TINGKAT_KERUSAKAN.includes(severity)) throw new Error('Pilih tingkat kerusakan.');
    const description = wajib(fd, 'description', 'Uraian kerusakan');
    if (description.length < 5) throw new Error('Uraian kerusakan terlalu singkat.');
    let assetId: bigint | null = null;
    let locationId: number | null = null;
    const tokenAset = teks(fd, 'asetToken');
    const tokenRuang = teks(fd, 'ruangToken');
    if (tokenAset) {
      const a = await prisma.asset.findUnique({ where: { qrToken: tokenAset } });
      if (!a) throw new Error('Aset dari QR tidak ditemukan.');
      assetId = a.id; locationId = a.locationId;
    } else if (tokenRuang) {
      const l = await prisma.assetLocation.findUnique({ where: { qrToken: tokenRuang } });
      if (!l) throw new Error('Ruang dari QR tidak ditemukan.');
      locationId = l.id;
    } else {
      locationId = idInt(fd, 'locationId');
      if (teks(fd, 'assetId')) {
        const a = await prisma.asset.findUnique({ where: { id: idBig(fd, 'assetId') } });
        if (a) { assetId = a.id; locationId = locationId ?? a.locationId; }
      }
    }
    if (!assetId && !locationId) throw new Error('Pilih ruang atau aset yang rusak.');
    const foto = await berkasDariForm(fd, 'foto', session);
    const laporan = await denganRetryUnik(async (p) => prisma.damageReport.create({
      data: { code: await nomorBaru('KRS', p), assetId, locationId, reporterUserId: uid(session), description, severity, photoFileId: foto?.id ?? null, status: 'Baru' },
    }));
    await recordAudit({ aksi: 'SARPRAS_KERUSAKAN_LAPOR', entitas: 'damage_reports', entitasId: String(laporan.id), ringkasan: `Laporan kerusakan ${laporan.code} (${severity}).`, aktor: aktor(session) });
    if (severity === 'Darurat') await notifikasiDarurat(laporan.code, description);
    return `Laporan ${laporan.code} terkirim. Petugas sarpras akan menindaklanjuti.`;
  }, { ...OPSI, revalidate: ['/sarpras', '/lapor-kerusakan'] });
}

/**
 * Tangani tiket (04 §6.2). Pengelola (asset_manage) boleh verifikasi, tugaskan,
 * tolak, dan menutup; teknisi hanya mengubah status & catatan tiket yang
 * ditugaskan kepadanya (05 §6 baris damage_handle).
 */
export async function tanganiKerusakan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.damage_handle');
    const id = idBig(fd);
    const laporan = await prisma.damageReport.findUniqueOrThrow({ where: { id }, include: { asset: true, location: true } });
    const pengelola = await can(session, 'sarpras.asset_manage');
    const unitTiket = laporan.asset?.ownerUnitId ?? laporan.location?.unitId ?? null;
    if (pengelola) {
      if (unitTiket != null) assertUnitAset(session, unitTiket);
    } else if (laporan.assignedTo !== uid(session)) {
      throw new Error('Tiket ini tidak ditugaskan kepada Anda.');
    }
    const status = teks(fd, 'status');
    if (!STATUS_KERUSAKAN.includes(status)) throw new Error('Status tidak valid.');
    if (!pengelola && !['Dikerjakan', 'MenungguSparepart', 'Selesai'].includes(status)) {
      throw new Error('Teknisi hanya dapat mengubah status ke Dikerjakan, Menunggu Sparepart, atau Selesai.');
    }
    const assignedTo = pengelola && teks(fd, 'assignedTo') ? idBig(fd, 'assignedTo') : laporan.assignedTo;
    const cost = angka(fd, 'cost');
    const data: Prisma.DamageReportUncheckedUpdateInput = {
      status, assignedTo, resolutionNote: teksAtauNull(fd, 'resolutionNote') ?? laporan.resolutionNote,
      vendorId: pengelola ? idInt(fd, 'vendorId') ?? laporan.vendorId : laporan.vendorId,
      cost: cost ?? laporan.cost, resolvedAt: ['Selesai', 'TidakBisaDiperbaiki', 'Ditolak'].includes(status) ? new Date() : null,
    };
    const ops: Prisma.PrismaPromise<unknown>[] = [prisma.damageReport.update({ where: { id }, data })];
    if (laporan.assetId) {
      if (status === 'Diverifikasi' || status === 'Dikerjakan' || status === 'MenungguSparepart') {
        const kondisi: AssetCondition = ['Berat', 'Darurat'].includes(laporan.severity) ? 'RusakBerat' : 'RusakRingan';
        ops.push(prisma.asset.update({ where: { id: laporan.assetId }, data: { condition: kondisi, status: 'DalamPerbaikan' } }));
      } else if (status === 'Selesai') {
        ops.push(prisma.asset.update({ where: { id: laporan.assetId }, data: { condition: 'Baik', status: 'Aktif' } }));
      } else if (status === 'TidakBisaDiperbaiki') {
        ops.push(prisma.asset.update({ where: { id: laporan.assetId }, data: { condition: 'RusakBerat', status: 'TidakDipakai' } }));
      }
    }
    await prisma.$transaction(ops);
    await recordAudit({ aksi: 'SARPRAS_KERUSAKAN_TANGANI', entitas: 'damage_reports', entitasId: String(id), ringkasan: `Tiket ${laporan.code}: ${laporan.status} → ${status}.`, aktor: aktor(session) });
    return `Tiket ${laporan.code} diperbarui ke ${status}.`;
  }, OPSI);
}

// ─────────────────────────────── Peminjaman ───────────────────────────────

/** Cek bentrok waktu di server (04 §6.3) — dipanggil DI DALAM transaksi serializable. */
async function cekBentrok(tx: Prisma.TransactionClient, assetIds: bigint[], locationIds: number[], startAt: Date, endAt: Date, kecualiLoanId?: bigint) {
  const bentrok = await tx.assetLoanItem.findFirst({
    where: {
      OR: [...(assetIds.length ? [{ assetId: { in: assetIds } }] : []), ...(locationIds.length ? [{ locationId: { in: locationIds } }] : [])],
      loan: { status: { in: STATUS_PINJAM_AKTIF }, startAt: { lt: endAt }, endAt: { gt: startAt }, ...(kecualiLoanId ? { id: { not: kecualiLoanId } } : {}) },
    },
    include: { loan: true, asset: true, location: true },
  });
  if (bentrok) {
    const nama = bentrok.asset?.name ?? bentrok.location?.name ?? 'item';
    throw new Error(`Bentrok jadwal: ${nama} sudah dipesan (${bentrok.loan.code}) ${bentrok.loan.startAt.toLocaleString('id-ID')} – ${bentrok.loan.endAt.toLocaleString('id-ID')}.`);
  }
}

export async function ajukanPinjam(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.loan_request');
    const startAt = tanggal(fd, 'startAt', 'Waktu mulai');
    const endAt = tanggal(fd, 'endAt', 'Waktu selesai');
    if (endAt <= startAt) throw new Error('Waktu selesai harus setelah waktu mulai.');
    const assetIds = fd.getAll('assetIds').map(String).filter(Boolean).map((v) => BigInt(v));
    const locationIds = fd.getAll('locationIds').map(String).filter(Boolean).map(Number);
    if (!assetIds.length && !locationIds.length) throw new Error('Pilih minimal satu aset atau ruang.');
    const aset = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    if (aset.some((a) => !a.isBorrowable || a.status === 'Dihapus' || a.status === 'MenungguPenghapusan')) {
      throw new Error('Ada aset yang tidak bisa dipinjam.');
    }
    const purpose = wajib(fd, 'purpose', 'Keperluan');
    const loan = await denganRetryUnik(async (p) => {
      const code = await nomorBaru('PJM', p);
      return prisma.$transaction(async (tx) => {
        await cekBentrok(tx, assetIds, locationIds, startAt, endAt);
        return tx.assetLoan.create({
          data: {
            code, borrowerUserId: uid(session), borrowerUnitId: session.unitIds?.[0] ?? null, purpose, startAt, endAt, status: 'Diajukan',
            items: { create: [...assetIds.map((assetId) => ({ assetId })), ...locationIds.map((locationId) => ({ locationId }))] },
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    });
    await buatJenjang('loan', loan.id, ['sarpras'], null);
    await recordAudit({ aksi: 'SARPRAS_PINJAM_AJUKAN', entitas: 'asset_loans', entitasId: String(loan.id), ringkasan: `Peminjaman ${loan.code} diajukan: ${purpose}.`, aktor: aktor(session) });
    return `Peminjaman ${loan.code} diajukan, menunggu persetujuan.`;
  }, OPSI);
}

export async function putuskanPinjam(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.loan_approve');
    const id = idBig(fd);
    const setuju = teks(fd, 'keputusan') === 'setuju';
    const loan = await prisma.assetLoan.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (loan.status !== 'Diajukan') throw new Error('Peminjaman ini tidak menunggu persetujuan.');
    const tahap = await prisma.approvalStep.findFirst({ where: { entity: 'loan', entityId: id, decision: null } });
    if (tahap) {
      await prisma.approvalStep.update({ where: { id: tahap.id }, data: { decidedBy: uid(session), decision: setuju ? 'Setuju' : 'Tolak', decidedAt: new Date(), note: teksAtauNull(fd, 'note') } });
    }
    await prisma.assetLoan.update({ where: { id }, data: { status: setuju ? 'Disetujui' : 'Ditolak', approvedBy: uid(session) } });
    await recordAudit({ aksi: 'SARPRAS_PINJAM_PUTUS', entitas: 'asset_loans', entitasId: String(id), ringkasan: `Peminjaman ${loan.code} ${setuju ? 'disetujui' : 'ditolak'}.`, aktor: aktor(session) });
    return `Peminjaman ${loan.code} ${setuju ? 'disetujui' : 'ditolak'}.`;
  }, OPSI);
}

export async function serahkanPinjam(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.loan_approve');
    const id = idBig(fd);
    const loan = await prisma.assetLoan.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (loan.status !== 'Disetujui') throw new Error('Hanya peminjaman yang disetujui yang bisa diserahkan.');
    const assetIds = loan.items.map((i) => i.assetId).filter((x): x is bigint => x != null);
    await prisma.$transaction([
      prisma.assetLoan.update({ where: { id }, data: { status: 'Dipinjam' } }),
      prisma.asset.updateMany({ where: { id: { in: assetIds } }, data: { status: 'Dipinjam' } }),
    ]);
    await recordAudit({ aksi: 'SARPRAS_PINJAM_SERAH', entitas: 'asset_loans', entitasId: String(id), ringkasan: `Peminjaman ${loan.code} diserahkan ke peminjam.`, aktor: aktor(session) });
    return `Barang ${loan.code} diserahkan.`;
  }, OPSI);
}

/** Pengembalian dicatat dengan kondisi; bila rusak, otomatis membuat DamageReport (04 §6.3). */
export async function kembalikanPinjam(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.loan_approve');
    const id = idBig(fd);
    const loan = await prisma.assetLoan.findUniqueOrThrow({ where: { id }, include: { items: { include: { asset: true } } } });
    if (!['Dipinjam', 'Terlambat'].includes(loan.status)) throw new Error('Peminjaman ini belum/tidak sedang dipinjam.');
    const kondisi = (teks(fd, 'returnCondition') || 'Baik') as AssetCondition;
    const catatan = teksAtauNull(fd, 'returnNote');
    const assetIds = loan.items.map((i) => i.assetId).filter((x): x is bigint => x != null);
    await prisma.$transaction([
      prisma.assetLoan.update({ where: { id }, data: { status: 'Dikembalikan', returnedAt: new Date(), returnCondition: kondisi, returnNote: catatan } }),
      prisma.asset.updateMany({ where: { id: { in: assetIds } }, data: { status: 'Aktif', ...(kondisi !== 'Baik' ? { condition: kondisi } : {}) } }),
    ]);
    if (kondisi !== 'Baik') {
      for (const item of loan.items.filter((i) => i.asset)) {
        await denganRetryUnik(async (p) => prisma.damageReport.create({
          data: {
            code: await nomorBaru('KRS', p), assetId: item.assetId, locationId: item.asset!.locationId, reporterUserId: uid(session),
            description: `Dikembalikan dalam kondisi ${kondisi} dari peminjaman ${loan.code}. ${catatan ?? ''}`.trim(),
            severity: kondisi === 'RusakBerat' || kondisi === 'Hilang' ? 'Berat' : 'Ringan', status: 'Baru',
          },
        }));
      }
    }
    await recordAudit({ aksi: 'SARPRAS_PINJAM_KEMBALI', entitas: 'asset_loans', entitasId: String(id), ringkasan: `Peminjaman ${loan.code} dikembalikan (${kondisi}).`, aktor: aktor(session) });
    return `Peminjaman ${loan.code} dikembalikan${kondisi !== 'Baik' ? ' — laporan kerusakan otomatis dibuat' : ''}.`;
  }, OPSI);
}

export async function batalkanPinjam(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.loan_request');
    const id = idBig(fd);
    const loan = await prisma.assetLoan.findUniqueOrThrow({ where: { id } });
    if (loan.borrowerUserId !== uid(session) && !(await can(session, 'sarpras.loan_approve'))) throw new Error('Hanya peminjam yang bisa membatalkan.');
    if (!['Diajukan', 'Disetujui'].includes(loan.status)) throw new Error('Peminjaman yang sudah berjalan tidak bisa dibatalkan.');
    await prisma.assetLoan.update({ where: { id }, data: { status: 'Batal' } });
    await recordAudit({ aksi: 'SARPRAS_PINJAM_BATAL', entitas: 'asset_loans', entitasId: String(id), ringkasan: `Peminjaman ${loan.code} dibatalkan.`, aktor: aktor(session) });
    return `Peminjaman ${loan.code} dibatalkan.`;
  }, OPSI);
}

// ─────────────────────────────── Pengadaan ───────────────────────────────

export async function ajukanPengadaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.procure_request');
    const unitId = idInt(fd, 'unitId');
    if (!unitId) throw new Error('Unit wajib dipilih.');
    assertUnit(session, unitId);
    const fundingSourceId = idInt(fd, 'fundingSourceId');
    if (!fundingSourceId) throw new Error('Sumber dana wajib dipilih.');
    const nama = fd.getAll('itemName').map(String);
    const kat = fd.getAll('itemCategoryId').map(Number);
    const qty = fd.getAll('itemQty').map(Number);
    const harga = fd.getAll('itemPrice').map((v) => Number(String(v).replace(/\./g, '')));
    const items = nama.map((n, i) => ({ name: n.trim(), categoryId: kat[i], quantity: qty[i], estimatedPrice: harga[i] })).filter((x) => x.name);
    if (!items.length) throw new Error('Isi minimal satu barang.');
    if (items.some((x) => !x.categoryId || !(x.quantity > 0) || !(x.estimatedPrice >= 0))) throw new Error('Kategori, jumlah, dan perkiraan harga tiap barang wajib valid.');
    const total = items.reduce((s, x) => s + x.quantity * x.estimatedPrice, 0);
    const [unit, dana] = await Promise.all([prisma.unit.findUniqueOrThrow({ where: { id: unitId } }), prisma.fundingSource.findUniqueOrThrow({ where: { id: fundingSourceId } })]);
    const pgd = await denganRetryUnik(async (p) => prisma.procurement.create({
      data: {
        code: await nomorBaru('PGD', p), unitId, title: wajib(fd, 'title', 'Judul pengadaan'), reason: wajib(fd, 'reason', 'Alasan'),
        status: 'Diajukan', estimatedTotal: total, fundingSourceId, requestedBy: uid(session), items: { create: items },
      },
    }));
    const jenjang = await jenjangPengadaan(unit.key, dana.code, total);
    await buatJenjang('procurement', pgd.id, jenjang, unitId);
    await recordAudit({ aksi: 'SARPRAS_PENGADAAN_AJUKAN', entitas: 'procurements', entitasId: String(pgd.id), ringkasan: `Pengadaan ${pgd.code} diajukan (total ${total}); jenjang ${jenjang.join(' → ')}.`, aktor: aktor(session) });
    return `Pengadaan ${pgd.code} diajukan. Jenjang persetujuan: ${jenjang.join(' → ')}.`;
  }, OPSI);
}

export async function putuskanPengadaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.procure_approve');
    const id = idBig(fd);
    const pgd = await prisma.procurement.findUniqueOrThrow({ where: { id } });
    if (pgd.status !== 'Diajukan') throw new Error('Pengadaan ini tidak menunggu persetujuan.');
    assertUnit(session, pgd.unitId);
    const setuju = teks(fd, 'keputusan') === 'setuju';
    const hasil = await putuskanTahap(session, 'procurement', id, setuju, teksAtauNull(fd, 'note'));
    if (hasil !== 'Lanjut') await prisma.procurement.update({ where: { id }, data: { status: hasil === 'Ditolak' ? 'Ditolak' : 'Disetujui' } });
    await recordAudit({ aksi: 'SARPRAS_PENGADAAN_PUTUS', entitas: 'procurements', entitasId: String(id), ringkasan: `Pengadaan ${pgd.code}: ${setuju ? 'setuju' : 'tolak'} (${hasil}).`, aktor: aktor(session) });
    return hasil === 'Lanjut' ? `Disetujui — ${pgd.code} lanjut ke tahap berikutnya.` : `Pengadaan ${pgd.code} ${hasil === 'Ditolak' ? 'ditolak' : 'disetujui penuh'}.`;
  }, OPSI);
}

export async function tandaiDibeli(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.procure_request');
    const id = idBig(fd);
    const pgd = await prisma.procurement.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (pgd.status !== 'Disetujui') throw new Error('Hanya pengadaan yang sudah disetujui yang bisa ditandai dibeli.');
    assertUnit(session, pgd.unitId);
    for (const item of pgd.items) {
      const v = angka(fd, `harga_${item.id}`);
      await prisma.procurementItem.update({ where: { id: item.id }, data: { actualPrice: v ?? item.estimatedPrice } });
    }
    await prisma.procurement.update({ where: { id }, data: { status: 'Dibeli' } });
    await recordAudit({ aksi: 'SARPRAS_PENGADAAN_BELI', entitas: 'procurements', entitasId: String(id), ringkasan: `Pengadaan ${pgd.code} ditandai dibeli.`, aktor: aktor(session) });
    return `Pengadaan ${pgd.code} ditandai dibeli.`;
  }, OPSI);
}

/**
 * Penerimaan (BAST): tiap item jadi aset. Barang di bawah ambang kapitalisasi
 * dicatat kolektif (quantity > 1, satu kode); di atas ambang per unit (04 §3.2).
 * Kategori habis pakai tidak dijadikan aset.
 */
export async function terimaPengadaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.asset_manage');
    const id = idBig(fd);
    const pgd = await prisma.procurement.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (pgd.status !== 'Dibeli') throw new Error('Pengadaan belum ditandai dibeli.');
    assertUnitAset(session, pgd.unitId);
    const locationId = idInt(fd, 'locationId');
    if (!locationId) throw new Error('Pilih lokasi penempatan barang.');
    const ambang = await bacaAngkaSetting(SETTING_AMBANG_KAPITALISASI, AMBANG_KAPITALISASI_BAWAAN);
    let jumlahAset = 0;
    for (const item of pgd.items) {
      const kategori = await prisma.assetCategory.findUniqueOrThrow({ where: { id: item.categoryId } });
      if (kategori.isConsumable) continue;
      const harga = Number(item.actualPrice ?? item.estimatedPrice);
      const perUnit = harga >= ambang;
      const dasar: DataAsetBaru = {
        name: item.name, categoryId: item.categoryId, ownerUnitId: pgd.unitId, locationId, acquisitionDate: new Date(), acquisitionMethod: 'Pembelian',
        acquisitionCost: perUnit ? harga : harga * item.quantity, fundingSourceId: pgd.fundingSourceId, procurementId: pgd.id,
        usefulLifeYears: kategori.usefulLifeYears, createdBy: uid(session), quantity: perUnit ? 1 : item.quantity, unitOfMeasure: perUnit ? 'unit' : 'set',
      };
      const ulang = perUnit ? item.quantity : 1;
      for (let i = 0; i < ulang; i++) { await buatAset(dasar, uid(session)); jumlahAset++; }
    }
    const bast = await berkasDariForm(fd, 'bast', session);
    await prisma.procurement.update({ where: { id }, data: { status: 'Diterima', receivedAt: new Date() } });
    await recordAudit({ aksi: 'SARPRAS_PENGADAAN_TERIMA', entitas: 'procurements', entitasId: String(id), ringkasan: `Pengadaan ${pgd.code} diterima, ${jumlahAset} aset diregistrasi${bast ? ', BAST diunggah' : ''}.`, aktor: aktor(session) });
    return `Pengadaan ${pgd.code} diterima — ${jumlahAset} aset otomatis diregistrasi.`;
  }, OPSI);
}

// ─────────────────────────────── Pemeliharaan ───────────────────────────────

export async function buatTugasPemeliharaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.maintenance_manage');
    const assetId = teks(fd, 'assetId') ? idBig(fd, 'assetId') : null;
    if (assetId) {
      const a = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      assertUnitAset(session, a.ownerUnitId);
    }
    const t = await prisma.maintenanceTask.create({
      data: {
        assetId, locationId: idInt(fd, 'locationId'), title: wajib(fd, 'title', 'Judul tugas'), intervalDays: angka(fd, 'intervalDays'),
        dueDate: tanggal(fd, 'dueDate', 'Jatuh tempo'), remindDaysBefore: angka(fd, 'remindDaysBefore') ?? 7,
        assignedTo: teks(fd, 'assignedTo') ? idBig(fd, 'assignedTo') : null, status: 'Terjadwal',
      },
    });
    await recordAudit({ aksi: 'SARPRAS_PEMELIHARAAN_BUAT', entitas: 'maintenance_tasks', entitasId: String(t.id), ringkasan: `Tugas pemeliharaan "${t.title}" dijadwalkan.`, aktor: aktor(session) });
    return `Tugas "${t.title}" dijadwalkan.`;
  }, OPSI);
}

/** Tandai selesai; tugas berulang otomatis dijadwalkan ulang (dueDate + intervalDays). */
export async function selesaikanPemeliharaan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.maintenance_manage');
    const id = idBig(fd);
    const t = await prisma.maintenanceTask.findUniqueOrThrow({ where: { id }, include: { asset: true } });
    const pengelola = await can(session, 'sarpras.asset_manage');
    if (!pengelola && t.assignedTo !== uid(session)) throw new Error('Tugas ini tidak ditugaskan kepada Anda.');
    if (t.asset) assertUnitAset(session, t.asset.ownerUnitId);
    const sekarang = new Date();
    const berikut = t.intervalDays ? new Date(Math.max(t.dueDate.getTime(), sekarang.getTime()) + t.intervalDays * 86_400_000) : null;
    await prisma.maintenanceTask.update({
      where: { id },
      data: berikut ? { lastDoneAt: sekarang, dueDate: berikut, status: 'Terjadwal', cost: angka(fd, 'cost'), remindedAt: null } : { lastDoneAt: sekarang, status: 'Selesai', cost: angka(fd, 'cost') },
    });
    await recordAudit({ aksi: 'SARPRAS_PEMELIHARAAN_SELESAI', entitas: 'maintenance_tasks', entitasId: String(id), ringkasan: `Tugas "${t.title}" selesai${berikut ? `, dijadwalkan ulang ${berikut.toLocaleDateString('id-ID')}` : ''}.`, aktor: aktor(session) });
    return berikut ? `"${t.title}" selesai, dijadwalkan ulang ${berikut.toLocaleDateString('id-ID')}.` : `"${t.title}" selesai.`;
  }, OPSI);
}

// ─────────────────────────────── Stock opname ───────────────────────────────

export async function bukaOpname(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.opname_run');
    const unitId = idInt(fd, 'unitId');
    const locationId = idInt(fd, 'locationId');
    if (!unitId && !locationId) throw new Error('Pilih unit atau ruang yang diopname.');
    assertUnit(session, unitId);
    const aset = await prisma.asset.findMany({
      where: { status: { notIn: ['Dihapus'] }, deletedAt: null, ...(unitId ? { ownerUnitId: unitId } : {}), ...(locationId ? { locationId } : {}) },
      select: { id: true, locationId: true },
    });
    if (!aset.length) throw new Error('Tidak ada aset di cakupan ini.');
    const op = await denganRetryUnik(async (p) => prisma.stockOpname.create({
      data: { code: await nomorBaru('OPN', p), unitId, locationId, status: 'Berjalan', createdBy: uid(session), lines: { create: aset.map((a) => ({ assetId: a.id, expectedLocationId: a.locationId })) } },
    }));
    await recordAudit({ aksi: 'SARPRAS_OPNAME_BUKA', entitas: 'stock_opnames', entitasId: String(op.id), ringkasan: `Opname ${op.code} dibuka (${aset.length} aset).`, aktor: aktor(session) });
    fd.set('_kembali', `/sarpras/opname/${op.id}`);
    return `Opname ${op.code} dibuka dengan ${aset.length} aset.`;
  }, OPSI);
}

/** Simpan per baris (tahan sinyal lemah, 04 §6.5). */
export async function catatBarisOpname(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.opname_run');
    const id = idBig(fd);
    const line = await prisma.stockOpnameLine.findUniqueOrThrow({ where: { id }, include: { opname: true } });
    if (line.opname.status !== 'Berjalan') throw new Error('Opname sudah ditutup.');
    const found = teks(fd, 'found') === 'ya';
    await prisma.stockOpnameLine.update({
      where: { id },
      data: {
        found, conditionFound: found ? ((teks(fd, 'conditionFound') || 'Baik') as AssetCondition) : null,
        locationFoundId: found ? idInt(fd, 'locationFoundId') ?? line.expectedLocationId : null,
        note: teksAtauNull(fd, 'note'), checkedAt: new Date(), checkedBy: uid(session),
      },
    });
    return 'Baris opname tersimpan.';
  }, OPSI);
}

/**
 * Tutup opname & tindak lanjut (04 §6.5): beda lokasi → mutasi otomatis,
 * beda kondisi → kondisi diperbarui, tidak ditemukan → kondisi Hilang
 * (kandidat usulan penghapusan).
 */
export async function tutupOpname(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.opname_close');
    const id = idBig(fd);
    const op = await prisma.stockOpname.findUniqueOrThrow({ where: { id }, include: { lines: { include: { asset: true } } } });
    if (op.status !== 'Berjalan') throw new Error('Opname sudah ditutup.');
    assertUnit(session, op.unitId);
    let mutasi = 0, hilang = 0, kondisi = 0;
    for (const l of op.lines) {
      if (l.found === false) {
        await prisma.asset.update({ where: { id: l.assetId }, data: { condition: 'Hilang' } });
        hilang++;
        continue;
      }
      if (l.found !== true) continue;
      if (l.locationFoundId && l.locationFoundId !== l.asset.locationId) {
        await prisma.$transaction([
          prisma.assetMovement.create({ data: { assetId: l.assetId, type: 'PindahLokasi', fromLocationId: l.asset.locationId, toLocationId: l.locationFoundId, fromUnitId: l.asset.ownerUnitId, toUnitId: l.asset.ownerUnitId, date: new Date(), reason: `Hasil opname ${op.code}`, actorId: uid(session) } }),
          prisma.asset.update({ where: { id: l.assetId }, data: { locationId: l.locationFoundId } }),
        ]);
        mutasi++;
      }
      if (l.conditionFound && l.conditionFound !== l.asset.condition) {
        await prisma.asset.update({ where: { id: l.assetId }, data: { condition: l.conditionFound } });
        kondisi++;
      }
    }
    await prisma.stockOpname.update({ where: { id }, data: { status: 'Selesai', closedAt: new Date() } });
    const ringkas = `${mutasi} mutasi lokasi, ${kondisi} perubahan kondisi, ${hilang} tidak ditemukan`;
    await recordAudit({ aksi: 'SARPRAS_OPNAME_TUTUP', entitas: 'stock_opnames', entitasId: String(id), ringkasan: `Opname ${op.code} ditutup: ${ringkas}.`, aktor: aktor(session) });
    return `Opname ${op.code} ditutup: ${ringkas}.`;
  }, OPSI);
}

// ─────────────────────────────── Penghapusan ───────────────────────────────

export async function usulkanPenghapusan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.dispose_request');
    const reason = teks(fd, 'reason');
    const method = teks(fd, 'method');
    if (!ALASAN_HAPUS.includes(reason)) throw new Error('Alasan penghapusan tidak valid.');
    if (!METODE_HAPUS.includes(method)) throw new Error('Metode penghapusan tidak valid.');
    const ids = fd.getAll('assetIds').map(String).filter(Boolean).map((v) => BigInt(v));
    if (!ids.length) throw new Error('Pilih minimal satu aset.');
    const aset = await prisma.asset.findMany({ where: { id: { in: ids } }, include: { category: true, fundingSource: true, ownerUnit: true } });
    for (const a of aset) {
      assertUnitAset(session, a.ownerUnitId);
      if (a.status === 'Dihapus' || a.status === 'MenungguPenghapusan') throw new Error(`${a.inventoryCode} sudah dihapus/dalam usulan.`);
    }
    const unitKeys = new Set(aset.map((a) => a.ownerUnit.key));
    if (unitKeys.size > 1) throw new Error('Satu usulan penghapusan hanya untuk aset dari satu unit pemilik.');
    const terbatas = aset.some((a) => a.fundingSource.restrictedDisposal);
    const wakaf = aset.some((a) => a.fundingSource.code === 'WAKAF' || a.acquisitionMethod === 'Wakaf');
    const note = teksAtauNull(fd, 'note');
    const ba = await berkasDariForm(fd, 'ba', session);
    // 04 §5: aset wakaf / BOS wajib catatan dan lampiran BA.
    if (terbatas && (!note || !ba)) throw new Error('Aset wakaf/BOS wajib disertai catatan dan lampiran berita acara (BA).');
    const hps = await denganRetryUnik(async (p) => prisma.assetDisposal.create({
      data: {
        code: await nomorBaru('HPS', p), reason, method, status: 'Diajukan', note, needsNazhir: wakaf, baFileId: ba?.id ?? null, requestedBy: uid(session),
        items: { create: aset.map((a) => ({ assetId: a.id, bookValue: hitungSusut({ harga: Number(a.acquisitionCost), residu: a.residualValue ? Number(a.residualValue) : null, umurTahun: a.usefulLifeYears, tanggalPerolehan: a.acquisitionDate, kibGroup: a.category.kibGroup }).nilaiBuku })) },
      },
    }));
    await prisma.asset.updateMany({ where: { id: { in: ids } }, data: { status: 'MenungguPenghapusan' } });
    const unit = aset[0].ownerUnit;
    await buatJenjang('disposal', hps.id, jenjangPenghapusan(unit.key), unit.id);
    await recordAudit({ aksi: 'SARPRAS_HAPUS_USUL', entitas: 'asset_disposals', entitasId: String(hps.id), ringkasan: `Usulan penghapusan ${hps.code} (${aset.length} aset, ${reason})${wakaf ? ' — perlu keputusan nazhir' : ''}.`, aktor: aktor(session) });
    return `Usulan penghapusan ${hps.code} diajukan${wakaf ? ' (aset wakaf: perlu keputusan nazhir, sistem hanya mencatat)' : ''}.`;
  }, OPSI);
}

export async function putuskanPenghapusan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await readSession();
    if (!session) throw new Error('Sesi tidak ditemukan.');
    const id = idBig(fd);
    const hps = await prisma.assetDisposal.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (!['Diajukan', 'Diverifikasi'].includes(hps.status)) throw new Error('Usulan ini tidak menunggu keputusan.');
    const tahap = await prisma.approvalStep.findFirst({ where: { entity: 'disposal', entityId: id, decision: null }, orderBy: { order: 'asc' } });
    // Tahap "sarpras" = verifikasi (dispose_request); tahap kepala unit/ketua = dispose_approve.
    await requireAction(tahap?.roleKey === 'sarpras' ? 'sarpras.dispose_request' : 'sarpras.dispose_approve');
    const setuju = teks(fd, 'keputusan') === 'setuju';
    const hasil = await putuskanTahap(session, 'disposal', id, setuju, teksAtauNull(fd, 'note'));
    const statusBaru = hasil === 'Ditolak' ? 'Ditolak' : hasil === 'Selesai' ? 'Disetujui' : 'Diverifikasi';
    await prisma.assetDisposal.update({ where: { id }, data: { status: statusBaru } });
    if (hasil === 'Ditolak') {
      await prisma.asset.updateMany({ where: { id: { in: hps.items.map((i) => i.assetId) } }, data: { status: 'TidakDipakai' } });
    }
    await recordAudit({ aksi: 'SARPRAS_HAPUS_PUTUS', entitas: 'asset_disposals', entitasId: String(id), ringkasan: `Penghapusan ${hps.code}: ${statusBaru}.`, aktor: aktor(session) });
    return `Penghapusan ${hps.code}: ${statusBaru}.`;
  }, OPSI);
}

export async function laksanakanPenghapusan(fd: FormData) {
  return jalankanAksi(fd, async () => {
    const session = await requireAction('sarpras.dispose_request');
    const id = idBig(fd);
    const hps = await prisma.assetDisposal.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (hps.status !== 'Disetujui') throw new Error('Penghapusan belum disetujui penuh.');
    const ba = await berkasDariForm(fd, 'ba', session);
    for (const item of hps.items) {
      const jual = angka(fd, `jual_${item.id}`);
      if (jual != null) await prisma.assetDisposalItem.update({ where: { id: item.id }, data: { saleValue: jual } });
    }
    await prisma.$transaction([
      prisma.assetDisposal.update({ where: { id }, data: { status: 'Dilaksanakan', baFileId: ba?.id ?? hps.baFileId } }),
      prisma.asset.updateMany({ where: { id: { in: hps.items.map((i) => i.assetId) } }, data: { status: 'Dihapus' } }),
    ]);
    await recordAudit({ aksi: 'SARPRAS_HAPUS_LAKSANA', entitas: 'asset_disposals', entitasId: String(id), ringkasan: `Penghapusan ${hps.code} dilaksanakan, ${hps.items.length} aset berstatus Dihapus.`, aktor: aktor(session) });
    return `Penghapusan ${hps.code} dilaksanakan.`;
  }, OPSI);
}
