import { prisma } from '@/lib/prisma';
import { Card, Avatar, Kosong } from '@/components';
import { hitungGaji, rupiah } from '@/lib/gaji';

/** Slip cetak untuk satu pegawai; pegawai dipilih lewat query ?peg=id. */
export async function TabSlip({
  searchParams,
  periode,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  periode: string;
}) {
  const pegawai = await prisma.staff.findMany({ include: { person: true, unit: true, salaryComponent: true }, orderBy: { employeeNumber: 'asc' } });
  if (pegawai.length === 0) return <Kosong pesan="Belum ada data pegawai." />;

  const raw = searchParams.peg;
  const pegId = (Array.isArray(raw) ? raw[0] : raw) ?? String(pegawai[0].id);
  const pilihan = pegawai.find((p) => String(p.id) === pegId) ?? pegawai[0];
  const komponen = pilihan.salaryComponent;
  const h = hitungGaji(komponen);
  const slip = await prisma.paySlip.findUnique({ where: { staffId_period: { staffId: pilihan.id, period: periode } } });

  const penerimaan = komponen
    ? [
        { label: 'Gaji pokok', v: Number(komponen.baseSalary) },
        { label: 'Tunjangan jabatan', v: Number(komponen.positionAllowance) },
        { label: 'Tunjangan keluarga', v: Number(komponen.familyAllowance) },
        { label: `Jam mengajar (${komponen.teachingHours} jam)`, v: komponen.teachingHours * Number(komponen.hourlyRate) },
        { label: 'Transport', v: Number(komponen.transport) },
      ]
    : [];
  const deduction = komponen
    ? [
        { label: 'BPJS', v: Number(komponen.bpjs) },
        { label: 'Koperasi', v: Number(komponen.cooperative) },
        { label: 'PPh 21', v: Number(komponen.incomeTax) },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <form method="get" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <input type="hidden" name="tab" value="slip" />
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="peg">Pilih pegawai</label>
            <select id="peg" name="peg" defaultValue={String(pilihan.id)}>
              {pegawai.map((p) => <option key={String(p.id)} value={String(p.id)}>{p.person.fullName}</option>)}
            </select>
          </div>
          <button className="btn" type="submit">Tampilkan slip</button>
        </form>
      </Card>

      <div className="card" style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div className="card-judul" style={{ marginBottom: 2 }}>PPSS Nurul Huda Mergosono</div>
            <div className="muted">Jl. Kol. Sugiono 3B No.103, Mergosono · Jawa Timur</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted">Slip Gaji</div>
            <div className="card-judul" style={{ marginBottom: 0 }}>{periode}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 16, marginBottom: 16, borderBottom: '1px dashed var(--garis)' }}>
          <Avatar nama={pilihan.person.fullName} size={46} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{pilihan.person.fullName}</div>
            <div className="muted">{pilihan.position} · unit {pilihan.unit?.nama ?? 'Yayasan'}</div>
          </div>
          <div className="muted" style={{ textAlign: 'right' }}>
            <div>NIP: <strong>{pilihan.employeeNumber}</strong></div>
            <div>Status: <strong>{slip?.status ?? 'Belum terbit'}</strong></div>
          </div>
        </div>
        <div className="grid g2">
          <div>
            <p className="label" style={{ color: '#0F6B3D', marginBottom: 10 }}>A. Penerimaan</p>
            {penerimaan.map((x) => (
              <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '7px 0', borderBottom: '1px solid var(--krem-3)' }}>
                <span className="muted">{x.label}</span><span style={{ fontWeight: 600 }}>{rupiah(x.v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 10 }}>
              <strong>Total penerimaan</strong><strong style={{ color: '#0F6B3D' }}>{rupiah(h.bruto)}</strong>
            </div>
          </div>
          <div>
            <p className="label" style={{ color: '#B91C1C', marginBottom: 10 }}>B. Potongan</p>
            {deduction.map((x) => (
              <div key={x.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '7px 0', borderBottom: '1px solid var(--krem-3)' }}>
                <span className="muted">{x.label}</span><span style={{ fontWeight: 600 }}>{rupiah(x.v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 10 }}>
              <strong>Total potongan</strong><strong style={{ color: '#B91C1C' }}>{rupiah(h.potongan)}</strong>
            </div>
          </div>
        </div>
        <div className="inset" style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          <div>
            <p className="label">Dibayarkan (A − B)</p>
            <p className="angka-sm" style={{ color: '#0F6B3D' }}>{rupiah(h.netto)}</p>
          </div>
          <div className="muted" style={{ textAlign: 'right' }}>
            <div>Rekening: <strong>{pilihan.bankAccount ?? '-'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
