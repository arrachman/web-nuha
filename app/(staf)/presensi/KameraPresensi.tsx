'use client';

import { useEffect, useRef, useState } from 'react';
import { presensiDiri, type HasilPresensiDiri } from './actions';

type Posisi = { lat: number; lng: number; akurasi: number };

/**
 * Check-in/out selfie (02 §3.2): kamera depan langsung lewat getUserMedia —
 * TIDAK ada pilihan unggah dari galeri. Foto dikompres di browser (≤ 720 px,
 * JPEG) lalu dikirim bersama koordinat GPS; waktu & overlay dibuat server.
 */
export function KameraPresensi({ jenis, pemberitahuanPertama }: { jenis: 'masuk' | 'pulang'; pemberitahuanPertama: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState('');
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [pratinjau, setPratinjau] = useState('');
  const [perluAlasan, setPerluAlasan] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [hasil, setHasil] = useState<HasilPresensiDiri | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [setuju, setSetuju] = useState(!pemberitahuanPertama);

  useEffect(() => {
    if (!setuju) return;
    let batal = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 } }, audio: false });
        if (batal) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined); }
        setSiap(true);
      } catch {
        setGalat('Kamera tidak bisa dibuka. Izinkan akses kamera di browser (butuh HTTPS).');
      }
    })();
    navigator.geolocation?.getCurrentPosition(
      (p) => setPosisi({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }),
      () => setGalat((g) => g || 'Lokasi tidak bisa dibaca. Izinkan akses lokasi (GPS) di browser.'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
    return () => { batal = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [setuju]);

  function ambil() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const skala = Math.min(1, 720 / v.videoWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * skala);
    c.height = Math.round(v.videoHeight * skala);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => { if (b) { setFoto(b); setPratinjau(URL.createObjectURL(b)); } }, 'image/jpeg', 0.7);
  }

  async function kirim() {
    if (!foto) return;
    if (!posisi) { setGalat('Menunggu lokasi GPS… pastikan izin lokasi diberikan.'); return; }
    setMengirim(true);
    const fd = new FormData();
    fd.set('foto', new File([foto], 'selfie.jpg', { type: 'image/jpeg' }));
    fd.set('lat', String(posisi.lat));
    fd.set('lng', String(posisi.lng));
    fd.set('akurasi', String(posisi.akurasi));
    if (alasan) fd.set('alasan', alasan);
    const r = await presensiDiri(fd);
    setMengirim(false);
    setHasil(r);
    if (r.perluAlasan) setPerluAlasan(true);
    if (r.ok) { streamRef.current?.getTracks().forEach((t) => t.stop()); setTimeout(() => window.location.reload(), 1200); }
  }

  if (!setuju) {
    return (
      <div className="alert alert-info" data-testid="pemberitahuan-pdp">
        <span>
          <b>Pemberitahuan data pribadi</b>
          Foto wajah dan lokasi Anda direkam hanya untuk keperluan presensi (UU 27/2022 tentang PDP). Foto disimpan 90 hari lalu dihapus; yang dapat melihat hanya Anda, kepala unit, SDM, dan ketua yayasan.
          <br /><button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => setSetuju(true)}>Saya mengerti, buka kamera</button>
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
      {galat && <div className="alert alert-kritis" role="alert" data-testid="galat-kamera"><span>{galat}</span></div>}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#111', aspectRatio: '3 / 4' }}>
        {/* video tetap ter-mount supaya stream tidak hilang saat "Ulangi" */}
        <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: pratinjau ? 'none' : 'block' }} data-testid="video-kamera" />
        {pratinjau && <img src={pratinjau} alt="Pratinjau selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div className="muted" style={{ fontSize: 12 }} data-testid="status-gps">
        {posisi ? `GPS: akurasi ±${Math.round(posisi.akurasi)} m` : 'Membaca lokasi GPS…'}
      </div>
      {perluAlasan && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="alasan-luar">Alasan di luar lokasi *</label>
          <input id="alasan-luar" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. dinas luar ke Kemenag" />
        </div>
      )}
      {hasil && <div className={`alert ${hasil.ok ? 'alert-sukses' : 'alert-peringatan'}`} data-testid="hasil-presensi"><span>{hasil.pesan}</span></div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {!pratinjau ? (
          <button type="button" className="btn" onClick={ambil} disabled={!siap} style={{ flex: 1 }}>Ambil foto</button>
        ) : (
          <>
            <button type="button" className="btn-sekunder" onClick={() => { setFoto(null); setPratinjau(''); setHasil(null); }} disabled={mengirim}>Ulangi</button>
            <button type="button" className="btn" onClick={kirim} disabled={mengirim || (perluAlasan && !alasan.trim())} style={{ flex: 1 }}>
              {mengirim ? 'Mengirim…' : jenis === 'masuk' ? 'Kirim check-in' : 'Kirim check-out'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
