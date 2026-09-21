import { prisma } from '@/lib/prisma';
import { Avatar, Kosong, Tabel } from '@/components';

const WARNA_LANJUT: Record<string, string> = {
  'Rujuk Puskesmas': 'badge-merah',
  'Rawat Poskestren': 'badge-kuning',
};

export async function TabRekam() {
  const rekam = await prisma.medicalRecord.findMany({
    include: { student: { include: { person: true, room: { include: { dormitory: true } } } } },
    orderBy: { date: 'desc' },
  });

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3 className="card-judul" style={{ marginBottom: 14 }}>Rekam medis santri</h3>
      {rekam.length === 0 ? <Kosong pesan="Belum ada rekam medis tercatat." /> : (
        <Tabel kolom={['Waktu', 'Pasien', 'Keluhan', 'Diagnosis', 'Terapi', 'Tindak lanjut']}>
          {rekam.map((k) => (
            <tr key={String(k.id)}>
              <td>
                {k.date.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                <div className="muted">{k.time ?? '-'}</div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <Avatar nama={k.student.person.fullName} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{k.student.person.fullName}</div>
                    <div className="muted">{k.student.room?.dormitory.name ?? '-'}</div>
                  </div>
                </div>
              </td>
              <td>{k.complaint}</td>
              <td style={{ fontWeight: 600 }}>{k.diagnosis ?? '-'}</td>
              <td>{k.treatment ?? '-'}</td>
              <td>
                {k.followUp ? <span className={`badge ${WARNA_LANJUT[k.followUp] ?? 'badge-netral'}`}>{k.followUp}</span> : '-'}
              </td>
            </tr>
          ))}
        </Tabel>
      )}
    </div>
  );
}
