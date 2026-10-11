import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif, filterSantriAktif } from '@/lib/unit-scope';
import { Kosong } from '@/components';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];
const SHIFT = '16.00–21.00';

/**
 * Tidak ada model "Piket" tersendiri di skema. Jadwal piket kader Santri Husada
 * diturunkan dari santri Mukim per asrama (data real), dirotasi 2 nama per hari
 * secara deterministik — bukan angka statis dari prototype.
 */
export async function TabPiket() {
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const santri = await prisma.santri.findMany({
    where: { status: 'Aktif', room: { isNot: null }, ...(unitAktif != null ? { unitId: unitAktif } : {}) },
    include: { person: true, room: { include: { dormitory: true } } },
    orderBy: { person: { fullName: 'asc' } },
  });

  const perAsrama = new Map<string, typeof santri>();
  santri.forEach((s) => {
    const nama = s.room!.dormitory.name;
    perAsrama.set(nama, [...(perAsrama.get(nama) ?? []), s]);
  });

  const piket: Array<{ hari: string; kader: string; asrama: string }> = [];
  for (const [asrama, anggota] of perAsrama) {
    for (let i = 0; i < anggota.length; i += 2) {
      const pasangan = anggota.slice(i, i + 2).map((s) => s.person.fullName).join(' · ');
      piket.push({ hari: HARI[(i / 2) % HARI.length], kader: pasangan, asrama });
    }
  }
  piket.sort((a, b) => HARI.indexOf(a.hari) - HARI.indexOf(b.hari));

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 className="card-judul" style={{ marginBottom: 4 }}>Jadwal piket kader Santri Husada</h3>
      <p className="card-sub" style={{ marginBottom: 14 }}>{santri.length} santri aktif mendampingi perawat pada sore hingga malam, dirotasi per asrama.</p>
      {piket.length === 0 ? <Kosong pesan="Belum ada santri aktif dengan kamar untuk dijadwalkan." /> : (
        <div className="grid g2">
          {piket.map((p, i) => (
            <div key={`${p.hari}-${p.asrama}-${i}`} className="inset" style={{ display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 62, textAlign: 'center', padding: '6px 0', borderRadius: 9, background: '#F1F7F3', color: '#0F6B3D', fontSize: 12, fontWeight: 700 }}>
                {p.hari}
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.kader}</div>
                <div className="muted">{SHIFT} · asrama {p.asrama}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
