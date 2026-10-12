import Link from "next/link";
import type { ComponentProps } from "react";
import type { VarianButton } from "./Button";

const KELAS: Record<VarianButton, string> = {
  primer: "btn",
  sekunder: "btn-sekunder",
  ikon: "btn-icon",
  "ikon-utama": "btn-icon btn-icon-utama",
  "ikon-bahaya": "btn-icon btn-icon-bahaya",
  "ghost-terang": "btn-ghost-terang",
  "ikon-sekunder": "btn-icon btn-sekunder",
  "ikon-sekunder-bahaya": "btn-icon btn-sekunder btn-icon-bahaya",
  tab: "tab",
  chip: "chip",
  "chip-copot": "chip-copot",
  polos: "",
};

type ButtonLinkProps = ComponentProps<typeof Link> & {
  varian?: VarianButton;
  /** Hanya berlaku untuk varian sekunder: keadaan aktif/terpilih. */
  aktif?: boolean;
};

/**
 * Tautan navigasi yang tampil sebagai tombol — pasangan dari atom Button
 * untuk aksi berpindah halaman (mis. "Tambah data"). Styling berasal dari
 * class desain yang sama persis dengan Button; jangan menulis
 * <Link className="btn"> mentah di halaman.
 */
export function ButtonLink({ varian = "primer", aktif, className, ...rest }: ButtonLinkProps) {
  const kelasAktif =
    aktif && varian === "chip" ? "chip-aktif" : aktif && (varian === "sekunder" || varian === "tab") ? "active" : "";
  const kelas = [KELAS[varian], kelasAktif, typeof className === "string" ? className : ""]
    .filter(Boolean)
    .join(" ");
  return <Link className={kelas} {...rest} />;
}
