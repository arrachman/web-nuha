import { prisma } from "@/lib/prisma";
import { Card, Tabel, rp } from "@/components";
import { FormAksi } from "./FormAksi";
import { TombolSalin } from "./TombolSalin";
import { simpanUtilitasBulanan } from "./aksi";
import { bangunTeksWaUtilitas, labelPeriode, type BarisUtilitas } from "./teks-wa";

/** Beban listrik/PDAM: master unit, input tagihan bulanan, laporan PDF + teks WA. */
export async function TabUtilitas({ periode }: { periode: string }) {
  const [units, tagihan] = await Promise.all([
    prisma.utilitasUnit.findMany({ where: { aktif: true }, orderBy: [{ sektor: "asc" }, { id: "asc" }] }),
    prisma.utilitasTagihan.findMany({ where: { periode }, include: { unit: true } }),
  ]);
  const adaMap = new Map(tagihan.map((t) => [String(t.unitId), t]));

  // Laporan hanya memuat unit yang ada tagihannya — unit token tanpa SS
  // pembelian otomatis ter-exclude (Rp0) sesuai aturan main.
  const keBaris = (t: (typeof tagihan)[number]): BarisUtilitas => ({
    nama: t.unit.nama + (t.unit.tagihKePutri ? " (ditagihkan ke Putri)" : ""),
    total: Number(t.total),
    tagihKePutri: t.unit.tagihKePutri,
  });
  const pln = tagihan.filter((t) => t.unit.sektor === "PLN").map(keBaris).sort((a, b) => b.total - a.total);
  const pdam = tagihan.filter((t) => t.unit.sektor === "PDAM").map(keBaris).sort((a, b) => b.total - a.total);
  const totalPln = pln.reduce((s, r) => s + r.total, 0);
  const totalPdam = pdam.reduce((s, r) => s + r.total, 0);
  const teksWa = tagihan.length > 0 ? bangunTeksWaUtilitas(labelPeriode(periode), pln, pdam) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card judul="Master unit utilitas" sub="14 meteran PLN (2 token prabayar) + 10 PDAM. Token tanpa SS pembelian otomatis Rp0 di laporan. Tab ini selalu gabungan semua unit utilitas (fungsi kliring antar-unit) — tidak mengikuti pemilih unit di atas.">
        <Tabel kolom={["Sektor", "Nama unit", "IDPEL / No. rek", "Tarif / Daya / Golongan", { label: "Koefisien", num: true }, "Ket"]}>
          {units.map((u) => (
            <tr key={String(u.id)}>
              <td>{u.sektor}</td>
              <td style={{ fontWeight: 600 }}>{u.nama}</td>
              <td className="muted">{u.idpel}</td>
              <td className="muted">{u.sektor === "PLN" ? (u.tarifDaya ?? "-") : (u.golongan ?? "-")}</td>
              <td className="num">{u.koefisien != null ? `Rp${Number(u.koefisien).toLocaleString("id-ID")}` : (u.abodemen != null ? `Abodemen Rp${Number(u.abodemen).toLocaleString("id-ID")}` : "-")}</td>
              <td className="muted" style={{ fontSize: 12 }}>
                {u.isToken ? "Token* " : ""}{u.tagihKePutri ? "→ Putri" : ""}
              </td>
            </tr>
          ))}
        </Tabel>
      </Card>

      <Card judul={`Input tagihan — ${labelPeriode(periode)}`} sub="Kosongkan unit token bila tidak ada SS pembelian (otomatis Rp0).">
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "end", marginBottom: 12 }}>
          <input type="hidden" name="tab" value="utilitas" />
          <label style={{ fontSize: 13 }}>Periode
            <input type="month" name="periode" defaultValue={periode} className="field" style={{ display: "block", marginTop: 4 }} />
          </label>
          <button type="submit" className="btn">Tampilkan</button>
        </form>
        <FormAksi action={simpanUtilitasBulanan} tombol={`Simpan tagihan ${labelPeriode(periode)}`}>
          <input type="hidden" name="periode" value={periode} />
          <Tabel kolom={["Unit", { label: "Volume (kWh/m³)", num: true }, { label: "Total tagihan (Rp)", num: true }, "Status"]}>
            {units.map((u) => {
              const ada = adaMap.get(String(u.id));
              return (
                <tr key={String(u.id)}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nama} <span className="muted">({u.sektor})</span></div>
                    <div className="muted" style={{ fontSize: 11 }}>{u.idpel}{u.isToken ? " · token*" : ""}</div>
                  </td>
                  <td className="num">
                    <input type="number" name={`vol_${u.id}`} step="0.01" min={0} defaultValue={ada?.volume != null ? Number(ada.volume) : ""} className="field" style={{ width: 110, textAlign: "right" }} placeholder="0" />
                  </td>
                  <td className="num">
                    <input type="number" name={`total_${u.id}`} min={0} defaultValue={ada ? Number(ada.total) : ""} className="field" style={{ width: 140, textAlign: "right" }} placeholder="0" />
                  </td>
                  <td>
                    <select name={`status_${u.id}`} defaultValue={ada?.status ?? "Belum"} className="field">
                      <option value="Belum">Belum</option>
                      <option value="Lunas">Lunas</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </Tabel>
        </FormAksi>
      </Card>

      <Card judul={`Laporan — ${labelPeriode(periode)}`} sub="PDF 2 halaman (navy) + teks rekap WhatsApp siap copas.">
        {tagihan.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Belum ada tagihan tersimpan untuk periode ini.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 14 }}>
              <div>⚡ PLN: <strong>{rp(totalPln)}</strong> <span className="muted">({pln.length} unit)</span></div>
              <div>🚰 PDAM: <strong>{rp(totalPdam)}</strong> <span className="muted">({pdam.length} unit)</span></div>
              <div>💰 Total: <strong>{rp(totalPln + totalPdam)}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="btn" href={`/api/keuangan/utilitas/${periode}`} target="_blank" rel="noreferrer">Unduh PDF laporan</a>
              <TombolSalin teks={teksWa} />
            </div>
            <pre style={{ background: "#F7F5F0", border: "1px solid #E5E0D5", borderRadius: 8, padding: 12, fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>{teksWa}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
