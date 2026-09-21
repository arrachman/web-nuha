export function Kosong({ pesan = 'Tidak ada data yang cocok dengan filter.' }: { pesan?: string }) {
  return <p className="empty">{pesan}</p>;
}
