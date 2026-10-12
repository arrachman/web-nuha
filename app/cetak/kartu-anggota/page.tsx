import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, readSession } from '@/lib/auth';
import { satu, type SearchParams } from '@/components';
import { TombolCetak } from '../TombolCetak';

type InfoKartu = {
  nama: string;
  kode: string;
  keterangan: string;
  detail: string;
  namaUnit: string;
};

/** Halaman cetak kartu anggota perpustakaan (santri / staf), satu kartu ±85×55mm. */
export default async function KartuAnggotaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await readSession();
  if (!session) redirect('/login?next=/cetak/kartu-anggota');
  const boleh = isSuperAdmin(session)
    || (await prisma.menuRole.count({
      where: { menu: { key: 'perpustakaan' }, role: { key: { in: session.peran } } },
    })) > 0;
  if (!boleh) {
    return (
      <main style={{ padding: 24 }}>
        <div className="cetak-bar"><TombolCetak /></div>
        <p>Anda tidak berhak mencetak kartu anggota perpustakaan.</p>
      </main>
    );
  }

  const sp = await searchParams;
  const tipe = satu(sp.tipe);
  const idMentah = satu(sp.id);
  if ((tipe !== 'santri' && tipe !== 'staf') || !idMentah || !/^\d+$/.test(idMentah)) notFound();
  const id = BigInt(idMentah);

  let info: InfoKartu | null = null;
  if (tipe === 'santri') {
    const s = await prisma.santri.findUnique({
      where: { id },
      include: { person: { select: { fullName: true } }, kelas: { select: { nama: true, unit: { select: { nama: true, namaResmi: true } } } } },
    });
    if (s) {
      info = {
        nama: s.person.fullName,
        kode: s.nis ?? `SANTRI-${id}`,
        keterangan: s.nis ? `NIS ${s.nis}` : `Kode anggota SANTRI-${id}`,
        detail: s.kelas ? `Kelas ${s.kelas.nama}` : 'Santri',
        namaUnit: s.kelas?.unit?.namaResmi ?? s.kelas?.unit?.nama ?? 'Nurul Huda',
      };
    }
  } else {
    const s = await prisma.staff.findUnique({
      where: { id },
      include: { person: { select: { fullName: true } }, unit: { select: { nama: true, namaResmi: true } } },
    });
    if (s) {
      info = {
        nama: s.person.fullName,
        kode: `STAF-${id}`,
        keterangan: `Kode anggota STAF-${id} · NIP ${s.employeeNumber}`,
        detail: s.position,
        namaUnit: s.unit?.namaResmi ?? s.unit?.nama ?? 'Nurul Huda',
      };
    }
  }
  if (!info) notFound();

  const qr = await QRCode.toString(info.kode, { type: 'svg', margin: 1, width: 120 });

  return (
    <main style={{ padding: 24 }}>
      <div className="cetak-bar">
        <TombolCetak />
        <span>Kartu anggota perpustakaan — {info.nama} ({info.kode})</span>
      </div>

      <div
        style={{
          width: '85mm',
          minHeight: '55mm',
          border: '1.5px solid #0F6B3D',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: '#fff',
          color: '#1F2937',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ borderBottom: '2px solid #0F6B3D', paddingBottom: 6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, color: '#0F6B3D' }}>KARTU ANGGOTA PERPUSTAKAAN</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>{info.namaUnit}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{info.nama}</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>{info.keterangan}</div>
            <div style={{ fontSize: 11.5 }}>{info.detail}</div>
          </div>
          <div style={{ width: 84, height: 84, flex: '0 0 auto' }} dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <div style={{ fontSize: 9.5, color: '#6B7280', borderTop: '1px solid #E8E3D9', paddingTop: 5 }}>
          Kartu ini untuk peminjaman buku perpustakaan.
        </div>
      </div>
    </main>
  );
}
