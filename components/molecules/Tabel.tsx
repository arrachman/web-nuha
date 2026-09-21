import type { ReactNode } from 'react';

export function Tabel({ kolom, children }: { kolom: Array<string | { label: string; num?: boolean }>; children: ReactNode }) {
  return (
    <div className="tabel-wrap">
      <table>
        <thead>
          <tr>
            {kolom.map((k) => {
              const label = typeof k === 'string' ? k : k.label;
              const num = typeof k === 'string' ? false : k.num;
              return <th key={label} className={num ? 'num' : undefined}>{label}</th>;
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
