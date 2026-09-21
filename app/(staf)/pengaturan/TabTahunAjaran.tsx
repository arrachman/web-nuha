import { prisma } from '@/lib/prisma';

/**
 * Tahun ajaran & semester dihitung dari tanggal berjalan (tahun ajaran dimulai
 * Juli), bukan konstanta. Status PPDB ditarik dari data pendaftar riil.
 */
export async function TabTahunAjaran() {
  const now = new Date();
  const bulan = now.getMonth() + 1; // 1-12
  const tahunMulai = bulan >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const tahunAjaran = `${tahunMulai}/${tahunMulai + 1}`;
  const semester = bulan >= 7 ? 'Gasal' : 'Genap';

  const aktifPpdb = await prisma.applicant.count({ where: { status: { in: ['New', 'Verification', 'Selection'] } } });
  const periodePpdb = aktifPpdb > 0 ? `Dibuka · ${aktifPpdb} pendaftar dalam proses` : 'Ditutup sementara';

  const KARTU = [
    { label: 'Tahun ajaran', nilai: tahunAjaran },
    { label: 'Semester', nilai: semester },
    { label: 'Periode PPDB', nilai: periodePpdb },
  ];

  return (
    <div className="card">
      <h3 className="card-judul" style={{ marginBottom: 14 }}>Tahun ajaran aktif</h3>
      <div className="grid g3">
        {KARTU.map((k) => (
          <div key={k.label} className="inset">
            <div className="muted" style={{ fontSize: 11.5 }}>{k.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--hijau-gelap)', marginTop: 3 }}>{k.nilai}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
