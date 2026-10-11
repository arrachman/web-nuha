'use client';

type Opsi = { id: number; nama: string };

/** Select yang langsung mengirim form saat berganti, tanpa tombol Terapkan. */
export function PemilihUnitSelect({ daftar, sedang }: { daftar: Opsi[]; sedang: string }) {
  return (
    <select
      key={sedang}
      id="pemilih-unit"
      name="unit"
      defaultValue={sedang}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="">Semua Unit</option>
      {daftar.map((u) => (
        <option key={u.id} value={u.id}>{u.nama}</option>
      ))}
    </select>
  );
}
