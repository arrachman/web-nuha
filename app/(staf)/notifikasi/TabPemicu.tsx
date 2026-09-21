import { prisma } from '@/lib/prisma';
import { rupiah } from '@/lib/gaji';
import { Kosong } from '@/components';
import { kirimPemicu } from './actions';

type Baris = { code: string; judul: string; detail: string; target: string; nomor: string; tujuan: string; isi: string };

/** Ambil kontak wali utama seorang santri, jatuh ke HP santri sendiri bila tidak ada. */
async function kontakWali(santriId: bigint, orangId: bigint, fallbackNama: string, fallbackHp: string | null) {
  const relasi = await prisma.guardianRelation.findFirst({
    where: { anakId: orangId },
    include: { wali: true },
    orderBy: [{ utama: 'desc' }, { id: 'asc' }],
  });
  if (relasi) return { nama: relasi.wali.fullName, hp: relasi.wali.phone ?? fallbackHp ?? '' };
  return { nama: fallbackNama, hp: fallbackHp ?? '' };
}

/** Pemicu siap kirim yang dibangkitkan dari kondisi nyata di modul lain: tagihan jatuh tempo, izin menunggu, dan slip gaji baru terbit. */
export async function TabPemicu() {
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const [invoices, izin, slip] = await Promise.all([
    prisma.invoice.findMany({
      where: { dueDate: { lt: hariIni } },
      include: { santri: { include: { person: true } } },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    prisma.leavePermit.findMany({
      where: { status: 'Pending' },
      include: { student: { include: { person: true } } },
      orderBy: { departedAt: 'desc' },
      take: 8,
    }),
    prisma.paySlip.findMany({
      where: { status: 'Terbit', paidAt: null },
      include: { staff: { include: { person: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const baris: Baris[] = [];

  for (const t of invoices) {
    const sisa = Number(t.amount) - Number(t.paidAmount);
    if (sisa <= 0) continue;
    const kontak = await kontakWali(t.santriId, t.santri.personId, t.santri.person.fullName, t.santri.person.phone);
    baris.push({
      code: t.code,
      judul: `Tagihan ${t.type} jatuh tempo`,
      detail: `${t.santri.person.fullName} · periode ${t.period} · sisa ${rupiah(sisa)}`,
      target: `${kontak.nama} (wali)`,
      nomor: kontak.hp,
      tujuan: kontak.nama,
      isi: `Assalamu'alaikum, tagihan ${t.type} periode ${t.period} atas nama ${t.santri.person.fullName} sebesar ${rupiah(sisa)} telah jatuh tempo. Mohon segera dilunasi.`,
    });
  }

  for (const i of izin) {
    const kontak = await kontakWali(i.studentId, i.student.personId, i.student.person.fullName, i.student.person.phone);
    baris.push({
      code: i.code,
      judul: `Pengajuan izin ${i.type} menunggu verifikasi`,
      detail: `${i.student.person.fullName} · ${i.reason}`,
      target: `${kontak.nama} (wali)`,
      nomor: kontak.hp,
      tujuan: kontak.nama,
      isi: `Assalamu'alaikum, pengajuan izin ${i.type} untuk ${i.student.person.fullName} sedang menunggu verifikasi pengasuh.`,
    });
  }

  for (const s of slip) {
    baris.push({
      code: `SLP-${s.id}`,
      judul: 'Slip gaji baru terbit',
      detail: `${s.staff.person.fullName} · periode ${s.period} · netto ${rupiah(Number(s.netAmount))}`,
      target: `${s.staff.person.fullName} (pegawai)`,
      nomor: s.staff.person.phone ?? '',
      tujuan: s.staff.person.fullName,
      isi: `Assalamu'alaikum, slip gaji periode ${s.period} atas nama ${s.staff.person.fullName} telah terbit dengan netto ${rupiah(Number(s.netAmount))}.`,
    });
  }

  return (
    <div className="card">
      <h3>Pemicu siap kirim dari data hari ini</h3>
      <p className="muted" style={{ marginBottom: 14 }}>Setiap baris dibangkitkan dari kondisi nyata di modul lain: tagihan, izin, dan penggajian.</p>
      {baris.length === 0 ? (
        <Kosong pesan="Tidak ada pemicu yang menunggu dikirim saat ini." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {baris.map((b) => (
            <div key={b.code} className="inset" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 88, flex: '0 0 auto', fontSize: 11, fontWeight: 700, color: '#0F6B3D' }}>{b.code}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{b.judul}</div>
                <div className="muted">{b.detail}</div>
              </div>
              <div className="muted" style={{ minWidth: 170 }}>{b.target}</div>
              <form action={kirimPemicu}>
                <input type="hidden" name="nomor" value={b.nomor} />
                <input type="hidden" name="tujuan" value={b.tujuan} />
                <input type="hidden" name="isi" value={b.isi} />
                <button className="btn" type="submit" disabled={!b.nomor}>Kirim WA</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
