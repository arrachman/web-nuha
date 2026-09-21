import { prisma } from '@/lib/prisma';
import { Card, Tabel, Badge, Kosong } from '@/components';

/**
 * Skema tidak punya model "evidence" per santri (portofolio bukti kompetensi) — sebagai
 * padanan yang datanya nyata, tab ini memakai TugasLms: setiap tugas adalah bukti yang
 * dikumpulkan santri untuk kompetensi pada kursus terkait, statusnya dari kolom TugasLms.status.
 */
export async function TabEvidence() {
  const tugas = await prisma.tugasLms.findMany({ include: { kursus: true }, orderBy: { deadline: 'desc' } });
  const perlu = tugas.filter((t) => t.status === 'Belum dikerjakan' || t.status === 'Draft tersimpan').length;
  const valid = tugas.filter((t) => t.status === 'Dinilai').length;

  return (
    <Card
      judul="Portofolio evidence (tugas) santri"
      sub={`${perlu} bukti masih menunggu dikerjakan/dinilai dari total ${tugas.length} bukti terkumpul, ${valid} sudah dinilai.`}
    >
      {tugas.length === 0 ? (
        <Kosong pesan="Belum ada evidence tugas tercatat." />
      ) : (
        <Tabel kolom={['Bukti', 'Kursus', 'Kode', 'Deadline', 'Status']}>
          {tugas.map((t) => (
            <tr key={t.id}>
              <td style={{ fontWeight: 600 }}>{t.judul}</td>
              <td>{t.kursus.nama}<div className="muted">{t.kursus.guru}</div></td>
              <td className="muted">{t.kode}</td>
              <td>{t.deadline.toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
              <td><Badge status={t.status} /></td>
            </tr>
          ))}
        </Tabel>
      )}
    </Card>
  );
}
