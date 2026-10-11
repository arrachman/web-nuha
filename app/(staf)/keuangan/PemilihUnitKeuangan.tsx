import { prisma } from "@/lib/prisma";
import { isSuperAdmin, type SessionPayload } from "@/lib/auth";
import { getUnitAktif } from "@/lib/unit-scope";
import { gantiUnit } from "@/lib/unit-aktif";

/** Jenjang unit utama — sama seperti PemilihUnit di topbar. */
const JENJANG_UTAMA = ["SMP", "MA", "Pesantren"];

/**
 * Pemilih unit khusus halaman keuangan: chip per unit yang menulis cookie
 * yang sama dengan PemilihUnit topbar (`gantiUnit`), supaya seluruh tab
 * keuangan (termasuk Kas, Transaksi, Triwulan) tersaring ke satu unit.
 * "Semua Unit" = cookie dihapus (tampilan gabungan).
 */
export async function PemilihUnitKeuangan({ session }: { session: SessionPayload }) {
  const semua = await prisma.unit.findMany({
    where: { aktif: true, jenjang: { in: JENJANG_UTAMA } },
    select: { id: true, nama: true, jenjang: true },
  });
  const urut = [...semua].sort(
    (a, b) => JENJANG_UTAMA.indexOf(a.jenjang ?? "") - JENJANG_UTAMA.indexOf(b.jenjang ?? ""),
  );
  const boleh =
    isSuperAdmin(session) || session.unitIds == null
      ? urut
      : urut.filter((u) => session.unitIds!.includes(u.id));
  if (boleh.length <= 1) return null;

  const aktif = await getUnitAktif(session);

  const chip = (nilai: string, label: string, sedangAktif: boolean) => (
    <form key={nilai || "semua"} action={gantiUnit} style={{ margin: 0 }}>
      <input type="hidden" name="unit" value={nilai} />
      <button
        type="submit"
        className="btn"
        aria-pressed={sedangAktif}
        style={
          sedangAktif
            ? { background: "#0F6B3D", borderColor: "#0F6B3D", color: "#fff", fontWeight: 700 }
            : undefined
        }
      >
        {label}
      </button>
    </form>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "4px 0 14px" }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>Keuangan unit:</span>
      {chip("", "Semua Unit", aktif == null)}
      {boleh.map((u) => chip(String(u.id), u.nama, aktif === u.id))}
    </div>
  );
}
