'use client';

type Opsi = { key: string; name: string };

/** Select yang langsung mengirim form saat berganti, tanpa tombol Terapkan. */
export function PemilihPeranSelect({ daftar, sedang }: { daftar: Opsi[]; sedang: string }) {
  return (
    <select
      id="samaran-peran"
      name="peran"
      defaultValue={sedang}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="">Super admin (peran asli)</option>
      {daftar.map((peran) => (
        <option key={peran.key} value={peran.key}>{peran.name}</option>
      ))}
    </select>
  );
}
