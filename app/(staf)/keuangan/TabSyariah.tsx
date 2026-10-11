import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/auth";
import { getUnitAktif } from "@/lib/unit-scope";
import { Card, Tabel, Kosong, rp } from "@/components";
import { StatusSantri } from "@prisma/client";
import { FormAksi } from "./FormAksi";
import {
  generateTagihanBulanan,
  catatPembayaran,
  simpanOverride,
  hapusOverride,
} from "./aksi";

const LABEL_KOMPONEN: Record<string, string> = {
  SYARIAH: "Syariah",
  INFAQ_PEMBANGUNAN: "Infaq",
  WIFI: "Wifi",
  POSKES: "Poskes",
  PLN_PDAM: "PLN/PDAM",
};

function fmtRincian(rincian: unknown): string {
  if (!rincian || typeof rincian !== "object") return "-";
  const r = rincian as Record<string, unknown>;
  if (r.override) return `Tarif khusus Rp${Number(r.totalBulanan ?? 0).toLocaleString("id-ID")}`;
  return Object.entries(r)
    .map(([k, v]) => `${LABEL_KOMPONEN[k] ?? k} ${Number(v).toLocaleString("id-ID")}`)
    .join(" • ");
}

function statusTagihan(amount: number, paid: number): { label: string; warna: string } {
  if (paid <= 0) return { label: "Belum bayar", warna: "#B91C1C" };
  if (paid >= amount) return { label: "Lunas", warna: "#0F6B3D" };
  return { label: "Sebagian", warna: "#E8973A" };
}

