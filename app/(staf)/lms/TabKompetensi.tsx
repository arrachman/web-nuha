import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Kosong, ProgressBar } from '@/components';

/**
 * Skema tidak punya model "unit kompetensi" tersendiri — tiap KursusLms diperlakukan
 * sebagai satu unit kompetensi, dan tiap MateriLms di dalamnya sebagai elemen
 * kompetensinya (kriteria unjuk kerja = status materi, bukti = tugas pada kursus itu).
 */
export async function TabKompetensi({ kom }: { kom?: string }) {
  const kursus = await prisma.kursusLms.findMany({ orderBy: { nama: 'asc' } });
  if (kursus.length === 0) return <Kosong pesan="Belum ada unit kompetensi." />;

  const selId = kom && kursus.some((k) => String(k.id) === kom) ? kom : String(kursus[0].id);
  const sel = kursus.find((k) => String(k.id) === selId)!;
  const [elemen, tugasSel] = await Promise.all([
    prisma.materiLms.findMany({ where: { kursusId: sel.id }, orderBy: { tgl: 'asc' } }),
    prisma.tugasLms.findMany({ where: { kursusId: sel.id } }),
  ]);
  const pct = sel.modul > 0 ? Math.round((sel.selesai / sel.modul) * 100) : 0;

  return (
    <div className="grid g2" style={{ gridTemplateColumns: '340px 1fr', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {kursus.map((k) => {
          const kPct = k.modul > 0 ? Math.round((k.selesai / k.modul) * 100) : 0;
          const aktif = String(k.id) === selId;
          return (
            <Link
              key={k.id}
              href={`/lms?tab=kompetensi&kom=${k.id}`}
              className="card"
              style={{
                textDecoration: 'none', color: 'inherit', padding: 15, display: 'flex',
                flexDirection: 'column', gap: 8,
                borderColor: aktif ? 'var(--hijau-gelap)' : undefined,
                background: aktif ? 'var(--krem)' : undefined,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{k.nama}</div>
              <div className="muted">{k.guru} · {k.modul} elemen kompetensi</div>
              <ProgressBar pct={kPct} />
              <div className="muted">{k.selesai}/{k.modul} tercapai · {kPct}%</div>
            </Link>
          );
        })}
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <span className="badge badge-hijau">Nilai rata-rata {sel.nilai}</span>
        </div>
        <h3 className="card-judul">{sel.nama}</h3>
        <p className="card-sub">
          {sel.guru} · tercapai {sel.selesai} dari {sel.modul} elemen ({pct}%) · {tugasSel.length} bukti tugas terkait
        </p>
        <div className="label" style={{ marginTop: 10, marginBottom: 10 }}>Elemen kompetensi &amp; status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {elemen.length === 0 ? (
            <Kosong pesan="Belum ada elemen (materi) untuk kompetensi ini." />
          ) : (
            elemen.map((e, i) => (
              <div key={e.id} className="inset">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span className="badge badge-hijau">Elemen {i + 1}</span>
                  <div style={{ flex: 1, minWidth: 180, fontWeight: 600 }}>{e.judul}</div>
                  <span className="badge">{e.status}</span>
                </div>
                <div className="muted" style={{ marginTop: 8 }}>
                  <strong>Tipe bukti:</strong> {e.tipe} · <strong>tanggal:</strong> {e.tgl.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
