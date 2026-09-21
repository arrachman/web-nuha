'use client';

import { useEffect, useRef, useState } from 'react';

type Opsi = { label: string; teks: string };
type Soal = {
  id: string;
  tipe: string;
  stimulus: string | null;
  pertanyaan: string;
  bobot: number;
  opsi: Opsi[];
};

const JEDA_AUTOSAVE = 700;

/**
 * Satu soal dengan autosave. Jawaban dikirim ke route CBT setiap kali berubah
 * (didebounce), jadi peserta tidak pernah kehilangan pekerjaan bila jaringan
 * atau perangkatnya putus di tengah ujian.
 */
export function KartuSoal({
  nomor,
  pesertaId,
  soal,
  jawabanAwal,
  raguAwal,
}: {
  nomor: number;
  pesertaId: string;
  soal: Soal;
  jawabanAwal: string;
  raguAwal: boolean;
}) {
  const [jawaban, setJawaban] = useState(jawabanAwal);
  const [ragu, setRagu] = useState(raguAwal);
  const [status, setStatus] = useState<'diam' | 'menyimpan' | 'tersimpan'>('diam');
  const pertama = useRef(true);

  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    setStatus('menyimpan');
    const t = setTimeout(async () => {
      const fd = new FormData();
      fd.set('pesertaId', pesertaId);
      fd.set('soalId', soal.id);
      fd.set('jawaban', jawaban);
      if (ragu) fd.set('ragu', '1');
      await fetch('/api/cbt/jawab', { method: 'POST', body: fd }).catch(() => {});
      setStatus('tersimpan');
    }, JEDA_AUTOSAVE);
    return () => clearTimeout(t);
  }, [jawaban, ragu, pesertaId, soal.id]);

  // PGK dan Menjodohkan disimpan sebagai daftar dipisah koma.
  const jamak = soal.tipe === 'PGK';
  const terpilih = jawaban ? jawaban.split(',').map((s) => s.trim()) : [];
  const pilih = (label: string) => {
    if (!jamak) {
      setJawaban(label);
      return;
    }
    const baru = terpilih.includes(label) ? terpilih.filter((x) => x !== label) : [...terpilih, label];
    setJawaban(baru.sort().join(','));
  };

  const berpilihan = soal.opsi.length > 0;

  return (
    <div className="card" style={{ borderLeft: `4px solid ${ragu ? '#E8973A' : jawaban ? '#0F6B3D' : '#E8E3D9'}` }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-lora), serif', fontSize: 17, fontWeight: 700, color: '#0A4A2B' }}>{nomor}.</div>
        <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {soal.tipe} · {soal.bobot} poin
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11.5, color: status === 'tersimpan' ? '#0F6B3D' : '#9CA3AF' }}>
          {status === 'menyimpan' ? 'Menyimpan…' : status === 'tersimpan' ? 'Tersimpan' : ''}
        </div>
      </div>

      {soal.stimulus && (
        <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 12, background: '#FAF8F3', border: '1px solid #F0EDE4', fontSize: 13, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>
          {soal.stimulus}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: '#1F2937', whiteSpace: 'pre-wrap' }}>{soal.pertanyaan}</div>

      {berpilihan ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {soal.opsi.map((o) => {
            const aktif = terpilih.includes(o.label);
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => pilih(o.label)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `1px solid ${aktif ? '#0F6B3D' : '#E8E3D9'}`,
                  background: aktif ? 'rgba(15,107,61,.07)' : '#FFF',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  color: '#1F2937',
                }}
              >
                <span style={{ fontWeight: 700, color: aktif ? '#0F6B3D' : '#6B7280', minWidth: 18 }}>{o.label}</span>
                <span>{o.teks}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <textarea
          value={jawaban}
          onChange={(e) => setJawaban(e.target.value)}
          rows={soal.tipe === 'Esai' ? 6 : 2}
          placeholder={soal.tipe === 'Esai' ? 'Tulis jawaban Anda…' : 'Jawaban singkat'}
          style={{ marginTop: 12, width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #E8E3D9', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', userSelect: 'text' }}
        />
      )}

      <label style={{ marginTop: 12, display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: '#6B7280', cursor: 'pointer' }}>
        <input type="checkbox" checked={ragu} onChange={(e) => setRagu(e.target.checked)} />
        Tandai ragu-ragu
      </label>
    </div>
  );
}
