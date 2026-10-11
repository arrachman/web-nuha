import type { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { readSession, isSuperAdmin } from "@/lib/auth";
import { terbilangRupiah } from "@/lib/terbilang";

export const runtime = "nodejs";

const LABEL_KOMPONEN: Record<string, string> = {
  SYARIAH: "Syariah",
  INFAQ_PEMBANGUNAN: "Infaq pembangunan",
  WIFI: "Wifi",
  POSKES: "Poskestren",
  PLN_PDAM: "PLN/PDAM",
};

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
const tglId = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** Kwitansi PDF pembayaran iuran santri (A5). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await gate();
  if (denied) return denied;
  const { id } = await ctx.params;
  let pid: bigint;
  try {
    pid = BigInt(id);
  } catch {
    return new Response("Tidak ditemukan", { status: 404 });
  }
  const pay = await prisma.payment.findUnique({
    where: { id: pid },
    include: { invoice: { include: { santri: { include: { person: true } } } } },
  });
  if (!pay) return new Response("Tidak ditemukan", { status: 404 });

  const inv = pay.invoice;
  const nama = inv.santri.person.fullName;
  const nominal = Number(pay.amount);
  const noKwitansi = `KWT/${pay.date.toISOString().slice(0, 7).replace("-", "")}/${pay.id}`;

  const rincian: string[] = [];
  const r = inv.rincian as Record<string, unknown> | null;
  if (r && typeof r === "object") {
    if (r.override) rincian.push(`Tarif khusus - ${rpPdf(Number(r.totalBulanan ?? 0))}`);
    else
      for (const [k, v] of Object.entries(r))
        rincian.push(`${LABEL_KOMPONEN[k] ?? k}: ${rpPdf(Number(v))}`);
  }

  const doc = new PDFDocument({ size: "A5", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const selesai = new Promise<Response>((resolve) =>
    doc.on("end", () =>
      resolve(
        new Response(new Uint8Array(Buffer.concat(chunks)), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="kwitansi-${pay.id}.pdf"`,
          },
        }),
      ),
    ),
  );

  const W = doc.page.width - 72;
  let y = 40;

  doc.font("Helvetica-Bold").fontSize(12)
    .text("PONDOK PESANTREN SALAFIYAH SYAFI\u2019IYAH", 36, y, { align: "center", width: W });
  y = doc.y + 2;
  doc.font("Helvetica-Bold").fontSize(13).text("NURUL HUDA MERGOSONO", { align: "center", width: W });
  y = doc.y + 2;
  doc.font("Helvetica").fontSize(8.5).fillColor("#444")
    .text("Jl. Kolonel Sugiono Gang 3B Mergosono, Kedungkandang, Kota Malang", { align: "center", width: W });
  y = doc.y + 8;
  doc.fillColor("#000").moveTo(36, y).lineTo(36 + W, y).lineWidth(1.5).stroke();
  y += 12;

  doc.font("Helvetica-Bold").fontSize(14).text("KWITANSI", 36, y, { align: "center", width: W });
  y = doc.y + 10;
  doc.font("Helvetica").fontSize(10);
  doc.text(`No: ${noKwitansi}`, 36, y);
  doc.text(`Tanggal: ${tglId(pay.date)}`, 36 + W / 2, y);
  y = doc.y + 12;

  const isi: Array<[string, string]> = [
    ["Terima dari", nama],
    ["Uang sejumlah", terbilangRupiah(nominal)],
    ["Untuk pembayaran", `Iuran santri periode ${inv.period} (${inv.code})`],
    ["Metode", pay.method + (pay.reference ? ` - ${pay.reference}` : "")],
  ];
  const boxY = y;
  let iy = y + 10;
  doc.fontSize(10);
  for (const [label, val] of isi) {
    doc.font("Helvetica").fillColor("#444").text(label, 48, iy, { width: 110 });
    doc.font("Helvetica-Bold").fillColor("#000").text(`: ${val}`, 158, iy, { width: W - 134 });
    iy = doc.y + 7;
  }
  if (rincian.length > 0) {
    doc.font("Helvetica").fillColor("#444").text("Rincian", 48, iy, { width: 110 });
    iy += 2;
    for (const line of rincian) {
      doc.font("Helvetica").fillColor("#000").text(`: ${line}`, 158, iy, { width: W - 134 });
      iy = doc.y + 3;
    }
    iy += 4;
  }
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#0F6B3D")
    .text(`Jumlah: ${rpPdf(nominal)}`, 48, iy, { width: W - 24 });
  iy = doc.y + 10;
  doc.rect(36, boxY, W, iy - boxY).lineWidth(1).stroke();
  y = iy + 28;

  const tx = 36 + W - 190;
  doc.font("Helvetica").fontSize(10).fillColor("#000");
  doc.text(`Malang, ${tglId(pay.date)}`, tx, y, { width: 190, align: "center" });
  y = doc.y + 4;
  doc.text("Bendahara,", tx, y, { width: 190, align: "center" });
  y = doc.y + 52;
  doc.font("Helvetica-Bold").text("( Muhammad Masykur Maulidi )", tx, y, { width: 190, align: "center" });

  doc.end();
  return selesai;
}
