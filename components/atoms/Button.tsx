import type { ButtonHTMLAttributes } from "react";

/**
 * Atom tombol — SATU-SATUNYA cara membuat tombol di aplikasi ini.
 * Halaman dilarang menulis <button> mentah; varian memetakan ke class
 * desain di globals.css (.btn, .btn-sekunder, .btn-icon, .btn-ghost-terang)
 * supaya tampilan tidak pernah menyimpang antar-halaman.
 *
 * - primer: tombol aksi utama (hijau solid)
 * - sekunder: tombol pendamping (putih berbingkai); prop `aktif` untuk
 *   keadaan terpilih (mis. pager / chip mode)
 * - ikon / ikon-utama / ikon-bahaya: tombol ikon 28px (dengan svg di dalam)
 * - ghost-terang: tombol transparan di atas latar gelap (sidebar)
 * - tab / chip / chip-copot: pola tab & chip saring (prop `aktif` =
 *   keadaan terpilih: .active untuk tab, .chip-aktif untuk chip)
 * - polos: tanpa class desain — hanya untuk tombol berkelas kustom warisan
 *   yang tampilannya diatur class-nya sendiri lewat className
 *
 * Atribut <button> lain (type, name, value, formAction, disabled, style,
 * onClick, ...) diteruskan apa adanya. `type` TIDAK diberi default:
 * perilaku bawaan browser (submit di dalam form) dipertahankan.
 */
export type VarianButton =
  | "primer"
  | "sekunder"
  | "ikon"
  | "ikon-utama"
  | "ikon-bahaya"
  | "ghost-terang"
  | "ikon-sekunder"
  | "ikon-sekunder-bahaya"
  | "tab"
  | "chip"
  | "chip-copot"
  | "polos";

const KELAS: Record<VarianButton, string> = {
  primer: "btn",
  sekunder: "btn-sekunder",
  ikon: "btn-icon",
  "ikon-utama": "btn-icon btn-icon-utama",
  "ikon-bahaya": "btn-icon btn-icon-bahaya",
  // Tombol ikon berlatar terang (kombinasi warisan .btn-icon + .btn-sekunder
  // yang dipakai tombol ubah/hapus di tabel CRUD).
  "ikon-sekunder": "btn-icon btn-sekunder",
  "ikon-sekunder-bahaya": "btn-icon btn-sekunder btn-icon-bahaya",
  "ghost-terang": "btn-ghost-terang",
  tab: "tab",
  chip: "chip",
  "chip-copot": "chip-copot",
  // Tanpa class desain sama sekali — untuk tombol berkelas kustom warisan
  // (mis. .bilah-filter-hapus, .grup-lipat) yang tampilannya sudah diatur
  // class-nya sendiri; className diteruskan apa adanya.
  polos: "",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: VarianButton;
  /** Hanya berlaku untuk varian sekunder: keadaan aktif/terpilih. */
  aktif?: boolean;
};

export function Button({ varian = "primer", aktif, className, ...rest }: ButtonProps) {
  const kelasAktif =
    aktif && varian === "chip" ? "chip-aktif" : aktif && (varian === "sekunder" || varian === "tab") ? "active" : "";
  const kelas = [KELAS[varian], kelasAktif, className ?? ""].filter(Boolean).join(" ");
  return <button className={kelas} {...rest} />;
}
