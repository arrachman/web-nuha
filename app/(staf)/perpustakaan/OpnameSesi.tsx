'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

export type SalinanOpname = {
  id: string;
  kode: string;
  status: string;
  kondisi: string;
  judul: string;
  rakBuku: string | null;
};

type DetektorKode = { detect: (sumber: HTMLVideoElement) => Promise<{ rawValue?: string }[]> };

const escCsv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function GrupDaftar({ judul, warna, kosong, children }: { judul: string; warna: string; kosong: string; children?: ReactNode }) {
  return (
    <div className="card">
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
        <span style={{ color: warna }}>●</span> {judul}
      </h4>
      {children ?? <p className="muted" style={{ fontSize: 13, margin: 0 }}>{kosong}</p>}
    </div>
  );
}

function BarisKode({ kode, judul, sub }: { kode: string; judul: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--garis)' }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{kode}</span>
      <span style={{ fontSize: 13 }}>{judul}</span>
      {sub && <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{sub}</span>}
    </div>
  );
}

/** Sesi stock opname satu rak: scan/ketik kode eksemplar, hasil terklasifikasi langsung. */
export function OpnameSesi({ rak, salinan }: { rak: string; salinan: SalinanOpname[] }) {
  const [scanned, setScanned] = useState<string[]>([]);
  const [inputKode, setInputKode] = useState('');
  const [pesan, setPesan] = useState('');
  const [kameraAktif, setKameraAktif] = useState(false);
  const [pesanKamera, setPesanKamera] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tambahKode = (mentah: string) => {
    const kode = mentah.trim().toUpperCase();
    if (!kode) return;
    setScanned((prev) => {
      if (prev.includes(kode)) {
        setPesan(`${kode} sudah ter-scan sebelumnya.`);
        return prev;
      }
      setPesan(salinan.some((s) => s.kode === kode) ? `${kode} tercatat.` : `${kode} tidak dikenal di katalog unit ini.`);
      return [...prev, kode];
    });
  };

  const hentikanKamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setKameraAktif(false);
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }, []);

  const mulaiKamera = async () => {
    setPesanKamera('');
    const w = window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => DetektorKode };
    if (!navigator.mediaDevices?.getUserMedia || !w.BarcodeDetector) {
      setPesanKamera('Kamera tidak tersedia di peramban ini — ketik kode eksemplar secara manual.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = stream;
      await video.play();
      const detektor = new w.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
      setKameraAktif(true);
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const hasil = await detektor.detect(videoRef.current);
          for (const h of hasil) if (h.rawValue) tambahKode(h.rawValue);
        } catch { /* frame gagal dibaca — abaikan */ }
      }, 350);
    } catch {
      setPesanKamera('Kamera tidak tersedia — ketik kode eksemplar secara manual.');
      hentikanKamera();
    }
  };

  const hasil = useMemo(() => {
    const peta = new Map(salinan.map((s) => [s.kode, s]));
    const setScan = new Set(scanned);
    const sesuai: SalinanOpname[] = [];
    const salahRak: SalinanOpname[] = [];
    const dipinjam: SalinanOpname[] = [];
    const hilangDiRak: SalinanOpname[] = [];
    const takDikenal: string[] = [];
    for (const kode of scanned) {
      const c = peta.get(kode);
      if (!c) { takDikenal.push(kode); continue; }
      if (c.rakBuku !== rak) salahRak.push(c);
      else if (c.status === 'Dipinjam') dipinjam.push(c);
      else if (c.status === 'Hilang') hilangDiRak.push(c);
      else sesuai.push(c);
    }
    const tidakDitemukan = salinan.filter(
      (s) => s.rakBuku === rak && s.status === 'Tersedia' && !setScan.has(s.kode),
    );
    return { sesuai, salahRak, dipinjam, hilangDiRak, takDikenal, tidakDitemukan };
  }, [salinan, scanned, rak]);

  const eksporCsv = () => {
    const baris: string[][] = [['kode_eksemplar', 'judul', 'rak_buku', 'status', 'kondisi', 'hasil']];
    const tambah = (s: SalinanOpname, label: string) =>
      baris.push([s.kode, s.judul, s.rakBuku ?? '', s.status, s.kondisi, label]);
    hasil.sesuai.forEach((s) => tambah(s, 'Sesuai'));
    hasil.salahRak.forEach((s) => tambah(s, 'Salah rak'));
    hasil.dipinjam.forEach((s) => tambah(s, 'Dipinjam tapi ada di rak'));
    hasil.hilangDiRak.forEach((s) => tambah(s, 'Hilang tapi ada di rak'));
    hasil.tidakDitemukan.forEach((s) => tambah(s, 'Tidak ditemukan'));
    const blob = new Blob([baris.map((r) => r.map(escCsv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-opname-${rak.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statistik = [
    { label: 'Sesuai', nilai: hasil.sesuai.length, warna: '#2e7d32', latar: '#e6f4ea' },
    { label: 'Tidak ditemukan', nilai: hasil.tidakDitemukan.length, warna: '#b3261e', latar: '#fdecea' },
    { label: 'Salah rak', nilai: hasil.salahRak.length, warna: '#9a6700', latar: '#fff4d6' },
    { label: 'Dipinjam di rak', nilai: hasil.dipinjam.length, warna: '#5e35b1', latar: '#efe9fb' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <h3 className="card-judul">Sesi opname — {rak}</h3>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
          Scan label eksemplar di rak ini (kamera atau scanner) atau ketik kodenya.
          {` ${scanned.length} kode ter-scan.`}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Input
            value={inputKode}
            onChange={(e) => setInputKode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tambahKode(inputKode); setInputKode(''); } }}
            placeholder="Ketik kode eksemplar… (mis. B0001-03)"
            aria-label="Kode eksemplar"
            style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--garis)', minWidth: 260, fontFamily: 'monospace' }}
          />
          <Button type="button" onClick={() => { tambahKode(inputKode); setInputKode(''); }}>Tambah</Button>
          {kameraAktif ? (
            <Button type="button" varian="sekunder" onClick={hentikanKamera}>Stop kamera</Button>
          ) : (
            <Button type="button" varian="sekunder" onClick={mulaiKamera}>Scan kamera</Button>
          )}
        </div>
        {pesan && <p style={{ fontSize: 12.5, marginTop: 8 }}>{pesan}</p>}
        {pesanKamera && <p style={{ fontSize: 12.5, marginTop: 8, color: 'var(--merah, #b3261e)' }}>{pesanKamera}</p>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: kameraAktif ? 'block' : 'none', width: '100%', maxWidth: 420, borderRadius: 12, marginTop: 12, background: '#000' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {statistik.map((s) => (
          <div key={s.label} className="card" style={{ background: s.latar }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: s.warna }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.warna }}>{s.nilai}</div>
          </div>
        ))}
      </div>

      <GrupDaftar judul="Tidak ditemukan" warna="#b3261e" kosong="Semua eksemplar rak ini sudah ter-scan.">
        {hasil.tidakDitemukan.length > 0 ? (
          <div>{hasil.tidakDitemukan.map((s) => <BarisKode key={s.id} kode={s.kode} judul={s.judul} sub={s.kondisi !== 'Baik' ? s.kondisi.toLowerCase() : undefined} />)}</div>
        ) : null}
      </GrupDaftar>

      <GrupDaftar judul="Salah rak" warna="#9a6700" kosong="Tidak ada eksemplar dari rak lain.">
        {hasil.salahRak.length > 0 ? (
          <div>{hasil.salahRak.map((s) => <BarisKode key={s.id} kode={s.kode} judul={s.judul} sub={`seharusnya di ${s.rakBuku ?? '-'}`} />)}</div>
        ) : null}
      </GrupDaftar>

      <GrupDaftar judul="Berstatus dipinjam tapi ada di rak" warna="#5e35b1" kosong="Tidak ada.">
        {hasil.dipinjam.length > 0 ? (
          <div>{hasil.dipinjam.map((s) => <BarisKode key={s.id} kode={s.kode} judul={s.judul} sub="perlu diproses pengembalian" />)}</div>
        ) : null}
      </GrupDaftar>

      {hasil.hilangDiRak.length > 0 && (
        <GrupDaftar judul="Berstatus hilang tapi ditemukan di rak" warna="#5e35b1" kosong="">
          <div>{hasil.hilangDiRak.map((s) => <BarisKode key={s.id} kode={s.kode} judul={s.judul} sub="perbarui status eksemplar" />)}</div>
        </GrupDaftar>
      )}

      {hasil.takDikenal.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          Kode ter-scan yang tidak ada di katalog unit ini: {hasil.takDikenal.join(', ')}.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="button" varian="sekunder" onClick={() => { setScanned([]); setInputKode(''); setPesan(''); }}>Ulangi sesi</Button>
        <Button type="button" onClick={eksporCsv}>Selesai &amp; ekspor laporan</Button>
      </div>
    </div>
  );
}
