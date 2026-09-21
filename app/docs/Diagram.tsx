/**
 * Diagram alur digambar sebagai SVG inline — sama seperti bagan di modul lain,
 * tanpa dependensi tambahan, dan tetap terbaca saat halaman dicetak.
 */

const GARIS = '#e8e3d9';
const HIJAU = '#0f6b3d';
const EMAS = '#e8973a';
const TEKS = '#2f3437';
const LEMBUT = '#6b7280';

function Kotak({ x, y, w, judul, sub, warna = HIJAU }: { x: number; y: number; w: number; judul: string; sub?: string; warna?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={sub ? 56 : 40} rx={11} fill="#fff" stroke={GARIS} />
      <rect x={x} y={y} width={3.5} height={sub ? 56 : 40} rx={2} fill={warna} />
      <text x={x + 14} y={y + (sub ? 24 : 25)} fontSize="13" fontWeight="600" fill={TEKS}>{judul}</text>
      {sub && <text x={x + 14} y={y + 42} fontSize="11.5" fill={LEMBUT}>{sub}</text>}
    </g>
  );
}

function Panah({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <path d={`M${x} ${y1} L${x} ${y2 - 7}`} stroke={GARIS} strokeWidth="2" markerEnd="url(#ujung)" />;
}

function Ujung() {
  return (
    <defs>
      <marker id="ujung" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill={GARIS} />
      </marker>
    </defs>
  );
}

/** Permintaan halaman → pemeriksaan sesi → pemeriksaan hak → hasil. */
export function AlurAkses() {
  return (
    <div className="docs-diagram">
      <svg viewBox="0 0 640 384" width="100%" role="img" aria-label="Alur pemeriksaan hak akses: permintaan halaman, cek sesi, cek hak peran, lalu halaman ditampilkan atau dialihkan">
        <Ujung />
        <Kotak x={180} y={8} w={280} judul="Pengguna membuka halaman" sub="mis. /keuangan" />
        <Panah x={320} y1={48} y2={78} />

        <Kotak x={180} y={78} w={280} judul="requirePage('keuangan')" sub="berjalan di server, bukan di peramban" warna={EMAS} />
        <Panah x={320} y1={134} y2={164} />

        <Kotak x={180} y={164} w={280} judul="Ada sesi yang sah?" sub="kuki httpOnly berisi JWT" />
        <path d={`M180 184 L96 184 L96 300`} stroke={GARIS} strokeWidth="2" fill="none" markerEnd="url(#ujung)" />
        <text x={104} y={200} fontSize="11.5" fill={LEMBUT}>tidak</text>
        <Panah x={320} y1={204} y2={234} />

        <Kotak x={180} y={234} w={280} judul="Peran memegang menu ini?" sub="lewat tabel menu_peran" />
        <path d={`M460 254 L560 254 L560 300`} stroke={GARIS} strokeWidth="2" fill="none" markerEnd="url(#ujung)" />
        <text x={500} y={270} fontSize="11.5" fill={LEMBUT}>tidak</text>
        <Panah x={320} y1={274} y2={310} />

        <Kotak x={36} y={310} w={124} judul="→ /login" warna="#b91c1c" />
        <Kotak x={228} y={310} w={164} judul="Halaman tampil" warna={HIJAU} />
        <Kotak x={468} y={310} w={140} judul="→ beranda" warna="#b91c1c" />
      </svg>
    </div>
  );
}

/** Pendaftaran nomor sampai perangkat berstatus terhubung. */
export function AlurQr() {
  return (
    <div className="docs-diagram">
      <svg viewBox="0 0 640 330" width="100%" role="img" aria-label="Alur menautkan nomor WhatsApp: daftarkan nomor, gateway membuat sesi, QR tampil, dipindai dari ponsel, lalu status menjadi terhubung">
        <Ujung />
        <Kotak x={170} y={8} w={300} judul="Daftarkan nama + nomor" sub="Notifikasi WA → Perangkat" />
        <Panah x={320} y1={64} y2={92} />
        <Kotak x={170} y={92} w={300} judul="Gateway menyiapkan sesi" sub="token perangkat dibuat, disimpan di volume" warna={EMAS} />
        <Panah x={320} y1={148} y2={176} />
        <Kotak x={170} y={176} w={300} judul="Tampilkan QR" sub="berlaku beberapa detik saja" />
        <Panah x={320} y1={232} y2={260} />
        <Kotak x={170} y={260} w={300} judul="Pindai dari WhatsApp di ponsel" sub="Perangkat Tertaut → Tautkan perangkat" warna={HIJAU} />
      </svg>
      <p className="muted" style={{ marginTop: 6 }}>
        Setelah tertaut, status pada tabel berubah menjadi <b>Terhubung</b> dan kredensialnya bertahan
        melewati mulai ulang container.
      </p>
    </div>
  );
}
