'use client';

export function TombolCetak() {
  return <button type="button" className="btn" onClick={() => window.print()}>Cetak</button>;
}
