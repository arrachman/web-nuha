import type { ReactNode } from "react";

/**
 * Molecule field form: pembungkus .field (label + kontrol + petunjuk) —
 * pola yang dipakai semua form di aplikasi ini. Kontrol di dalamnya WAJIB
 * atom Input/Select/Textarea (atau molecule pemilih khusus), bukan elemen
 * mentah.
 *
 * Contoh:
 *   <FormField label="Nama santri" htmlFor="nama">
 *     <Input id="nama" name="nama" required />
 *   </FormField>
 */
export function FormField({
  label,
  htmlFor,
  petunjuk,
  rapat,
  style,
  children,
}: {
  label: ReactNode;
  /** id kontrol di dalamnya, untuk mengaitkan label. */
  htmlFor?: string;
  /** Teks bantuan kecil di bawah kontrol. */
  petunjuk?: ReactNode;
  /**
   * Tanpa margin bawah — untuk bilah saring/toolbar horizontal di mana
   * field harus sejajar rata-bawah dengan tombol di sebelahnya.
   */
  rapat?: boolean;
  /** Style tambahan pada pembungkus (mis. flex/grid span di bilah form). */
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className="field" style={rapat ? { marginBottom: 0, ...style } : style}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {petunjuk != null && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {petunjuk}
        </div>
      )}
    </div>
  );
}
