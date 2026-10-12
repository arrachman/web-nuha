import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * cari: input pencarian berdiri sendiri di luar .field (class .input-cari).
   * Tanpa varian, styling datang dari konteks desain (.field / .bilah-filter)
   * — biasanya lewat molecule FormField.
   */
  varian?: "cari";
};

/**
 * Atom input — satu-satunya cara membuat <input> di aplikasi ini.
 * Atribut native (type, name, defaultValue, required, placeholder, step,
 * min, max, ...) diteruskan apa adanya.
 */
export function Input({ varian, className, ...rest }: InputProps) {
  const kelas = [varian === "cari" ? "input-cari" : "", className ?? ""].filter(Boolean).join(" ");
  return <input className={kelas || undefined} {...rest} />;
}
