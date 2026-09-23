/** Hidden input `_kembali` — ke mana Server Action redirect setelah selesai (lib/aksi-form.ts). */
export function Kembali({ ke }: { ke: string }) {
  return <input type="hidden" name="_kembali" value={ke} />;
}

export function BadgeKondisi({ kondisi }: { kondisi: string | null | undefined }) {
  if (!kondisi) return <span className="muted">-</span>;
  const kelas = kondisi === 'Baik' ? 'badge-hijau' : kondisi === 'RusakRingan' ? 'badge-kuning' : kondisi === 'RusakBerat' ? 'badge-merah' : 'badge-netral';
  const label = kondisi === 'RusakRingan' ? 'Rusak Ringan' : kondisi === 'RusakBerat' ? 'Rusak Berat' : kondisi;
  return <span className={`badge ${kelas}`}>{label}</span>;
}

const BADGE_STATUS: Record<string, string> = {
  Aktif: 'badge-hijau', Dipinjam: 'badge-biru', DalamPerbaikan: 'badge-kuning', TidakDipakai: 'badge-netral', MenungguPenghapusan: 'badge-oranye', Dihapus: 'badge-merah',
  Baru: 'badge-biru', Diverifikasi: 'badge-toska', Dikerjakan: 'badge-kuning', MenungguSparepart: 'badge-oranye', Selesai: 'badge-hijau', TidakBisaDiperbaiki: 'badge-merah', Ditolak: 'badge-merah',
  Diajukan: 'badge-biru', Disetujui: 'badge-toska', Dibeli: 'badge-kuning', Diterima: 'badge-hijau', Terlambat: 'badge-merah', Dikembalikan: 'badge-hijau', Batal: 'badge-netral',
  Berjalan: 'badge-kuning', Terjadwal: 'badge-biru', Terlewat: 'badge-merah', Dilaksanakan: 'badge-netral',
};

export function BadgeStatus({ status }: { status: string }) {
  const label = status.replace(/([a-z])([A-Z])/g, '$1 $2');
  return <span className={`badge ${BADGE_STATUS[status] ?? 'badge-netral'}`}>{label}</span>;
}


export { FormKeputusan } from '@/components/molecules/FormKeputusan';
