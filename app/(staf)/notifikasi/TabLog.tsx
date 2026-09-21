import { prisma } from '@/lib/prisma';
import { Card, Tabel, Kosong, Badge } from '@/components';
import { WaTestForm } from '@/components/WaTestForm';

/** Log pengiriman WA, difilter per peran lewat query ?role=. Form kirim uji tetap dipertahankan apa adanya. */
export async function TabLog({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const raw = searchParams.role;
  const role = (Array.isArray(raw) ? raw[0] : raw) ?? '';

  const [templates, roles, logs] = await Promise.all([
    prisma.waTemplate.findMany({ orderBy: { code: 'asc' } }),
    prisma.waTemplate.findMany({ select: { role: true }, distinct: ['role'] }),
    prisma.waLog.findMany({
      where: role ? { template: { role } } : undefined,
      include: { template: true },
      orderBy: { sentAt: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <WaTestForm templates={templates.filter((t) => t.isActive).map((t) => ({ kode: t.code, judul: t.title }))} />
      <Card judul={`Log pengiriman ${role ? `— filter peran: ${role}` : ''}`} sub="Pesan yang Anda kirim dari tab &ldquo;Pemicu Otomatis&rdquo; akan muncul di baris teratas.">
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="hidden" name="tab" value="log" />
          <select className="field" name="role" defaultValue={role} style={{ minWidth: 200 }}>
            <option value="">Semua peran</option>
            {roles.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
          </select>
          <button className="btn btn-sekunder" type="submit">Terapkan</button>
        </form>
        {logs.length === 0 ? (
          <Kosong pesan="Belum ada log pengiriman." />
        ) : (
          <Tabel kolom={['Waktu', 'Peran', 'Penerima', 'Isi pesan', 'Status']}>
            {logs.map((l) => (
              <tr key={String(l.id)}>
                <td>{l.sentAt.toLocaleString('id-ID')}<div className="muted">{l.template?.code ?? '-'}</div></td>
                <td>{l.template?.role ?? '-'}</td>
                <td>{l.recipient}<div className="muted">{l.phone}</div></td>
                <td style={{ maxWidth: 380 }}>{l.content}</td>
                <td><Badge status={l.status} /></td>
              </tr>
            ))}
          </Tabel>
        )}
      </Card>
    </div>
  );
}
