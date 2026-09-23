/** Halaman siap cetak (label QR, KIR) — tanpa shell staf supaya hasil print bersih. */
export default function CetakLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cetak">
      <style>{`
        .cetak { background: #fff; min-height: 100vh; padding: 18px; color: #111; }
        .cetak-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
        @media print { .cetak-bar { display: none; } .cetak { padding: 0; } @page { size: A4; margin: 8mm; } }
      `}</style>
      {children}
    </div>
  );
}
