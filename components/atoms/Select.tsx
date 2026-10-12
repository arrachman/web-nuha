import type { SelectHTMLAttributes } from "react";

/**
 * Atom dropdown — satu-satunya cara membuat <select> di aplikasi ini.
 * Isi <option> ditulis sebagai children seperti biasa; atribut native
 * (name, defaultValue, required, onChange, ...) diteruskan apa adanya.
 * Styling datang dari konteks desain (.field / .bilah-filter) — biasanya
 * lewat molecule FormField.
 */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}
