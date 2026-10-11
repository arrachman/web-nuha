"use client";

import { useState } from "react";

/** Tombol salin teks (untuk rekap WhatsApp). */
export function TombolSalin({ teks, label = "Salin teks WA" }: { teks: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(teks);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          setOk(false);
        }
      }}
    >
      {ok ? "Tersalin ✓" : label}
    </button>
  );
}