export async function TabSyariah({ periode }: { periode: string }) {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const hariIni = new Date().toISOString().slice(0, 10);
  const [komponen, invoices, overrides, opsiSantri] = await Promise.all([
    prisma.tarifIuran.findMany({ where: { aktif: true }, orderBy: { id: "asc" } }),
    prisma.invoice.findMany({
      where: { type: "IURAN_BULANAN", period: periode, ...(unitAktif != null ? { santri: { unitId: unitAktif } } : {}) },
      include: {
        santri: { include: { person: true, unit: true } },
        payments: { orderBy: { date: "desc" } },
      },
      orderBy: { santri: { person: { fullName: "asc" } } },
    }),
    prisma.tarifSantriOverride.findMany({ include: { santri: { include: { person: true } } } }),
    prisma.santri.findMany({
      where: { status: StatusSantri.Aktif, ...(unitAktif != null ? { unitId: unitAktif } : {}) },
      include: { person: true },
      orderBy: { person: { fullName: "asc" } },
    }),
  ]);
  const totalStandar = komponen.reduce((s, k) => s + Number(k.nominal), 0);
  const totalTagihan = invoices.reduce((s, t) => s + Number(t.amount), 0);
  const totalBayar = invoices.reduce((s, t) => s + Number(t.paidAmount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card
        judul={`Tagihan iuran santri — ${periode}`}
        sub={`Standar Rp${totalStandar.toLocaleString("id-ID")}/bln (${komponen.map((k) => `${LABEL_KOMPONEN[k.kode] ?? k.kode} ${Number(k.nominal).toLocaleString("id-ID")}`).join(" + ")}). Total tagihan ${rp(totalTagihan)}, terbayar ${rp(totalBayar)}.`}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 14 }}>
          <form method="get" style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <input type="hidden" name="tab" value="syariah" />
            <label style={{ fontSize: 13 }}>
              Periode
              <input type="month" name="periode" defaultValue={periode} className="field" style={{ display: "block", marginTop: 4 }} />
            </label>
            <button type="submit" className="btn">Tampilkan</button>
          </form>
          <FormAksi action={generateTagihanBulanan} tombol={`Generate tagihan ${periode}`}>
            <input type="hidden" name="periode" value={periode} />
          </FormAksi>
        </div>

        {invoices.length === 0 ? (
          <Kosong pesan={`Belum ada tagihan untuk ${periode}. Klik "Generate tagihan".`} />
        ) : (
          <Tabel kolom={["Santri", "Rincian", { label: "Nominal", num: true }, { label: "Dibayar", num: true }, { label: "Sisa", num: true }, "Status", "Aksi"]}>
            {invoices.map((t) => {
              const amount = Number(t.amount);
              const paid = Number(t.paidAmount);
              const sisa = amount - paid;
              const st = statusTagihan(amount, paid);
              return (
                <tr key={String(t.id)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.santri.person.fullName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.santri.unit?.nama ?? "-"} · jatuh tempo {t.dueDate.toLocaleDateString("id-ID", { dateStyle: "medium" })}</div>
                  </td>
                  <td style={{ fontSize: 12 }} className="muted">{fmtRincian(t.rincian)}</td>
                  <td className="num">{rp(amount)}</td>
                  <td className="num" style={{ color: "#0F6B3D" }}>{rp(paid)}</td>
                  <td className="num" style={{ fontWeight: 700, color: sisa > 0 ? "#B91C1C" : "#0F6B3D" }}>{rp(sisa)}</td>
                  <td><span style={{ color: st.warna, fontWeight: 700, fontSize: 13 }}>{st.label}</span></td>
                  <td>
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 13, color: "#1D4ED8" }}>Bayar</summary>
                      <div style={{ marginTop: 8, minWidth: 240 }}>
                        {sisa > 0 ? (
                          <FormAksi action={catatPembayaran} tombol="Catat bayar">
                            <input type="hidden" name="invoiceId" value={String(t.id)} />
                            <label style={{ fontSize: 12 }}>Tanggal<input type="date" name="tanggal" defaultValue={hariIni} className="field" style={{ display: "block", width: "100%", marginTop: 2 }} required /></label>
                            <label style={{ fontSize: 12 }}>Nominal<input type="number" name="nominal" defaultValue={sisa} min={1} max={sisa} className="field" style={{ display: "block", width: "100%", marginTop: 2 }} required /></label>
                            <label style={{ fontSize: 12 }}>Metode
                              <select name="metode" className="field" style={{ display: "block", width: "100%", marginTop: 2 }}>
                                <option>Tunai</option>
                                <option>Transfer BRI</option>
                                <option>QRIS</option>
                                <option>Transfer Bank Lain</option>
                              </select>
                            </label>
                            <label style={{ fontSize: 12 }}>Keterangan<input type="text" name="keterangan" className="field" placeholder="opsional" style={{ display: "block", width: "100%", marginTop: 2 }} /></label>
                          </FormAksi>
                        ) : (
                          <div style={{ fontSize: 12, color: "#0F6B3D" }}>Lunas ✓</div>
                        )}
                        {t.payments.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12 }}>
                            {t.payments.map((p) => (
                              <div key={String(p.id)} style={{ padding: "4px 0", borderTop: "1px solid #eee" }}>
                                {p.date.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {rp(Number(p.amount))} · {p.method}{" "}
                                <a href={`/api/keuangan/kwitansi/${p.id}`} target="_blank" rel="noreferrer" style={{ color: "#1D4ED8" }}>kwitansi →</a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </Card>

      <Card judul="Tarif khusus per santri" sub="Santri bertarif di luar standar (mis. 900rb/bln). Kosong = ikut tarif standar.">
        {overrides.length > 0 && (
          <Tabel kolom={["Santri", { label: "Total/bln", num: true }, "Keterangan", ""]}>
            {overrides.map((o) => (
              <tr key={String(o.santriId)}>
                <td>{o.santri.person.fullName}</td>
                <td className="num">{rp(Number(o.totalBulanan))}</td>
                <td className="muted">{o.keterangan ?? "-"}</td>
                <td>
                  <FormAksi action={hapusOverride} tombol="Hapus">
                    <input type="hidden" name="santriId" value={String(o.santriId)} />
                  </FormAksi>
                </td>
              </tr>
            ))}
          </Tabel>
        )}
        <div style={{ marginTop: 12 }}>
          <FormAksi action={simpanOverride} tombol="Simpan tarif khusus">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <label style={{ fontSize: 13 }}>Santri
                <select name="santriId" className="field" style={{ display: "block", marginTop: 4, maxWidth: 260 }} required>
                  {opsiSantri.map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>Total/bln (Rp)
                <input type="number" name="total" min={1} className="field" style={{ display: "block", marginTop: 4 }} required />
              </label>
              <label style={{ fontSize: 13 }}>Keterangan
                <input type="text" name="keterangan" className="field" placeholder="mis. 1 SMP" style={{ display: "block", marginTop: 4 }} />
              </label>
            </div>
          </FormAksi>
        </div>
      </Card>
    </div>
  );
}
