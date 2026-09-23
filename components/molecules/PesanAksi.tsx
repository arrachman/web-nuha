/** Tampilkan hasil Server Action dari query `?pesan=` / `?galat=` (lihat lib/aksi-form.ts). */
export function PesanAksi({ pesan, galat }: { pesan?: string; galat?: string }) {
  if (!pesan && !galat) return null;
  return (
    <div className={`alert ${galat ? 'alert-kritis' : 'alert-sukses'}`} role={galat ? 'alert' : 'status'} data-testid={galat ? 'galat-aksi' : 'pesan-aksi'} style={{ marginBottom: 14 }}>
      <span>{galat ?? pesan}</span>
    </div>
  );
}
