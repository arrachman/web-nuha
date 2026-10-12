import { prisma } from "@/lib/prisma";
import { Card, StatCard, Tabel, Kosong, rp, FormField, Input, Select } from "@/components";
import { FormAksi } from "./FormAksi";
import { bayarUtang, catatUtang } from "./aksi";

const METODE = ["Tunai", "Transfer BRI", "QRIS", "Transfer Bank Lain"];

const fmtTgl = (d: Date | null) =>
  d ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Utang pondok ke pihak luar (pemasok, toko, dsb) — modul Piutang & Utang
 * sisi kewajiban: catat utang, cicil/lunasi (otomatis kas keluar), pantau
 * sisa + jatuh tempo. Pasangan TabPiutang di sisi hak.
 */
export async function TabUtang() {
  const hariIni = new Date().toISOString().slice(0, 10);
  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);

  const rows = await prisma.utangPondok.findMany({
    include: { pembayaran: { select: { jumlah: true } } },
    orderBy: [{ jatuhTempo: "asc" }, { tanggal: "asc" }],
  });
  const daftar = rows.map((r) => {
    const dibayar = r.pembayaran.reduce((s, p) => s + Number(p.jumlah), 0);
    const pokok = Number(r.pokok);
    return { ...r, pokok, dibayar, sisa: pokok - dibayar };
  });
  const totalPokok = daftar.reduce((s, r) => s + r.pokok, 0);
  const totalDibayar = daftar.reduce((s, r) => s + r.dibayar, 0);
  const totalSisa = totalPokok - totalDibayar;
  const terbuka = daftar.filter((r) => r.sisa > 0);
  const tempoTerdekat = terbuka
    .filter((r) => r.jatuhTempo)
    .sort((a, b) => (a.jatuhTempo!.getTime() - b.jatuhTempo!.getTime()))[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="grid g4">
        <StatCard label="Total pokok utang" nilai={rp(totalPokok)} />
        <StatCard label="Sudah dibayar" nilai={rp(totalDibayar)} warna="#0F6B3D" />
        <StatCard label="Sisa kewajiban" nilai={rp(totalSisa)} warna="#B91C1C" />
        <StatCard
          label="Jatuh tempo terdekat"
          nilai={tempoTerdekat ? `${tempoTerdekat.kreditur} · ${fmtTgl(tempoTerdekat.jatuhTempo)}` : "—"}
        />
      </section>

      <Card judul="Catat utang baru" sub="Kewajiban pondok ke pemasok, toko bangunan, atau pihak lain.">
        <FormAksi action={catatUtang} tombol="Catat utang">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <FormField label="Tanggal" htmlFor="utang-tanggal" rapat>
              <Input type="date" id="utang-tanggal" name="tanggal" defaultValue={hariIni} required />
            </FormField>
            <FormField label="Kreditur" htmlFor="utang-kreditur" rapat style={{ minWidth: 180 }}>
              <Input id="utang-kreditur" name="kreditur" placeholder="mis. CV Berkah Pangan" required />
            </FormField>
            <FormField label="Keterangan" htmlFor="utang-keterangan" rapat style={{ minWidth: 220 }}>
              <Input id="utang-keterangan" name="keterangan" placeholder="mis. Belanja dapur Oktober" required />
            </FormField>
            <FormField label="Pokok (Rp)" htmlFor="utang-pokok" rapat style={{ width: 160 }}>
              <Input id="utang-pokok" name="pokok" inputMode="numeric" placeholder="0" required />
            </FormField>
            <FormField label="Jatuh tempo" htmlFor="utang-tempo" rapat>
              <Input type="date" id="utang-tempo" name="jatuhTempo" />
            </FormField>
          </div>
        </FormAksi>
      </Card>

      <Card judul={`Daftar utang (${daftar.length})`} sub="Bayar/cicil dari kolom Bayar — pembayaran otomatis dibukukan sebagai kas keluar.">
        {daftar.length === 0 ? (
          <Kosong pesan="Belum ada utang tercatat." />
        ) : (
          <Tabel
            kolom={[
              "Kreditur",
              "Keterangan",
              { label: "Pokok", num: true },
              { label: "Dibayar", num: true },
              "Progres",
              { label: "Sisa", num: true },
              "Jatuh tempo",
              "Status",
              "Bayar",
            ]}
          >
            {daftar.map((r) => {
              const persen = r.pokok > 0 ? Math.min(100, Math.round((r.dibayar / r.pokok) * 100)) : 0;
              const telat = r.sisa > 0 && r.jatuhTempo != null && r.jatuhTempo < awalHari;
              return (
                <tr key={String(r.id)}>
                  <td style={{ fontWeight: 600 }}>{r.kreditur}</td>
                  <td className="muted">{r.keterangan}</td>
                  <td className="num">{rp(r.pokok)}</td>
                  <td className="num" style={{ color: "#0F6B3D" }}>{rp(r.dibayar)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 110 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--krem-3)" }}>
                        <div style={{ width: `${persen}%`, height: 8, borderRadius: 99, background: "#0F6B3D" }} />
                      </div>
                      <span className="muted" style={{ fontSize: 12 }}>{persen}%</span>
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 700, color: r.sisa > 0 ? "#B91C1C" : undefined }}>
                    {rp(r.sisa)}
                  </td>
                  <td style={telat ? { color: "#B91C1C", fontWeight: 700 } : undefined}>{fmtTgl(r.jatuhTempo)}</td>
                  <td>
                    {r.sisa <= 0 ? (
                      <span style={{ color: "#0F6B3D", fontWeight: 700 }}>Lunas</span>
                    ) : telat ? (
                      <span style={{ color: "#B91C1C", fontWeight: 700 }}>Terlambat</span>
                    ) : (
                      <span className="muted">Belum lunas</span>
                    )}
                  </td>
                  <td style={{ minWidth: 250 }}>
                    {r.sisa > 0 ? (
                      <FormAksi action={bayarUtang} tombol="Bayar">
                        <input type="hidden" name="utangId" value={String(r.id)} />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                          <Input type="date" name="tanggal" defaultValue={hariIni} aria-label="Tanggal bayar" style={{ width: 130 }} />
                          <Input name="jumlah" inputMode="numeric" placeholder="Nominal" aria-label="Jumlah bayar" style={{ width: 110 }} />
                          <Select name="metode" aria-label="Metode bayar" style={{ width: 130 }}>
                            {METODE.map((m) => <option key={m}>{m}</option>)}
                          </Select>
                        </div>
                      </FormAksi>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
