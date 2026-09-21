import { PrismaClient } from '@prisma/client';

/**
 * Data contoh CBT: bank soal, paket, sesi, peserta, dan sebagian jawaban.
 * Idempoten dan deterministik — semua nilai diturunkan dari indeks, tidak
 * acak, supaya statistik butir dan rekap tidak berubah tiap seed diulang.
 *
 * Dipisah dari `seed.ts` karena file itu sudah panjang; konvensi repo
 * membatasi 400 baris per file.
 */

const TIPE = ['PG', 'PG', 'PG', 'PGK', 'BS', 'IsianSingkat', 'Esai'] as const;
const LEVEL = ['C1', 'C2', 'C3', 'C4'];
const OPSI_TEKS = ['Pilihan pertama', 'Pilihan kedua', 'Pilihan ketiga', 'Pilihan keempat'];
const LABEL = ['A', 'B', 'C', 'D'];
const SOAL_PER_MAPEL = 12;

const nomor = (kode: string, i: number) => `${kode}-${String(i + 1).padStart(3, '0')}`;

/** Stimulus AKM: satu bacaan dipakai beberapa soal literasi. */
const STIMULUS_AKM = `Koperasi pondok mencatat penjualan selama satu pekan: Senin 42 unit, Selasa 55 unit,
Rabu 38 unit, Kamis 61 unit, Jumat 47 unit. Harga satu unit Rp 12.500. Pengurus ingin
mengetahui hari dengan penjualan tertinggi dan rata-rata penjualan harian.`;

export async function seedCbt(prisma: PrismaClient) {
  const mapelDiajarkan = await prisma.jadwalPelajaran.findMany({
    where: { guru: { not: null } },
    distinct: ['mapel'],
    select: { mapel: true, guru: true },
  });
  const mapelSemua = await prisma.mataPelajaran.findMany({
    where: { nama: { in: mapelDiajarkan.map((j) => j.mapel) } },
    orderBy: { kode: 'asc' },
    take: 4,
  });
  if (mapelSemua.length === 0) return;
  const guruPer = new Map(mapelDiajarkan.map((j) => [j.mapel, j.guru ?? 'Tim Kurikulum']));

  for (const [iMapel, mapel] of mapelSemua.entries()) {
    const penulis = guruPer.get(mapel.nama) ?? 'Tim Kurikulum';
    const soalIds: bigint[] = [];

    for (let i = 0; i < SOAL_PER_MAPEL; i += 1) {
      const tipe = TIPE[i % TIPE.length];
      const akm = i < 3; // tiga soal pertama tiap mapel bergaya AKM
      const kunci = tipe === 'PGK' ? 'A,C' : tipe === 'BS' ? 'A' : tipe === 'IsianSingkat' ? `61|enam puluh satu` : LABEL[i % 4];
      const pertanyaan = akm
        ? `Berdasarkan data koperasi di atas, tentukan ${i === 0 ? 'hari penjualan tertinggi' : i === 1 ? 'rata-rata penjualan harian' : 'total pendapatan sepekan'}.`
        : `Soal ${mapel.kode} nomor ${i + 1}: jelaskan konsep dasar ${mapel.nama.toLowerCase()} pada tingkat ${LEVEL[i % LEVEL.length]}.`;

      // Skema tak punya unique alami untuk soal, jadi idempotensi dijaga
      // dengan mencocokkan mapel + teks pertanyaan.
      const ada = (await prisma.soal.findFirst({ where: { mapelId: mapel.id, pertanyaan } }))
        ?? (await prisma.soal.create({
          data: {
            mapelId: mapel.id,
            penulis,
            tipe,
            level: LEVEL[i % LEVEL.length],
            topik: akm ? 'Numerasi — data dan ketidakpastian' : `Bab ${(i % 4) + 1}`,
            stimulus: akm ? STIMULUS_AKM : null,
            pertanyaan,
            kunci: tipe === 'Esai' ? null : kunci,
            pembahasan: tipe === 'Esai' ? 'Dinilai guru dengan rubrik.' : 'Lihat kunci pada bahan ajar.',
            bobot: tipe === 'Esai' ? 10 : 5,
          },
        }));
      soalIds.push(ada.id);

      if (tipe === 'PG' || tipe === 'PGK') {
        for (const [iOpsi, label] of LABEL.entries()) {
          await prisma.opsiSoal.upsert({
            where: { soalId_label: { soalId: ada.id, label } },
            create: {
              soalId: ada.id,
              label,
              teks: akm ? `${OPSI_TEKS[iOpsi]} (${38 + iOpsi * 8} unit)` : OPSI_TEKS[iOpsi],
              benar: tipe === 'PGK' ? label === 'A' || label === 'C' : label === kunci,
              urutan: iOpsi + 1,
            },
            update: {},
          });
        }
      }
      if (tipe === 'BS') {
        for (const [iOpsi, label] of ['A', 'B'].entries()) {
          await prisma.opsiSoal.upsert({
            where: { soalId_label: { soalId: ada.id, label } },
            create: { soalId: ada.id, label, teks: iOpsi === 0 ? 'Benar' : 'Salah', benar: label === kunci, urutan: iOpsi + 1 },
            update: {},
          });
        }
      }
    }

    if (soalIds.length === 0) continue;
    await rakitPaket(prisma, mapel, soalIds, penulis, iMapel);
  }
}

