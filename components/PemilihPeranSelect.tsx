'use client';

import { useState, useTransition } from 'react';
import { gantiPeran } from '@/lib/samaran';
import { apiPath } from '@/lib/api-path';
import { Select } from '@/components/atoms/Select';

type Opsi = { key: string; name: string };

/**
 * Select pemilih peran (mode samaran super admin): begitu berganti, server
 * action `gantiPeran` dipanggil untuk menukar sesi, lalu browser DIMUAT
 * KERAS ke beranda aplikasi. Pola sama dengan PemilihUnit — revalidatePath
 * saja menyisakan state form/cache peran lama; muat keras membersihkannya
 * dan sekaligus menjalankan gate akses peran baru dari nol.
 */
export function PemilihPeranSelect({ daftar, sedang }: { daftar: Opsi[]; sedang: string }) {
  const [pending, startTransition] = useTransition();
  const [kunciReset, setKunciReset] = useState(0);
  return (
    <Select
      key={kunciReset}
      id="samaran-peran"
      name="peran"
      defaultValue={sedang}
      disabled={pending}
      onChange={(event) => {
        const nilai = event.currentTarget.value;
        startTransition(async () => {
          const formData = new FormData();
          formData.set('peran', nilai);
          try {
            await gantiPeran(formData);
          } catch {
            // Gagal (mis. sesi berubah): batalkan muat, kembalikan select
            // ke peran yang sedang aktif.
            setKunciReset((k) => k + 1);
            return;
          }
          window.location.assign(apiPath('/'));
        });
      }}
    >
      <option value="">Super admin (peran asli)</option>
      {daftar.map((peran) => (
        <option key={peran.key} value={peran.key}>{peran.name}</option>
      ))}
    </Select>
  );
}
