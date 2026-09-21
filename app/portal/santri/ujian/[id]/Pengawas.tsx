'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Pengawasan sisi klien. Ini lapisan pencegah, bukan pengaman: server tetap
 * yang menghitung pelanggaran dan membekukan sesi. Yang dikerjakan di sini
 * hanya mendeteksi lalu melapor — persis daftar proteksi Ruang Ujian:
 * pindah aplikasi/tab, keluar fullscreen, salin/tempel, dan split screen.
 */
export function Pengawas({
  pesertaId,
  batas,
  sudah,
  selesaiIso,
}: {
  pesertaId: string;
  batas: number;
  sudah: number;
  selesaiIso: string;
}) {
  const [sisa, setSisa] = useState<number>(() => Math.max(0, Math.floor((new Date(selesaiIso).getTime() - Date.now()) / 1000)));
  const [pesan, setPesan] = useState<string | null>(null);
  // Melapor lewat ref agar handler tidak dibuat ulang dan laporan tidak dobel.
  const dikirim = useRef(0);

  useEffect(() => {
    const lapor = async (jenis: string, detail: string) => {
      dikirim.current += 1;
      setPesan(`${detail} — tercatat sebagai pelanggaran (${sudah + dikirim.current}/${batas}).`);
      const fd = new FormData();
      fd.set('pesertaId', pesertaId);
      fd.set('jenis', jenis);
      fd.set('detail', detail);
      await fetch('/api/cbt/pelanggaran', { method: 'POST', body: fd }).catch(() => {});
    };

    const onBlur = () => lapor('PINDAH_TAB', 'Anda berpindah ke aplikasi atau tab lain');
    const onVisible = () => {
      if (document.visibilityState === 'hidden') lapor('PINDAH_TAB', 'Halaman ujian ditinggalkan');
    };
    const onFs = () => {
      if (!document.fullscreenElement) lapor('KELUAR_FULLSCREEN', 'Anda keluar dari mode layar penuh');
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      lapor('TEMPEL_TEKS', 'Percobaan menempel teks dari luar');
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      lapor('SALIN_TEKS', 'Percobaan menyalin naskah soal');
    };
    // Jendela yang menyusut drastis menandakan split screen atau floating app.
    const onResize = () => {
      if (window.innerWidth < screen.width * 0.6) lapor('SPLIT_SCREEN', 'Layar terbagi dengan aplikasi lain');
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('paste', onPaste);
    document.addEventListener('copy', onCopy);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('copy', onCopy);
      window.removeEventListener('resize', onResize);
    };
  }, [pesertaId, batas, sudah]);

  useEffect(() => {
    const t = setInterval(() => setSisa((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Waktu habis: muat ulang supaya server menutup akses dan menyegel jawaban.
  useEffect(() => {
    if (sisa === 0) window.location.reload();
  }, [sisa]);

  const menit = String(Math.floor(sisa / 60)).padStart(2, '0');
  const detik = String(sisa % 60).padStart(2, '0');
  const mendesak = sisa < 300;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            fontFamily: 'var(--font-lora), serif',
            fontSize: 26,
            fontWeight: 700,
            color: mendesak ? '#B91C1C' : '#0A4A2B',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {menit}:{detik}
        </div>
        <button
          type="button"
          className="btn btn-sekunder"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
        >
          Layar penuh
        </button>
      </div>
      {pesan && <div className="alert alert-kritis">{pesan}</div>}
    </div>
  );
}
