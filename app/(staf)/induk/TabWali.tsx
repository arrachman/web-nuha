import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';

/** Tab Wali & Keluarga: relasi wali utama santri + info akses portal wali. */
export async function TabWali({ santriId }: { santriId: bigint }) {
  const santri = await prisma.santri.findUnique({ where: { id: santriId }, include: { person: true } });
  if (!santri) return null;

  // Utamakan kontak bertanda `utama`, tapi jangan menampilkan "belum ada data"
  // saat relasinya sebenarnya ada dan hanya tidak bertanda — data impor SMP
  // pernah masuk seluruhnya dengan `utama: false`.
  const relasi = await prisma.guardianRelation.findFirst({
    where: { anakId: santri.personId },
    include: { wali: true },
    orderBy: [{ utama: 'desc' }, { id: 'asc' }],
  });

  return (
    <div className="grid g2">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Wali utama</h3>
        {relasi
          ? (
            <>
              <Baris label="Nama wali" nilai={relasi.wali.fullName} />
              <Baris label="Hubungan" nilai={relasi.hubungan} />
              <Baris label="Pekerjaan" nilai={relasi.pekerjaan ?? '-'} />
              <Baris label="No. HP" nilai={relasi.wali.phone ?? '-'} terakhir />
            </>
          )
          : <Kosong pesan="Belum ada data wali yang tercatat untuk santri ini." />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 className="card-judul" style={{ marginBottom: 0 }}>Akses portal wali</h3>
        <div className="inset">
          Akun portal aktif dengan NIS <strong>{santri.nis}</strong>. Wali dapat melihat presensi, hafalan, catatan
          kesehatan, tagihan, dan riwayat izin anak.
        </div>
      </div>
    </div>
  );
}

function Baris({ label, nilai, terakhir }: { label: string; nilai: string; terakhir?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, paddingBottom: terakhir ? 0 : 9, borderBottom: terakhir ? 'none' : '1px solid var(--krem-3)' }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--teks-kuat)' }}>{nilai}</span>
    </div>
  );
}
