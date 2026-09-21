import { prisma } from '@/lib/prisma';

const formatTgl = (tgl: Date | null) =>
  tgl ? tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

/** "Anak ke-2 dari 3 saudara"; luwes bila salah satu angkanya belum diisi. */
const formatAnakKe = (anakKe: number | null, jumlahSaudara: number | null) => {
  if (anakKe === null && jumlahSaudara === null) return '-';
  if (anakKe === null) return `dari ${jumlahSaudara} saudara`;
  if (jumlahSaudara === null) return `ke-${anakKe}`;
  return `ke-${anakKe} dari ${jumlahSaudara} saudara`;
};

/** Tab Biodata: identitas dasar dari `Orang` + peran aktifnya sebagai `Santri`. */
export async function TabBiodata({ santriId }: { santriId: bigint }) {
  const santri = await prisma.santri.findUnique({
    where: { id: santriId },
    include: {
      person: { include: { riwayatPendidikan: { include: { unit: true, academicYear: true }, orderBy: { academicYear: { code: 'desc' } } }, region: true } },
      unit: true, kelas: true, room: { include: { dormitory: true } },
    },
  });
  if (!santri) return null;

  const alamatTampil = santri.person.region
    ? [santri.person.addressLine, santri.person.region.fullName ?? `${santri.person.region.typeLabel ?? ''} ${santri.person.region.name}`.trim()]
        .filter(Boolean)
        .join(', ')
    : santri.person.addressLine ?? '-';

  const jumlahRekamMedis = await prisma.medicalRecord.count({ where: { studentId: santriId } });
  const isAktif = santri.status === 'Aktif';

  return (
    <div className="grid g2">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Identitas</h3>
        <Baris label="Nama lengkap" nilai={santri.person.fullName} />
        <Baris label="Tanggal lahir" nilai={formatTgl(santri.person.birthDate)} />
        <Baris label="Tempat lahir" nilai={santri.person.birthPlace ?? '-'} />
        <Baris label="Jenis kelamin" nilai={santri.person.gender === 'L' ? 'Putra' : 'Putri'} />
        <Baris label="NIK" nilai={santri.person.nik ?? '-'} />
        <Baris label="No. KK" nilai={santri.person.familyCardNumber ?? '-'} />
        <Baris label="Alamat" nilai={alamatTampil} />
        <Baris label="Anak ke" nilai={formatAnakKe(santri.person.birthOrder, santri.person.siblingCount)} />
        <Baris label="Hobi" nilai={santri.person.hobby ?? '-'} />
        <Baris label="Cita-cita" nilai={santri.person.aspiration ?? '-'} />
        <Baris label="No. HP" nilai={santri.person.phone ?? '-'} />
        <Baris label="Asal sekolah" nilai={santri.person.previousSchool ?? '-'} />
        <Baris label="Tahun masuk" nilai={santri.tahunMasuk ?? '-'} terakhir />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Peran aktif di yayasan</h3>
        <div className="inset">
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hijau)' }}>Unit {santri.unit?.nama ?? '-'}</div>
          <div className="muted" style={{ marginTop: 3 }}>
            Kelas {santri.kelas?.nama ?? '-'} · presensi &amp; nilai dikelola kepala unit
          </div>
        </div>
        {isAktif && (
          <div className="inset" style={{ background: '#FFFBEB', border: '1px solid #F0CFA4' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>Santri aktif</div>
            <div className="muted" style={{ marginTop: 3 }}>
              Asrama {santri.room?.dormitory.name ?? '-'} kamar {santri.room?.code ?? '-'} · program {santri.program ?? '-'}
            </div>
          </div>
        )}
        {santri.person.riwayatPendidikan.map((riwayat) => (
          <div key={String(riwayat.id)} className="inset" style={{ background: '#F5F8FF', border: '1px solid #CBD9F5' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>Riwayat pendidikan</div>
            <div className="muted" style={{ marginTop: 3 }}>
              {riwayat.status} {riwayat.unit.nama} · kelas {riwayat.kelasNama} · tahun ajaran {riwayat.academicYear.code} {riwayat.academicYear.semester}
            </div>
          </div>
        ))}
        <div className="inset" style={{ background: '#F5F8FF', border: '1px solid #CBD9F5' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>Pasien Poskestren</div>
          <div className="muted" style={{ marginTop: 3 }}>{jumlahRekamMedis} catatan pemeriksaan tercatat pada profil ini.</div>
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
