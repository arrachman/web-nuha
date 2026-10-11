import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif, filterSantriAktif } from '@/lib/unit-scope';
import { Card } from '@/components';
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
          <div className="field">
            <label htmlFor="santriId">Nama santri / pasien</label>
            <select id="santriId" name="santriId" required defaultValue="">
              <option value="" disabled>Pilih santri</option>
              {santri.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>{s.person.fullName}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="keluhan">Keluhan utama</label>
            <textarea id="keluhan" name="keluhan" rows={2} required placeholder="Contoh: gatal di sela jari, memburuk malam hari" />
          </div>
          <div className="field">
            <label htmlFor="diagnosis">Diagnosis</label>
            <input id="diagnosis" name="diagnosis" placeholder="Scabies / ISPA / Gastritis" />
          </div>
          <div className="field">
            <label htmlFor="terapi">Terapi / obat diberikan</label>
            <input id="terapi" name="terapi" placeholder="Permetrin 5% krim, paracetamol 500mg" />
          </div>
          <div className="field">
            <label htmlFor="tindakLanjut">Tindak lanjut</label>
            <select id="tindakLanjut" name="tindakLanjut" defaultValue={LANJUT_OPSI[0]}>
              {LANJUT_OPSI.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <button type="submit" className="btn">Simpan pemeriksaan</button>
        </form>
      </Card>
    </div>
  );
}
