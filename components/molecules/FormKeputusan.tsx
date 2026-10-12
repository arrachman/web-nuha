import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

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
        <Input type="hidden" name="_kembali" value={kembali} /><Input type="hidden" name="id" value={id} /><Input type="hidden" name="keputusan" value="setuju" />
        <Button type="submit" style={gaya}>{labelSetuju}</Button>
      </form>
      <form action={action} style={{ display: 'flex', gap: 6 }}>
        <Input type="hidden" name="_kembali" value={kembali} /><Input type="hidden" name="id" value={id} /><Input type="hidden" name="keputusan" value="tolak" />
        {!kecil && <Input name="note" placeholder="Alasan menolak" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--garis)' }} />}
        <Button type="submit" varian="sekunder" style={gaya}>Tolak</Button>
      </form>
    </div>
  );
}

