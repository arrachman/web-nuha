'use client';

import { useTransition } from 'react';
import { gantiUnit } from '@/lib/unit-aktif';
import { Select } from '@/components/atoms/Select';

type Opsi = { id: number; nama: string };

/**
 * Select pemilih unit: begitu berganti, server action `gantiUnit` dipanggil
 * untuk menyimpan cookie unit aktif, lalu halaman DIMUAT ULANG PENUH.
 * Reload penuh disengaja (permintaan user): revalidatePath saja hanya
 * menyegarkan data server — state form & filter di komponen client tetap
 * menampilkan unit lama. Dengan reload, data dan seluruh form kembali
 * dari awal mengikuti unit yang baru dipilih.
 */
export function PemilihUnitSelect({ daftar, sedang }: { daftar: Opsi[]; sedang: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      key={sedang}
      id="pemilih-unit"
      name="unit"
      defaultValue={sedang}
      disabled={pending}
      onChange={(event) => {
        const nilai = event.currentTarget.value;
        startTransition(async () => {
          const formData = new FormData();
          formData.set('unit', nilai);
          try {
            await gantiUnit(formData);
          } catch {
            // Pilihan select sudah difilter server sesuai cakupan sesi,
            // jadi kegagalan di sini nyaris mustahil; reload tetap membuat
            // tampilan konsisten dengan state cookie terakhir di server.
          }
          window.location.reload();
        });
      }}
    >
      <option value="">Semua Unit</option>
      {daftar.map((u) => (
        <option key={u.id} value={u.id}>{u.nama}</option>
      ))}
    </Select>
  );
}
