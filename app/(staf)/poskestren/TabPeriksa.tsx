import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif, filterSantriAktif } from '@/lib/unit-scope';
import { Button, Card, FormField, Input, Select, Textarea } from '@/components';
import { simpanPeriksa } from './actions';

const LANJUT_OPSI = ['Istirahat di kamar', 'Rawat Poskestren', 'Rujuk Puskesmas'];

export async function TabPeriksa() {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const santri = await prisma.santri.findMany({
    where: { status: 'Aktif', ...(unitAktif != null ? { unitId: unitAktif } : {}) },
    include: { person: true },
    orderBy: { person: { fullName: 'asc' } },
  });

  return (
    <div style={{ marginTop: 16 }}>
      <Card judul="Form pemeriksaan pasien" sub="Hasil pemeriksaan langsung menulis baris baru pada rekam medis santri.">
        <form action={simpanPeriksa}>
          <FormField label="Nama santri / pasien" htmlFor="santriId">
            <Select id="santriId" name="santriId" required defaultValue="">
              <option value="" disabled>Pilih santri</option>
              {santri.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Keluhan utama" htmlFor="keluhan">
            <Textarea id="keluhan" name="keluhan" rows={2} required placeholder="Contoh: gatal di sela jari, memburuk malam hari" />
          </FormField>
          <FormField label="Diagnosis" htmlFor="diagnosis">
            <Input id="diagnosis" name="diagnosis" placeholder="Scabies / ISPA / Gastritis" />
          </FormField>
          <FormField label="Terapi / obat diberikan" htmlFor="terapi">
            <Input id="terapi" name="terapi" placeholder="Permetrin 5% krim, paracetamol 500mg" />
          </FormField>
          <FormField label="Tindak lanjut" htmlFor="tindakLanjut">
            <Select id="tindakLanjut" name="tindakLanjut" defaultValue={LANJUT_OPSI[0]}>
              {LANJUT_OPSI.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FormField>
          <Button type="submit">Simpan pemeriksaan</Button>
        </form>
      </Card>
    </div>
  );
}
