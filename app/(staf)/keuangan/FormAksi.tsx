"use client";

import { useActionState } from "react";
import type { HasilAksi } from "./aksi";

/**
 * Pembungkus form untuk server action keuangan: menampilkan pesan
 * hasil (ok/gagal) tanpa navigasi.
 */
export function FormAksi({
  action,
  children,
  tombol = "Simpan",
}: {
  action: (fd: FormData) => Promise<HasilAksi>;
  children: React.ReactNode;
  tombol?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: HasilAksi | null, fd: FormData) => action(fd),
    null,
  );
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {children}
      {state && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
            background: state.ok ? "#E9F7EF" : "#FDECEC",
            color: state.ok ? "#0F6B3D" : "#B91C1C",
          }}
        >
          {state.pesan}
          {state.ok && state.paymentId && (
            <>
              {" "}
              <a href={`/api/keuangan/kwitansi/${state.paymentId}`} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                Unduh kwitansi PDF →
              </a>
            </>
          )}
        </div>
      )}
      <div>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Menyimpan…" : tombol}
        </button>
      </div>
    </form>
  );
}
