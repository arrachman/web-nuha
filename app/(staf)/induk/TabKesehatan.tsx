import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

const formatTgl = (tgl: Date) => tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const angka = (nilai: unknown, satuan: string) =>
  nilai == null ? '-' : `${Number(nilai).toString().replace(/\.00$/, '').replace('.', ',')} ${satuan}`;

/** IMT hanya bermakna kalau berat & tinggi dua-duanya terisi. */
function hitungImt(beratKg: unknown, tinggiCm: unknown) {
  if (beratKg == null || tinggiCm == null) return null;
  const berat = Number(beratKg);
  const tinggiM = Number(tinggiCm) / 100;
  if (!berat || !tinggiM) return null;
  return (berat / (tinggiM * tinggiM)).toFixed(1).replace('.', ',');
}

/** Tab Kesehatan: profil kesehatan santri + rekam medis Poskestren miliknya. */
export async function TabKesehatan({ santriId }: { santriId: bigint }) {
  const [profil, rekam] = await Promise.all([
    prisma.healthProfile.findUnique({ where: { studentId: santriId } }),
    prisma.medicalRecord.findMany({ where: { studentId: santriId }, orderBy: { date: 'desc' } }),
  ]);
  const imt = hitungImt(profil?.weightKg, profil?.heightCm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Profil kesehatan</h3>
        {!profil
          ? <Kosong pesan="Profil kesehatan santri ini belum diisi." />
          : (
            <div className="grid g2" style={{ alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Baris label="Berat badan" nilai={angka(profil.weightKg, 'kg')} />
                <Baris label="Tinggi badan" nilai={angka(profil.heightCm, 'cm')} />
                <Baris label="IMT" nilai={imt ?? '-'} />
                <Baris label="Golongan darah" nilai={profil.bloodType ?? '-'} terakhir />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Baris label="Riwayat penyakit" nilai={profil.medicalHistory ?? '-'} />
                <Baris label="Alergi" nilai={profil.allergies ?? '-'} />
                <Baris label="Kebutuhan khusus" nilai={profil.specialNeeds ?? '-'} terakhir />
              </div>
            </div>
          )}
        {profil?.notes && (
          <div className="inset">
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hijau)' }}>Catatan</div>
            <div className="muted" style={{ marginTop: 3, lineHeight: 1.6 }}>{profil.notes}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Rekam medis Poskestren</h3>
        {rekam.length === 0
          ? <Kosong pesan="Belum ada rekam medis untuk santri ini." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rekam.map((k) => (
                <div key={String(k.id)} className="inset">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hijau)' }}>{formatTgl(k.date)}{k.time ? ` · ${k.time}` : ''}</span>
                    {k.diagnosis && <span className="badge badge-merah">{k.diagnosis}</span>}
                    <span className="muted" style={{ fontSize: 12 }}>{k.officer}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--teks-2)', lineHeight: 1.6 }}>
                    <strong>Keluhan:</strong> {k.complaint}<br />
                    <strong>Terapi:</strong> {k.treatment ?? '-'}<br />
                    <strong>Tindak lanjut:</strong> {k.followUp ?? '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        <div className="alert alert-info">
          <div>Setiap catatan sakit di atas otomatis mengisi presensi akademik dan absensi jamaah pada tanggal yang sama.</div>
        </div>
      </div>
    </div>
  );
}

function Baris({ label, nilai, terakhir }: { label: string; nilai: string; terakhir?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, paddingBottom: terakhir ? 0 : 9, borderBottom: terakhir ? 'none' : '1px solid var(--krem-3)' }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--teks-kuat)', textAlign: 'right' }}>{nilai}</span>
    </div>
  );
}
