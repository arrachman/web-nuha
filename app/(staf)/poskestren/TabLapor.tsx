import { prisma } from '@/lib/prisma';

const AMBANG_KLB = 3;

export async function TabLapor() {
  const rekam = await prisma.medicalRecord.findMany({
    include: { student: { include: { room: { include: { dormitory: true } } } } },
  });

  const totalKunjungan = rekam.length;
  const diagCount = new Map<string, number>();
  rekam.forEach((k) => { if (k.diagnosis) diagCount.set(k.diagnosis, (diagCount.get(k.diagnosis) ?? 0) + 1); });
  const [diagnosisTerbanyak, kasusTerbanyak] = [...diagCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
  const rujukan = rekam.filter((k) => k.followUp === 'Rujuk Puskesmas').length;

  const klbMap = new Map<string, number>();
  rekam.forEach((k) => {
    const asrama = k.student.room?.dormitory.name;
    if (!asrama || !k.diagnosis) return;
    const key = `${k.diagnosis}|${asrama}`;
    klbMap.set(key, (klbMap.get(key) ?? 0) + 1);
  });
  const dugaanKlb = [...klbMap.values()].filter((n) => n >= AMBANG_KLB).length;
  const bulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 className="card-judul">Laporan bulanan ke Puskesmas</h3>
        <p className="card-sub">Periode {bulanIni} · disusun otomatis dari rekam medis Poskestren.</p>
      </div>
      <div className="grid g4">
        <div className="inset">
          <div className="label">Total kunjungan</div>
          <div className="angka-sm">{totalKunjungan}</div>
        </div>
        <div className="inset">
          <div className="label">Kasus {diagnosisTerbanyak} (terbanyak)</div>
          <div className="angka-sm" style={{ color: '#B91C1C' }}>{kasusTerbanyak}</div>
        </div>
        <div className="inset">
          <div className="label">Rujukan Puskesmas</div>
          <div className="angka-sm" style={{ color: '#9A3412' }}>{rujukan}</div>
        </div>
        <div className="inset">
          <div className="label">Dugaan KLB</div>
          <div className="angka-sm" style={{ color: '#B91C1C' }}>{dugaanKlb}</div>
        </div>
      </div>
      <p className="alert alert-info">
        Rekomendasi sistem: pantau tren diagnosis {diagnosisTerbanyak} lebih lanjut, pastikan stok obat terkait mencukupi,
        dan jadwalkan penyuluhan kebersihan pribadi oleh kader Santri Husada bila kasus terus meningkat.
      </p>
    </div>
  );
}
