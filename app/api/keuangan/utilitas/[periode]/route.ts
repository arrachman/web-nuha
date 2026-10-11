import type { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { readSession, isSuperAdmin } from "@/lib/auth";
import { labelPeriode } from "@/app/(staf)/keuangan/teks-wa";

export const runtime = "nodejs";

const NAVY = "#1a365d";
const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const NB = "Ning Badi\u2019";

async function gate(): Promise<Response | null> {
  const session = await readSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!isSuperAdmin(session)) {
    const granted = await prisma.menuRole.count({
      where: { menu: { key: "keuangan" }, role: { key: { in: session.peran } } },
    });
    if (granted === 0) return new Response("Forbidden", { status: 403 });
  }
  return null;
}

const rpPdf = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const volPdf = (n: number) => Math.round(n).toLocaleString("id-ID");

type Kolom = { judul: string; lebar: number; rata?: "left" | "right" | "center" };

function gambarTabel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  kolom: Kolom[],
  baris: string[][],
  barisTebal: Set<number> = new Set(),
): number {
  const FS = 8.5;
  const RH = 15;
  const totalW = kolom.reduce((s, k) => s + k.lebar, 0);
  const y0 = y;
  // header navy
  doc.rect(x, y, totalW, RH).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(FS).fillColor("#ffffff");
  let cx = x;
  for (const k of kolom) {
    doc.text(k.judul, cx + 4, y + 4, { width: k.lebar - 8, align: k.rata ?? "left" });
    cx += k.lebar;
  }
  y += RH;
  // isi
  baris.forEach((b, ri) => {
    let c2 = x;
    doc.font(barisTebal.has(ri) ? "Helvetica-Bold" : "Helvetica").fontSize(FS).fillColor("#000000");
    b.forEach((cell, i) => {
      const k = kolom[i];
      doc.text(cell, c2 + 4, y + 4, { width: k.lebar - 8, align: k.rata ?? "left" });
      c2 += k.lebar;
    });
    doc.moveTo(x, y + RH).lineTo(x + totalW, y + RH).lineWidth(0.4).strokeColor("#cccccc").stroke();
    y += RH;
  });
  // bingkai + garis vertikal
  doc.rect(x, y0, totalW, y - y0).lineWidth(0.8).strokeColor(NAVY).stroke();
  let vx = x;
  for (const k of kolom.slice(0, -1)) {
    vx += k.lebar;
    doc.moveTo(vx, y0).lineTo(vx, y).lineWidth(0.4).strokeColor("#cccccc").stroke();
  }
  return y;
}

function footer(doc: PDFKit.PDFDocument, hal: number) {
  doc.font("Helvetica").fontSize(8).fillColor("#888888")
    .text(`PPSS NURUL HUDA MERGOSONO MALANG | Halaman ${hal} dari 2`, 36, 806, {
      align: "center",
      width: doc.page.width - 72,
    });
}

