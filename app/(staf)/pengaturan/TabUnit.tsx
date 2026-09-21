import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { Badge, Kosong } from '@/components';

/** Baris "Label : nilai" pada kartu profil; menyembunyikan diri bila kosong. */
function Baris({ label, nilai }: { label: string; nilai?: string | number | null }) {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.7 }}>
      <span className="muted" style={{ minWidth: 118, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{nilai}</span>
    </div>
  );
}

/** Alamat detail + nama lengkap desa terpilih; jatuh ke alamat teks bila desa belum dipilih. */
function alamatTampil(alamat: string | null, region: { typeLabel: string | null; name: string; fullName: string | null } | null): string | null {
  if (!region) return alamat;
  return [alamat, region.fullName ?? `${region.typeLabel ?? ''} ${region.name}`.trim()].filter(Boolean).join(', ');
}

/** Profil yayasan induk beserta kartu profil tiap unit di bawahnya. */
export async function TabUnit() {
  const [yayasan, units] = await Promise.all([
    prisma.institutionProfile.findUnique({ where: { key: 'yayasan' }, include: { region: true } }),
    prisma.unit.findMany({
      include: {
        _count: { select: { santri: true, staff: true, kelas: true } },
        kepalaPegawai: { include: { person: { select: { fullName: true } } } },
        region: true,
      },
      orderBy: { nama: 'asc' },
    }),
  ]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {yayasan && (
        <div className="card">
          <h3 className="card-judul" style={{ marginBottom: 14 }}>Profil yayasan</h3>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {yayasan.logoPath && (
              <Image src={yayasan.logoPath} alt={`Logo ${yayasan.nama}`} width={72} height={72} style={{ objectFit: 'contain' }} />
            )}
            <div style={{ flex: 1, minWidth: 260, display: 'grid', gap: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{yayasan.nama}</div>
              {yayasan.namaArab && <div className="muted" style={{ marginBottom: 6 }}>{yayasan.namaArab}</div>}
              <Baris label="Ketua yayasan" nilai={yayasan.ketuaNama} />
              <Baris label="Pengasuh" nilai={yayasan.pengasuhNama} />
              <Baris label="Berdiri" nilai={yayasan.tahunBerdiri} />
              <Baris label="Akta" nilai={yayasan.aktaNotaris} />
              <Baris label="Alamat" nilai={alamatTampil(yayasan.alamat, yayasan.region)} />
              <Baris label="Telepon" nilai={yayasan.telepon} />
              <Baris label="Email" nilai={yayasan.email} />
              <Baris label="Rekening" nilai={yayasan.rekening} />
              <Baris label="Visi" nilai={yayasan.visi} />
              <Baris label="Misi" nilai={yayasan.misi} />
            </div>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="card"><Kosong pesan="Belum ada unit terdaftar." /></div>
      ) : (
        units.map((unit) => (
          <div className="card" key={unit.id}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {unit.logoPath && (
                <Image src={unit.logoPath} alt={`Logo ${unit.namaResmi ?? unit.nama}`} width={60} height={60} style={{ objectFit: 'contain' }} />
              )}
              <div style={{ flex: 1, minWidth: 260, display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{unit.namaResmi ?? unit.nama}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{unit.key}</span>
                  <Badge status={unit.aktif ? 'Aktif' : 'Nonaktif'} />
                </div>
                <Baris label={unit.kepalaJabatan ?? 'Kepala unit'} nilai={unit.kepalaPegawai?.person.fullName ?? unit.kepalaNama} />
                <Baris label="Jenjang" nilai={unit.jenjang} />
                <Baris label="NPSN / NSM" nilai={unit.npsn} />
                <Baris label="Akreditasi" nilai={unit.akreditasi} />
                <Baris label="Berdiri" nilai={unit.tahunBerdiri} />
                <Baris label="Alamat" nilai={alamatTampil(unit.alamat, unit.region)} />
                <Baris label="Telepon" nilai={unit.telepon} />
                <Baris label="Email" nilai={unit.email} />
                <Baris label="Deskripsi" nilai={unit.deskripsi} />
                <Baris label="Visi" nilai={unit.visi} />
                <Baris label="Misi" nilai={unit.misi} />
                <Baris
                  label="Populasi"
                  nilai={`${unit._count.santri} santri · ${unit._count.staff} pegawai · ${unit._count.kelas} kelas`}
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
