/**
 * Seed master keuangan pondok (fase 1, 2026-10-11): komponen iuran bulanan
 * santri + master unit utilitas PLN/PDAM. Idempoten via upsert.
 */
import { PrismaClient } from "@prisma/client";

const TARIF_ROWS = [
  { kode: "SYARIAH", label: "Syariah bulanan", nominal: 50000, rekening: "BRI" },
  { kode: "INFAQ_PEMBANGUNAN", label: "Infaq pembangunan", nominal: 15000, rekening: null },
  { kode: "WIFI", label: "Wifi", nominal: 20000, rekening: null },
  { kode: "POSKES", label: "Poskestren", nominal: 10000, rekening: null },
  { kode: "PLN_PDAM", label: "PLN / PDAM", nominal: 25000, rekening: null },
];

type UnitRow = {
  sektor: "PLN" | "PDAM";
  nama: string;
  idpel: string;
  tarifDaya?: string;
  koefisien?: number;
  golongan?: string;
  abodemen?: number;
  isToken?: boolean;
  tagihKePutri?: boolean;
};

const UNIT_ROWS: UnitRow[] = [
  // --- PLN (14 unit) ---
  { sektor: "PLN", nama: "Ponbel Putra", idpel: "513140578218", tarifDaya: "S1 / 3500 VA", koefisien: 990 },
  { sektor: "PLN", nama: "Ning Badi\u2019", idpel: "513140024406", tarifDaya: "S1 / 2200 VA", koefisien: 836, tagihKePutri: true },
  { sektor: "PLN", nama: "Musholla PI", idpel: "513140040135", tarifDaya: "S1 / 2200 VA", koefisien: 836 },
  { sektor: "PLN", nama: "Fatimah", idpel: "513140030185", tarifDaya: "S1 / 3500 VA", koefisien: 990 },
  { sektor: "PLN", nama: "Nuha Mart", idpel: "513140089514", tarifDaya: "S1 / 2200 VA", koefisien: 836 },
  { sektor: "PLN", nama: "Ndalem Abah", idpel: "513140025196", tarifDaya: "R1T / 2200 VA", isToken: true },
  { sektor: "PLN", nama: "Aula Belakang", idpel: "513140942521", tarifDaya: "S1T / 900 VA", isToken: true },
  { sektor: "PLN", nama: "Ndalem Buya", idpel: "513140008813", tarifDaya: "S1 / 900 VA", koefisien: 418.59 },
  { sektor: "PLN", nama: "Musholla PA", idpel: "513140038461", tarifDaya: "S1 / 2200 VA", koefisien: 836 },
  { sektor: "PLN", nama: "Ust. Hafidz", idpel: "513140387173", tarifDaya: "S1 / 900 VA", koefisien: 459.68 },
  { sektor: "PLN", nama: "Poskes", idpel: "513140015616", tarifDaya: "R1M / 900 VA", koefisien: 1352 },
  { sektor: "PLN", nama: "Maqbarah", idpel: "513140040205", tarifDaya: "S1 / 1300 VA", abodemen: 40498 },
  { sektor: "PLN", nama: "Parkiran Putra", idpel: "513140020933", tarifDaya: "S1 / 450 VA", koefisien: 298.83 },
  { sektor: "PLN", nama: "Pondok Etan", idpel: "513140101632", tarifDaya: "S1 / 450 VA", abodemen: 4950 },
  // --- PDAM (10 unit, golongan Sosial Umum) ---
  { sektor: "PDAM", nama: "Ndalem Abah", idpel: "20081", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Ning Badi\u2019", idpel: "13753", golongan: "Sosial Umum", tagihKePutri: true },
  { sektor: "PDAM", nama: "Ndalem Buya", idpel: "18648", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Ust. Hafidz", idpel: "46529", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Aula Belakang (Lama)", idpel: "16033", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Poskes", idpel: "18882", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Quds 2", idpel: "018463", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Aula Belakang", idpel: "136325", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Nuha Mart", idpel: "46553", golongan: "Sosial Umum" },
  { sektor: "PDAM", nama: "Fatimah", idpel: "27933", golongan: "Sosial Umum" },
];

export async function seedKeuanganPondok(prisma: PrismaClient): Promise<void> {
  for (const row of TARIF_ROWS) {
    await prisma.tarifIuran.upsert({
      where: { kode: row.kode },
      create: row,
      update: { label: row.label, nominal: row.nominal, rekening: row.rekening, aktif: true },
    });
  }
  for (const u of UNIT_ROWS) {
    await prisma.utilitasUnit.upsert({
      where: { sektor_idpel: { sektor: u.sektor, idpel: u.idpel } },
      create: {
        sektor: u.sektor,
        nama: u.nama,
        idpel: u.idpel,
        tarifDaya: u.tarifDaya ?? null,
        koefisien: u.koefisien ?? null,
        golongan: u.golongan ?? null,
        abodemen: u.abodemen ?? null,
        isToken: u.isToken ?? false,
        tagihKePutri: u.tagihKePutri ?? false,
        aktif: true,
      },
      update: {
        nama: u.nama,
        tarifDaya: u.tarifDaya ?? null,
        koefisien: u.koefisien ?? null,
        golongan: u.golongan ?? null,
        abodemen: u.abodemen ?? null,
        isToken: u.isToken ?? false,
        tagihKePutri: u.tagihKePutri ?? false,
        aktif: true,
      },
    });
  }
  console.log("Seed keuangan pondok selesai: tarif iuran + 24 unit utilitas.");
}