/** Laporan Anggaran Utilitas [Bulan Tahun] — tepat 2 halaman A4. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ periode: string }> }) {
  const denied = await gate();
  if (denied) return denied;
  const { periode } = await ctx.params;
  if (!PERIODE_RE.test(periode)) return new Response("Periode tidak valid", { status: 400 });

  const tagihan = await prisma.utilitasTagihan.findMany({
    where: { periode },
    include: { unit: true },
    orderBy: [{ unit: { sektor: "asc" } }, { total: "desc" }],
  });
  if (tagihan.length === 0)
    return new Response(`Belum ada tagihan utilitas untuk ${labelPeriode(periode)}.`, { status: 404 });

  const label = labelPeriode(periode);
  const labelCaps = label.toUpperCase();

  const pln = tagihan.filter((t) => t.unit.sektor === "PLN").sort((a, b) => Number(b.total) - Number(a.total));
  const pdam = tagihan.filter((t) => t.unit.sektor === "PDAM").sort((a, b) => Number(b.total) - Number(a.total));
  const totalPln = pln.reduce((s, t) => s + Number(t.total), 0);
  const totalPdam = pdam.reduce((s, t) => s + Number(t.total), 0);
  const volPln = pln.reduce((s, t) => s + Number(t.volume ?? 0), 0);
  const volPdam = pdam.reduce((s, t) => s + Number(t.volume ?? 0), 0);
  const grand = totalPln + totalPdam;
  const patungan = Math.round(grand / 2);
  const titipan = tagihan.filter((t) => t.unit.tagihKePutri).reduce((s, t) => s + Number(t.total), 0);
  const kePutra = patungan + titipan;
  const namaUnit = (t: (typeof tagihan)[number]) =>
    t.unit.nama + (t.unit.tagihKePutri ? " (ke Putri)" : "") + (t.unit.isToken ? " *" : "");

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const selesai = new Promise<Response>((resolve) =>
    doc.on("end", () =>
      resolve(
        new Response(new Uint8Array(Buffer.concat(chunks)), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="Laporan Anggaran Utilitas ${label}.pdf"`,
          },
        }),
      ),
    ),
  );

  const X = 36;
  const W = doc.page.width - 72;

  // ═══ HALAMAN 1 ═══
  let y = 40;
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#000")
    .text("PPSS NURUL HUDA MERGOSONO MALANG", X, y, { align: "center", width: W });
  y = doc.y + 4;
  doc.font("Helvetica-Bold").fontSize(11)
    .text(`Laporan Konsolidasi Anggaran Utilitas Penggunaan Bulan ${label}`, { align: "center", width: W });
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9).fillColor("#333")
    .text(
      "Laporan pembukuan berkala ini merangkum seluruh pengeluaran operasional bersama sektor kelistrikan (PLN) dan penyediaan air bersih (PDAM). Seluruh identitas akun, nomor pelanggan, beserta rincian volume pemakaian telah divalidasi menggunakan basis data master internal untuk menjamin transparansi, ketepatan perhitungan, serta akuntabilitas distribusi anggaran antar pengurus unit secara kolektif.",
      X, y, { width: W, align: "justify" },
    );
  y = doc.y + 12;

  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#000").text("I. KOMPONEN TAGIHAN LISTRIK (PLN)", X, y);
  y = doc.y + 6;
  const kolPln: Kolom[] = [
    { judul: "NO", lebar: 26, rata: "center" },
    { judul: "NAMA UNIT / GEDUNG", lebar: 150 },
    { judul: "ID PELANGGAN", lebar: 84 },
    { judul: "TARIF / DAYA", lebar: 76 },
    { judul: "VOLUME", lebar: 56, rata: "right" },
    { judul: "TOTAL TAGIHAN", lebar: 88, rata: "right" },
    { judul: "STATUS", lebar: 43, rata: "center" },
  ];
  const barisPln = pln.map((t, i) => [
    String(i + 1),
    namaUnit(t),
    t.unit.idpel,
    t.unit.tarifDaya ?? "-",
    `${volPdf(Number(t.volume ?? 0))} kWh`,
    rpPdf(Number(t.total)),
    t.status,
  ]);
  const semuaLunasPln = pln.every((t) => t.status === "Lunas");
  barisPln.push(["", `TOTAL AKUMULASI SEKTOR LISTRIK (PLN ${pln.length} UNIT)`, "", "", `${volPdf(volPln)} kWh`, rpPdf(totalPln), semuaLunasPln ? "Lunas" : "-"]);
  y = gambarTabel(doc, X, y, kolPln, barisPln, new Set([barisPln.length - 1]));
  footer(doc, 1);

  // ═══ HALAMAN 2 ═══
  doc.addPage();
  y = 40;
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#000").text("II. KOMPONEN TAGIHAN AIR BERSIH (PDAM)", X, y);
  y = doc.y + 6;
  const kolPdam: Kolom[] = [
    { judul: "NO", lebar: 26, rata: "center" },
    { judul: "NAMA UNIT / GEDUNG", lebar: 152 },
    { judul: "NO. REKENING", lebar: 82 },
    { judul: "GOLONGAN", lebar: 80 },
    { judul: "VOLUME", lebar: 56, rata: "right" },
    { judul: "TOTAL TAGIHAN", lebar: 84, rata: "right" },
    { judul: "STATUS", lebar: 43, rata: "center" },
  ];
  const barisPdam = pdam.map((t, i) => [
    String(i + 1),
    namaUnit(t),
    t.unit.idpel,
    t.unit.golongan ?? "-",
    `${volPdf(Number(t.volume ?? 0))} m3`,
    rpPdf(Number(t.total)),
    t.status,
  ]);
  const semuaLunasPdam = pdam.every((t) => t.status === "Lunas");
  barisPdam.push(["", `TOTAL AKUMULASI SEKTOR AIR (PDAM ${pdam.length} UNIT)`, "", "", `${volPdf(volPdam)} m3`, rpPdf(totalPdam), semuaLunasPdam ? "Lunas" : "-"]);
  y = gambarTabel(doc, X, y, kolPdam, barisPdam, new Set([barisPdam.length - 1]));
  y += 14;

  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#000")
    .text("III. REKAPITULASI KONSOLIDASI & DISTRIBUSI ALOKASI KAS", X, y);
  y = doc.y + 6;
  const kolRekap: Kolom[] = [
    { judul: "KOMPONEN ALOKASI ARUS KAS BERSAMA", lebar: 380 },
    { judul: "JUMLAH NILAI RUPIAH", lebar: 143, rata: "right" },
  ];
  const barisRekap = [
    [`Total Pengeluaran Sektor Listrik (PLN ${pln.length} Unit)`, rpPdf(totalPln)],
    [`Total Pengeluaran Sektor Air Bersih (PDAM ${pdam.length} Unit)`, rpPdf(totalPdam)],
    [`GRAND TOTAL UTILITY EXPENDITURE (${labelCaps})`, rpPdf(grand)],
    [`Alokasi Pokok Dasar Patungan (Bagi Dua Rata: Putra / Putri)`, rpPdf(patungan)],
    [`Titipan Tambahan Sektor Pribadi ${NB} (PLN + PDAM)`, `+ ${rpPdf(titipan)}`],
    [`TOTAL DANA YANG WAJIB DISERAHKAN PUTRI KEPADA PUTRA (PJ)`, rpPdf(kePutra)],
  ];
  y = gambarTabel(doc, X, y, kolRekap, barisRekap, new Set([2, 5]));
  y += 12;

  // Kotak mekanisme kliring
  const boxX = X;
  const boxW = W;
  let by = y + 8;
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000")
    .text("Mekanisme Kliring Pembukuan Kas:", boxX + 8, by, { width: boxW - 16 });
  by = doc.y + 4;
  doc.font("Helvetica").fontSize(9).fillColor("#222")
    .text(
      `Unit ${NB} menyetorkan biaya pilar pribadinya sebesar ${rpPdf(titipan)} langsung ke manajemen Putri. Pengurus Putri selanjutnya menggabungkan dana titipan khusus tersebut dengan nilai patungan dasar operasional rata tengahnya (${rpPdf(patungan)}), kemudian menyerahkan total akumulasi sebesar ${rpPdf(kePutra)} kepada Pengurus Kas Putra selaku Penanggung Jawab (PJ) Utama pelunasan satu pintu.`,
      boxX + 8, by, { width: boxW - 16, align: "justify" },
    );
  by = doc.y + 8;
  doc.rect(boxX, y, boxW, by - y).lineWidth(0.8).strokeColor(NAVY).stroke();
  footer(doc, 2);

  doc.end();
  return selesai;
}
