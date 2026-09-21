import { TabLembaga } from '@/components';
import type { FilterInduk } from './filter';
import type { PohonInduk } from './pohon';

/** Tab lembaga /induk di atas `TabLembaga` bersama.
 *
 * Sengaja memetakan ke parameter `unit=` yang sudah ada, bukan `?tab=`: kunci
 * `tab` sudah dipakai tab profil santri (Biodata/Akademik/…), dan menumpuk dua
 * arti pada satu kunci membuat URL tak bisa dibookmark dengan benar. Pohon
 * lembaga di bawahnya tetap hidup dan tersinkron — keduanya menulis filter sama.
 */
export function TabUnit({ pohon, f }: { pohon: PohonInduk; f: FilterInduk }) {
  // Di cabang lulusan, lembaga aktif dibaca dari `alumniUnitId` supaya tab tidak
  // padam saat operator menelusuri lulusan per lembaga.
  const aktifId = f.alumniUnitId ?? f.unitId;

  return (
    <TabLembaga
      items={pohon.unit.map((u) => ({ key: String(u.id), label: u.nama, jumlah: u.jumlah }))}
      aktif={aktifId ? String(aktifId) : undefined}
      jumlahSemua={pohon.total}
      hrefItem={(key) => {
        if (!key) return '/induk';
        const id = Number(key);
        // Navigator lembaga adalah titik awal baru: pencarian, status, jenis
        // kelamin, angkatan, kelas, lulusan, profil terpilih, dan halaman lama
        // sengaja tidak diwariskan agar tab tujuan tidak tampak kosong.
        return `/induk?unit=${id}`;
      }}
    />
  );
}
