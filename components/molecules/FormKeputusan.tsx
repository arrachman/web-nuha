/**
 * Setujui/Tolak sebagai DUA form terpisah dengan hidden `keputusan` — jangan
 * andalkan name/value tombol submitter: pada Server Action berbasis fungsi,
 * nilai submitter tidak selalu ikut di FormData (terbukti: klik "Setujui"
 * tercatat sebagai Tolak). Catatan hanya diminta saat menolak.
 */
export function FormKeputusan({ action, id, kembali, labelSetuju = 'Setujui', kecil = false }: {
  action: (fd: FormData) => Promise<void>; id: string; kembali: string; labelSetuju?: string; kecil?: boolean;
}) {
  const gaya = kecil ? { fontSize: 12 } : undefined;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: kecil ? 0 : 10 }}>
      <form action={action}>
        <input type="hidden" name="_kembali" value={kembali} /><input type="hidden" name="id" value={id} /><input type="hidden" name="keputusan" value="setuju" />
        <button type="submit" className="btn" style={gaya}>{labelSetuju}</button>
      </form>
      <form action={action} style={{ display: 'flex', gap: 6 }}>
        <input type="hidden" name="_kembali" value={kembali} /><input type="hidden" name="id" value={id} /><input type="hidden" name="keputusan" value="tolak" />
        {!kecil && <input name="note" placeholder="Alasan menolak" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />}
        <button type="submit" className="btn-sekunder" style={gaya}>Tolak</button>
      </form>
    </div>
  );
}

