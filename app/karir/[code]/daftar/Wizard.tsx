'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PemilihWilayah } from '@/components';
import { kirimLamaran, type ErrorsLamaran } from '@/app/karir/actions';

const LABEL_LANGKAH = ['Data Diri', 'Pendidikan & Pengalaman', 'Berkas', 'Pernyataan & Kirim'];
const KUNCI_DRAF = (code: string) => `lamaran-draf-${code}`;

type DocDef = { code: string; label: string; required: boolean; maxSizeKb: number; accept: string };

const FORM_AWAL = {
  nik: '', fullName: '', gender: 'L', birthPlace: '', birthDate: '', phone: '', email: '',
  addressLine: '', regionId: '', maritalStatus: '', lastEducation: '', major: '', institution: '',
  graduationYear: String(new Date().getFullYear() - 1), gpa: '', pesantrenHistory: '',
  quranMemorization: '', kitabAbility: '', experienceText: '', expectedSalary: '',
};

export function Wizard({ jobCode, documents }: { jobCode: string; documents: DocDef[] }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(FORM_AWAL);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ErrorsLamaran>({});
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState<{ number: string; statusToken: string } | null>(null);
  const dibukaPada = useRef(Date.now());

  // Simpan draf ke localStorage supaya calon pelamar tidak kehilangan isian
  // kalau tab tertutup tanpa sengaja (03 §4.3). Berkas TIDAK disimpan di sini.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KUNCI_DRAF(jobCode));
      if (raw) setForm((f) => ({ ...f, ...JSON.parse(raw) }));
    } catch {
      // localStorage bisa gagal (mode privat, dsb) — draf opsional, abaikan.
    }
  }, [jobCode]);
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_DRAF(jobCode), JSON.stringify(form));
    } catch {
      // lihat catatan di atas.
    }
  }, [form, jobCode]);

  function ubah(nama: keyof typeof FORM_AWAL, nilai: string) {
    setForm((f) => ({ ...f, [nama]: nilai }));
  }

  function validasiLangkah(): boolean {
    const e: ErrorsLamaran = {};
    if (step === 1) {
      if (!/^[0-9]{16}$/.test(form.nik)) e.nik = 'NIK harus 16 digit angka.';
      if (!form.fullName) e.fullName = 'Nama lengkap wajib diisi.';
      if (!form.birthPlace) e.birthPlace = 'Tempat lahir wajib diisi.';
      if (!form.birthDate) e.birthDate = 'Tanggal lahir wajib diisi.';
      if (!/^08[0-9]{8,11}$/.test(form.phone)) e.phone = 'Format HP tidak valid (08xxxxxxxxxx).';
      if (!form.addressLine) e.addressLine = 'Alamat wajib diisi.';
    }
    if (step === 2) {
      if (!form.lastEducation) e.lastEducation = 'Pendidikan terakhir wajib diisi.';
      if (!form.institution) e.institution = 'Nama institusi wajib diisi.';
      const thn = Number(form.graduationYear);
      if (!thn || thn < 1970 || thn > new Date().getFullYear() + 1) e.graduationYear = 'Tahun lulus tidak valid.';
    }
    if (step === 3) {
      const kurang = documents.filter((d) => d.required && !files[d.code]);
      if (kurang.length) e.documents = `Berkas wajib belum lengkap: ${kurang.map((d) => d.label).join(', ')}.`;
    }
    if (step === 4 && !consent) e.consent = 'Persetujuan data wajib dicentang.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function lanjut() {
    if (!validasiLangkah()) return;
    if (step === 4) {
      setMengirim(true);
      try {
        const fd = new FormData();
        fd.set('jobCode', jobCode);
        fd.set('website', ''); // honeypot — dibiarkan kosong oleh manusia
        fd.set('formOpenedAt', String(dibukaPada.current));
        Object.entries(form).forEach(([k, v]) => fd.set(k, v));
        fd.set('consent', consent ? 'on' : '');
        documents.forEach((d) => {
          const f = files[d.code];
          if (f) fd.set(`doc_${d.code}`, f);
        });
        const res = await kirimLamaran(fd);
        if (!res.ok) {
          setErrors(res.errors);
          // Server bisa menolak karena field di langkah sebelumnya (mis. NIK
          // dobel) — validasi klien di langkah itu sudah lolos, jadi pindah
          // ke langkah tempat error itu relevan supaya pesannya terlihat.
          const kunci = Object.keys(res.errors);
          const LANGKAH_1 = ['nik', 'fullName', 'gender', 'birthPlace', 'birthDate', 'phone', 'email', 'addressLine', 'regionId'];
          const LANGKAH_2 = ['lastEducation', 'institution', 'graduationYear'];
          const LANGKAH_3 = ['documents'];
          if (kunci.some((k) => LANGKAH_1.includes(k))) setStep(1);
          else if (kunci.some((k) => LANGKAH_2.includes(k))) setStep(2);
          else if (kunci.some((k) => LANGKAH_3.includes(k))) setStep(3);
          return;
        }
        setHasil({ number: res.number, statusToken: res.statusToken });
        try { localStorage.removeItem(KUNCI_DRAF(jobCode)); } catch { /* opsional */ }
      } finally {
        setMengirim(false);
      }
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function kembali() {
    setStep((s) => Math.max(1, s - 1));
    setErrors({});
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
        {LABEL_LANGKAH.map((label, i) => {
          const n = i + 1;
          const aktif = step === n;
          const selesai = step > n;
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: '100%', height: 3, borderRadius: 2, background: selesai || aktif ? '#0F6B3D' : '#E8E3D9' }} />
              <div style={{
                width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                background: aktif ? '#E8973A' : selesai ? '#0F6B3D' : '#E8E3D9',
                color: aktif ? '#0A4A2B' : selesai ? '#FAF8F3' : '#9CA3AF',
              }}>{n}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.3, color: aktif ? '#0A4A2B' : selesai ? '#0F6B3D' : '#9CA3AF' }}>{label}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        {/* Honeypot — kolom disembunyikan lewat CSS, hanya bot yang mengisinya. */}
        <input type="text" name="website" value="" onChange={() => {}} tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />

        {step === 1 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Data Diri Pelamar</h2>
            <div className="grid g2">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Nama lengkap *</label>
                <input value={form.fullName} onChange={(e) => ubah('fullName', e.target.value)} />
                {errors.fullName && <span className="error">{errors.fullName}</span>}
              </div>
              <div className="field">
                <label>NIK *</label>
                <input value={form.nik} onChange={(e) => ubah('nik', e.target.value)} placeholder="16 digit" />
                {errors.nik && <span className="error">{errors.nik}</span>}
              </div>
              <div className="field">
                <label>Jenis kelamin</label>
                <select value={form.gender} onChange={(e) => ubah('gender', e.target.value)}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="field">
                <label>Tempat lahir *</label>
                <input value={form.birthPlace} onChange={(e) => ubah('birthPlace', e.target.value)} />
                {errors.birthPlace && <span className="error">{errors.birthPlace}</span>}
              </div>
              <div className="field">
                <label>Tanggal lahir *</label>
                <input type="date" value={form.birthDate} onChange={(e) => ubah('birthDate', e.target.value)} />
                {errors.birthDate && <span className="error">{errors.birthDate}</span>}
              </div>
              <div className="field">
                <label>No. HP *</label>
                <input value={form.phone} onChange={(e) => ubah('phone', e.target.value)} placeholder="08xxxxxxxxxx" />
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>
              <div className="field">
                <label>Email</label>
                <input value={form.email} onChange={(e) => ubah('email', e.target.value)} />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Alamat *</label>
                <textarea rows={2} value={form.addressLine} onChange={(e) => ubah('addressLine', e.target.value)} />
                {errors.addressLine && <span className="error">{errors.addressLine}</span>}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <PemilihWilayah name="regionId" label="Desa atau kelurahan" hint="Domisili saat ini." onChange={(regionId) => ubah('regionId', regionId)} />
                {errors.regionId && <span className="error">{errors.regionId}</span>}
              </div>
              <div className="field">
                <label>Status perkawinan</label>
                <select value={form.maritalStatus} onChange={(e) => ubah('maritalStatus', e.target.value)}>
                  <option value="">— pilih —</option>
                  <option value="Belum Menikah">Belum Menikah</option>
                  <option value="Menikah">Menikah</option>
                  <option value="Cerai">Cerai</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Pendidikan &amp; Pengalaman</h2>
            <div className="grid g2">
              <div className="field">
                <label>Pendidikan terakhir *</label>
                <select value={form.lastEducation} onChange={(e) => ubah('lastEducation', e.target.value)}>
                  <option value="">— pilih —</option>
                  <option value="SMA/MA">SMA/MA</option>
                  <option value="D3">D3</option>
                  <option value="S1">S1</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                </select>
                {errors.lastEducation && <span className="error">{errors.lastEducation}</span>}
              </div>
              <div className="field">
                <label>Jurusan</label>
                <input value={form.major} onChange={(e) => ubah('major', e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Institusi/Universitas *</label>
                <input value={form.institution} onChange={(e) => ubah('institution', e.target.value)} />
                {errors.institution && <span className="error">{errors.institution}</span>}
              </div>
              <div className="field">
                <label>Tahun lulus *</label>
                <input value={form.graduationYear} onChange={(e) => ubah('graduationYear', e.target.value)} />
                {errors.graduationYear && <span className="error">{errors.graduationYear}</span>}
              </div>
              <div className="field">
                <label>IPK (jika ada)</label>
                <input value={form.gpa} onChange={(e) => ubah('gpa', e.target.value)} placeholder="mis. 3.50" />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Riwayat pesantren</label>
                <textarea rows={2} value={form.pesantrenHistory} onChange={(e) => ubah('pesantrenHistory', e.target.value)} placeholder="Nama pesantren & tahun, jika pernah mondok" />
              </div>
              <div className="field">
                <label>Hafalan Qur&apos;an (juz)</label>
                <input value={form.quranMemorization} onChange={(e) => ubah('quranMemorization', e.target.value)} />
              </div>
              <div className="field">
                <label>Kemampuan kitab kuning</label>
                <input value={form.kitabAbility} onChange={(e) => ubah('kitabAbility', e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Pengalaman kerja/mengajar</label>
                <textarea rows={3} value={form.experienceText} onChange={(e) => ubah('experienceText', e.target.value)} />
              </div>
              <div className="field">
                <label>Ekspektasi gaji (Rp)</label>
                <input value={form.expectedSalary} onChange={(e) => ubah('expectedSalary', e.target.value)} placeholder="opsional" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Unggah Berkas</h2>
            <p className="muted" style={{ marginTop: 0 }}>Format {`JPEG/PNG/PDF`}, sesuai batas ukuran tiap berkas.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {documents.map((d) => {
                const f = files[d.code];
                return (
                  <div key={d.code} style={{ border: `1px solid ${f ? '#A7D8B8' : '#E8E3D9'}`, borderRadius: 12, padding: '14px 16px', background: f ? '#F4FAF5' : '#FCFBF7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{d.label} {d.required ? '*' : '(opsional)'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>Maks {Math.round(d.maxSizeKb / 1024) || 1} MB · {d.accept}</div>
                      </div>
                      <input
                        type="file"
                        accept={d.accept.split(',').map((a) => `.${a.trim()}`).join(',')}
                        data-testid={`doc-${d.code}`}
                        onChange={(e) => setFiles((s) => ({ ...s, [d.code]: e.target.files?.[0] ?? null }))}
                      />
                    </div>
                    {f && <div style={{ fontSize: 12, color: '#0F6B3D', marginTop: 6 }}>Terlampir: {f.name} ({Math.round(f.size / 1024)} KB)</div>}
                  </div>
                );
              })}
            </div>
            {errors.documents && <div className="error" style={{ marginTop: 8 }}>{errors.documents}</div>}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Pernyataan &amp; Kirim</h2>
            <div style={{ border: '1px solid #E8E3D9', borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
              {[
                ['Nama lengkap', form.fullName || '—'],
                ['NIK', form.nik || '—'],
                ['HP', form.phone || '—'],
                ['Pendidikan terakhir', `${form.lastEducation || '—'} — ${form.institution || '—'} (${form.graduationYear})`],
                ['Berkas terlampir', `${Object.values(files).filter(Boolean).length} dari ${documents.length}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid #F4F1E8', background: '#FCFBF7' }}>
                  <span style={{ flex: '0 0 190px', fontSize: 13, color: '#6B7280' }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#2F3437' }}>{v}</span>
                </div>
              ))}
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} data-testid="consent" />
              <span>Saya menyatakan data yang diisi benar dan menyetujui data ini diproses untuk keperluan seleksi rekrutmen.</span>
            </label>
            {errors.consent && <div className="error" style={{ marginTop: 8 }}>{errors.consent}</div>}
            {errors.form && <div className="error" style={{ marginTop: 8 }}>{errors.form}</div>}

            {hasil && (
              <div style={{ marginTop: 18, padding: 18, borderRadius: 14, background: '#EFF9F2', border: '1px solid #A7D8B8' }}>
                <div style={{ fontWeight: 700, color: '#0F6B3D', fontSize: 15, marginBottom: 6 }}>Lamaran terkirim</div>
                <div style={{ fontSize: 13.5, color: '#256B45', lineHeight: 1.6 }}>
                  Nomor lamaran Anda: <strong data-testid="hasil-number">{hasil.number}</strong><br />Simpan nomor ini untuk mengecek status seleksi.
                </div>
                <Link href={`/karir/status?number=${encodeURIComponent(hasil.number)}`} className="btn" style={{ marginTop: 14, display: 'inline-block' }}>
                  Cek status sekarang
                </Link>
              </div>
            )}
          </div>
        )}

        {!hasil && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 26, paddingTop: 20, borderTop: '1px solid #F0EDE4' }}>
            <button type="button" className="btn-sekunder" onClick={kembali} disabled={step === 1 || mengirim}>Kembali</button>
            <button type="button" className="btn" onClick={lanjut} disabled={mengirim} data-testid="tombol-lanjut">
              {step === 4 ? (mengirim ? 'Mengirim…' : 'Kirim Lamaran') : 'Lanjut'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
