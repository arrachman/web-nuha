'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { IkonMenu } from '@/components/atoms/IkonMenu';

type Persona = { key: string; label: string; ringkas: string };
type Entity = { key: string; label: string };
type Kelompok = { menuKey: string; label: string; icon?: string | null; items: Entity[] };

/** Kotak cari klien: menyaring kartu persona & entitas per label (dan ringkas
 * persona) tanpa memanggil server lagi — datanya sudah lengkap dari page.tsx,
 * cuma tampilannya yang disaring di browser. */
export function PencarianEntitas({ persona, kelompok }: { persona: (Persona & { icon?: string | null })[]; kelompok: Kelompok[] }) {
  const [q, setQ] = useState('');
  const kunci = q.trim().toLowerCase();

  const personaTersaring = useMemo(
    () => (kunci ? persona.filter((p) => p.label.toLowerCase().includes(kunci) || p.ringkas.toLowerCase().includes(kunci)) : persona),
    [persona, kunci],
  );
  const kelompokTersaring = useMemo(
    () => (kunci
      ? kelompok.map((g) => ({ ...g, items: g.items.filter((e) => e.label.toLowerCase().includes(kunci)) })).filter((g) => g.items.length > 0)
      : kelompok),
    [kelompok, kunci],
  );
  const tidakAda = kunci && personaTersaring.length === 0 && kelompokTersaring.length === 0;

  return (
    <>
      <div className="card" style={{ marginTop: 16 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari data yang mau dikelola…"
          aria-label="Cari entitas data"
          className="input-cari"
          style={{ width: '100%' }}
        />
      </div>

      {tidakAda && (
        <div className="card muted" style={{ marginTop: 16 }}>Tidak ada data yang cocok dengan &quot;{q}&quot;.</div>
      )}

      {personaTersaring.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IkonMenu menuKey="induk" path={personaTersaring[0].icon} size={18} />
            Data per peran
          </h4>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 12.5 }}>Pintasan satu-layar: identitas dan baris perannya dibuat sekaligus, tanpa perlu menyalin ID Orang antar menu.</p>
          <div className="grid g2">
            {personaTersaring.map((item) => (
              <Link className="card" style={{ textDecoration: 'none' }} href={`/data/${item.key}`} key={item.key}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IkonMenu menuKey="induk" path={item.icon} size={16} />
                  {item.label}
                </strong>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12.5 }}>{item.ringkas}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {kelompokTersaring.map((g) => (
        <div className="card" key={g.menuKey} style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IkonMenu menuKey={g.menuKey} path={g.icon} size={18} />
            {g.label}
          </h4>
          <div className="grid g3">
            {g.items.map((entity) => (
              <Link className="card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }} href={`/data/${entity.key}`} key={entity.key}>
                <IkonMenu menuKey={g.menuKey} path={g.icon} size={16} />
                <strong>{entity.label}</strong>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