async function rakitPaket(
  prisma: PrismaClient,
  mapel: { id: number; kode: string; nama: string },
  soalIds: bigint[],
  penulis: string,
  iMapel: number,
) {
  const jenis = iMapel === 0 ? 'AKM' : 'UAS';
  const paket = await prisma.paketSoal.upsert({
    where: { kode: `PKT-${mapel.kode}-2026G` },
    create: {
      kode: `PKT-${mapel.kode}-2026G`,
      nama: `${jenis} ${mapel.nama} — Gasal 2026/2027`,
      mapelId: mapel.id,
      jenis,
      durasi: 90,
      acakSoal: true,
      acakOpsi: iMapel % 2 === 0,
      tampilHasil: jenis !== 'AKM',
      kkm: 70,
      status: 'Aktif',
      penulis,
    },
    update: { status: 'Aktif' },
  });

  for (const [i, soalId] of soalIds.entries()) {
    await prisma.butirPaket.upsert({
      where: { paketId_soalId: { paketId: paket.id, soalId } },
      create: { paketId: paket.id, soalId, urutan: i + 1, bobot: i % 7 === 6 ? 10 : 5 },
      update: { urutan: i + 1 },
    });
  }

  // Satu sesi per paket pada kelas pertama yang cocok unitnya.
  const kelas = await prisma.kelas.findFirst({ orderBy: { nama: 'asc' }, skip: iMapel });
  if (!kelas) return;

  const status = iMapel === 0 ? 'Berjalan' : iMapel === 1 ? 'Selesai' : 'Terjadwal';

  // Sesi berjalan dibuka lebar di sekitar waktu seed dijalankan: kalau
  // jendelanya dipatok tanggal tetap, sesi "Berjalan" pada data contoh
  // justru selalu di luar waktu dan tak bisa dicoba siapa pun.
  const mulai = status === 'Berjalan' ? new Date(Date.now() - 30 * 60000) : new Date('2026-12-07T00:30:00.000Z');
  if (status !== 'Berjalan') mulai.setUTCDate(mulai.getUTCDate() + iMapel);
  const selesai = new Date(mulai.getTime() + (status === 'Berjalan' ? 8 * 3600000 : 90 * 60000));

  const sesi = await prisma.sesiCbt.upsert({
    where: { kode: `CBT-${mapel.kode}-01` },
    create: {
      kode: `CBT-${mapel.kode}-01`,
      paketId: paket.id,
      kelasId: kelas.id,
      mulai,
      selesai,
      token: ['K7M2XQ', 'R4TB9N', 'W8LZ3P', 'H5DC6V'][iMapel % 4],
      // Kunci zona ke jaringan lab pondok; sesi pertama dibiarkan terbuka
      // agar bisa diuji dari luar tanpa mengubah data.
      ipPrefix: iMapel === 0 ? null : '192.168.',
      wajibExamBrowser: iMapel % 2 === 1,
      batasPelanggaran: 3,
      status,
      pengawas: kelas.waliKelas,
    },
    update: status === 'Berjalan' ? { status, mulai, selesai } : { status },
  });

  // Data contoh hanya punya 1–2 santri per kelas — terlalu tipis untuk
  // analisis butir (butuh ≥4 responden). Untuk seed, peserta diambil satu
  // unit; di pemakaian nyata `terbitkanPeserta` tetap memakai anggota kelas.
  const santri = await prisma.santri.findMany({
    where: { unitId: kelas.unitId },
    orderBy: { nis: 'asc' },
    take: 10,
  });
  for (const [i, s] of santri.entries()) {
    await prisma.pesertaCbt.upsert({
      where: { sesiId_santriId: { sesiId: sesi.id, santriId: s.id } },
      create: { sesiId: sesi.id, santriId: s.id, noPeserta: nomor(sesi.kode, i) },
      // Nomor peserta ikut disegarkan: seed lama bisa menyisakan nomor
      // ganda kalau daftar santrinya berubah antar-jalan.
      update: { noPeserta: nomor(sesi.kode, i) },
    });
  }

  // Sesi yang sudah Selesai diberi jawaban contoh supaya analisis butir dan
  // pengawasan punya angka nyata untuk ditampilkan.
  if (sesi.status !== 'Selesai') return;
  const peserta = await prisma.pesertaCbt.findMany({ where: { sesiId: sesi.id }, orderBy: { noPeserta: 'asc' } });
  const butir = await prisma.butirPaket.findMany({ where: { paketId: paket.id }, include: { soal: true }, orderBy: { urutan: 'asc' } });

  for (const [iP, p] of peserta.entries()) {
    let skor = 0;
    let benarN = 0;
    let salahN = 0;
    for (const [iB, b] of butir.entries()) {
      if (b.soal.tipe === 'Esai') continue;
      // Peserta berindeks kecil menjawab lebih banyak butir dengan benar:
      // pola bertingkat ini membuat daya beda (D) butir terhitung wajar.
      const benar = (iP + iB) % 4 !== 0;
      const nilai = benar ? Number(b.bobot) : 0;
      skor += nilai;
      if (benar) benarN += 1; else salahN += 1;
      await prisma.jawabanPeserta.upsert({
        where: { pesertaId_soalId: { pesertaId: p.id, soalId: b.soalId } },
        create: { pesertaId: p.id, soalId: b.soalId, jawaban: benar ? (b.soal.kunci ?? 'A') : 'B', benar, skor: nilai },
        update: {},
      });
    }
    const totalBobot = butir.reduce((a, b) => a + Number(b.bobot), 0);
    await prisma.pesertaCbt.update({
      where: { id: p.id },
      data: {
        status: 'Selesai',
        mulaiAt: mulai,
        selesaiAt: selesai,
        skor: totalBobot > 0 ? Math.round((skor / totalBobot) * 1000) / 10 : 0,
        benar: benarN,
        salah: salahN,
        kosong: butir.length - benarN - salahN,
      },
    });
  }
}
