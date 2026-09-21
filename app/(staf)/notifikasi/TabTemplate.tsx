import { prisma } from '@/lib/prisma';
import { Kosong } from '@/components';
import { toggleTemplateWa } from './actions';

/** Kartu template per skenario pesan; nonaktifkan untuk menghentikan pengiriman otomatis. */
export async function TabTemplate({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const raw = searchParams.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';

  const templates = await prisma.waTemplate.findMany({
    where: q
      ? { OR: [{ title: { contains: q } }, { trigger: { contains: q } }] }
      : undefined,
    orderBy: { code: 'asc' },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <p className="muted">Nonaktifkan template untuk menghentikan pengiriman otomatisnya. Placeholder <strong>{'{nama}'}</strong> diisi sistem saat pesan dibuat.</p>
        <form method="get" style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="tab" value="template" />
          <input className="field" name="q" defaultValue={q} placeholder="Cari template / pemicu" style={{ minWidth: 220 }} />
        </form>
      </div>
      {templates.length === 0 ? (
        <Kosong pesan="Tidak ada template yang cocok dengan pencarian." />
      ) : (
        <section className="grid g2">
          {templates.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <span className="badge badge-biru">{t.role}</span>
                <span className="muted" style={{ fontSize: 11 }}>{t.code}</span>
                <div style={{ flex: 1 }} />
                <form action={toggleTemplateWa}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className={`btn ${t.isActive ? '' : 'btn-sekunder'}`} type="submit">{t.isActive ? 'Aktif' : 'Nonaktif'}</button>
                </form>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                <div className="muted" style={{ marginTop: 3 }}>Pemicu: {t.trigger}{t.schedule ? ` · ${t.schedule}` : ''}</div>
              </div>
              <div className="inset" style={{ fontSize: 12.5, lineHeight: 1.6 }}>{t.content}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
