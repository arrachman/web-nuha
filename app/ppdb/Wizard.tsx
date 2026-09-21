'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PemilihWilayah } from '@/components';
import { daftarPpdb, type PayloadDaftarPpdb } from './actions';

const LABEL_LANGKAH = ['Data Diri', 'Asal Sekolah', 'Unit & Program', 'Berkas', 'Ringkasan'];
const UNIT_DEFS = [
  { key: 'SMP', nama: 'SMP Nurul Huda Mergosono', desc: 'Kelas 7–9, Kurikulum Merdeka, 12 rombel.' },
  { key: 'MA', nama: 'MA Nurul Huda Mergosono', desc: 'Kelas 10–12, jurusan IPA / IPS / Keagamaan.' },
  { key: 'Pondok', nama: 'Pondok Pesantren (mukim)', desc: 'Tahfidz atau Kitab Kuning, asrama terpisah putra/putri.' },
];
const BERKAS_DEFS = [
  { nama: 'Akta Kelahiran', ket: 'PDF/JPG maks 2 MB · wajib' },
  { nama: 'Kartu Keluarga', ket: 'PDF/JPG maks 2 MB · wajib' },
  { nama: 'Ijazah / SKL', ket: 'PDF maks 2 MB · wajib' },
  { nama: 'Foto 3x4 latar merah', ket: 'JPG maks 1 MB' },
  { nama: 'Surat Keterangan Sehat', ket: 'Khusus calon santri aktif' },
];

const FORM_AWAL = {
  nama: '', nisn: '', jk: 'L', tempatLahir: '', tglLahir: '', alamat: '', regionId: '',
  wali: '', hp: '', asalSekolah: '', kabSekolah: '', tahunLulus: '2026',
  nilaiRapor: '', pernahMondok: 'Belum', jurusan: '-', programPondok: '-',
};

type Errors = Partial<Record<string, string>>;

export function Wizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(FORM_AWAL);
  const [pickUnit, setPickUnit] = useState<Record<string, boolean>>({});
  const [berkas, setBerkas] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [mengirim, setMengirim] = useState(false);
  const [hasil, setHasil] = useState<{ noReg: string } | null>(null);

  function ubah(nama: string, nilai: string) {
    setForm((f) => ({ ...f, [nama]: nilai }));
  }

  /** Mirror validasi server di actions.ts — untuk umpan balik instan, bukan sumber kebenaran. */
  function validasiLangkah(): boolean {
    const e: Errors = {};
    if (step === 1) {
      if (!form.nama) e.nama = 'Nama lengkap wajib diisi.';
      if (!form.nisn) e.nisn = 'NISN wajib diisi.';
      else if (!/^[0-9]{10}$/.test(form.nisn)) e.nisn = 'NISN harus 10 digit angka.';
      if (!form.tglLahir) e.tglLahir = 'Tanggal lahir wajib diisi.';
      if (!form.wali) e.wali = 'Nama wali wajib diisi.';
      if (!form.hp) e.hp = 'No. HP wali wajib diisi.';
      else if (!/^08[0-9]{8,11}$/.test(form.hp)) e.hp = 'Format HP tidak valid (08xxxxxxxxxx).';
    }
    if (step === 2 && !form.asalSekolah) e.asalSekolah = 'Sekolah asal wajib diisi.';
    if (step === 3 && Object.keys(pickUnit).filter((k) => pickUnit[k]).length === 0) e.unit = 'Pilih minimal satu unit.';
    if (step === 4) {
      const wajib = ['Akta Kelahiran', 'Kartu Keluarga', 'Ijazah / SKL'];
      const kurang = wajib.filter((w) => !berkas[w]);
      if (kurang.length) e.berkas = `Berkas wajib belum lengkap: ${kurang.join(', ')}.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function lanjut() {
    if (!validasiLangkah()) return;
    if (step === 5) {
      setMengirim(true);
      const payload: PayloadDaftarPpdb = { ...form, pickUnit, berkas };
      try {
        const res = await daftarPpdb(payload);
        if (!res.ok) { setErrors(res.errors); return; }
        setHasil({ noReg: res.noReg });
      } finally {
        setMengirim(false);
      }
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  }

  function kembali() {
    setStep((s) => Math.max(1, s - 1));
    setErrors({});
  }

  const unitTerpilih = Object.keys(pickUnit).filter((k) => pickUnit[k]);

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
        {step === 1 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Data Diri Calon Santri</h2>
            <div className="grid g2">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Nama lengkap *</label>
                <input value={form.nama} onChange={(e) => ubah('nama', e.target.value)} placeholder="Sesuai akta kelahiran" />
                {errors.nama && <span className="error">{errors.nama}</span>}
              </div>
              <div className="field">
                <label>NISN *</label>
                <input value={form.nisn} onChange={(e) => ubah('nisn', e.target.value)} placeholder="10 digit" />
                {errors.nisn && <span className="error">{errors.nisn}</span>}
              </div>
              <div className="field">
                <label>Jenis kelamin</label>
                <select value={form.jk} onChange={(e) => ubah('jk', e.target.value)}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="field">
                <label>Tempat lahir</label>
                <input value={form.tempatLahir} onChange={(e) => ubah('tempatLahir', e.target.value)} placeholder="Kabupaten Malang" />
              </div>
              <div className="field">
                <label>Tanggal lahir *</label>
                <input type="date" value={form.tglLahir} onChange={(e) => ubah('tglLahir', e.target.value)} />
                {errors.tglLahir && <span className="error">{errors.tglLahir}</span>}
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Alamat</label>
                <textarea rows={2} value={form.alamat} onChange={(e) => ubah('alamat', e.target.value)} placeholder="Dusun, desa, kecamatan, kabupaten" />
              </div>
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <PemilihWilayah
                  name="regionId"
                  label="Desa atau kelurahan"
                  hint="Pilih desa atau kelurahan domisili dari daftar."
                  onChange={(regionId) => ubah('regionId', regionId)}
                />
                {errors.regionId && <span className="error">{errors.regionId}</span>}
              </div>
              <div className="field">
                <label>Nama wali *</label>
                <input value={form.wali} onChange={(e) => ubah('wali', e.target.value)} placeholder="Bpk. / Ibu" />
                {errors.wali && <span className="error">{errors.wali}</span>}
              </div>
              <div className="field">
                <label>No. HP wali *</label>
                <input value={form.hp} onChange={(e) => ubah('hp', e.target.value)} placeholder="08xxxxxxxxxx" />
                {errors.hp && <span className="error">{errors.hp}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Asal Sekolah</h2>
            <div className="grid g2">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Nama sekolah asal *</label>
                <input value={form.asalSekolah} onChange={(e) => ubah('asalSekolah', e.target.value)} placeholder="SD / MI / SMP / MTs" />
                {errors.asalSekolah && <span className="error">{errors.asalSekolah}</span>}
              </div>
              <div className="field">
                <label>Kabupaten/Kota sekolah</label>
                <input value={form.kabSekolah} onChange={(e) => ubah('kabSekolah', e.target.value)} placeholder="Malang" />
              </div>
              <div className="field">
                <label>Tahun lulus</label>
                <select value={form.tahunLulus} onChange={(e) => ubah('tahunLulus', e.target.value)}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
              <div className="field">
                <label>Rata-rata nilai rapor</label>
                <input value={form.nilaiRapor} onChange={(e) => ubah('nilaiRapor', e.target.value)} placeholder="mis. 84.5" />
              </div>
              <div className="field">
                <label>Pernah mondok?</label>
                <select value={form.pernahMondok} onChange={(e) => ubah('pernahMondok', e.target.value)}>
                  <option value="Belum">Belum pernah</option>
                  <option value="Pernah">Pernah</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Pilih Unit &amp; Program</h2>
            <p className="muted" style={{ marginTop: 0 }}>Boleh memilih sekolah saja, mondok saja, atau keduanya.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {UNIT_DEFS.map((u) => {
                const on = !!pickUnit[u.key];
                return (
                  <div
                    key={u.key}
                    role="checkbox"
                    aria-checked={on}
                    aria-label={u.nama}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPickUnit((s) => ({ ...s, [u.key]: !s[u.key] })); } }}
                    onClick={() => setPickUnit((s) => ({ ...s, [u.key]: !s[u.key] }))}
                    style={{
                      border: `1.5px solid ${on ? '#0F6B3D' : '#E8E3D9'}`, background: on ? '#F4FAF5' : '#FCFBF7',
                      borderRadius: 14, padding: '16px 18px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'start',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, flex: '0 0 20px', borderRadius: 6, marginTop: 2,
                      border: `1.5px solid ${on ? '#0F6B3D' : '#CFC8B6'}`, background: on ? '#0F6B3D' : '#FFFFFF',
                      display: 'grid', placeItems: 'center',
                    }}>
                      {on && (
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0A4A2B' }}>{u.nama}</div>
                      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{u.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.unit && <div className="error" style={{ marginTop: 8 }}>{errors.unit}</div>}
            <div className="grid g2" style={{ marginTop: 18 }}>
              <div className="field">
                <label>Jurusan (khusus MA)</label>
                <select value={form.jurusan} onChange={(e) => ubah('jurusan', e.target.value)}>
                  <option value="-">— tidak memilih MA —</option>
                  <option value="IPA">IPA</option>
                  <option value="IPS">IPS</option>
                  <option value="Keagamaan">Keagamaan</option>
                </select>
              </div>
              <div className="field">
                <label>Program pondok</label>
                <select value={form.programPondok} onChange={(e) => ubah('programPondok', e.target.value)}>
                  <option value="-">— tidak mondok —</option>
                  <option value="Tahfidz">Tahfidz Al-Qur&apos;an</option>
                  <option value="Kitab">Kitab Kuning</option>
                  <option value="Reguler">Reguler (diniyah)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Unggah Berkas</h2>
            <p className="muted" style={{ marginTop: 0 }}>Simulasi unggah — klik untuk menandai berkas sudah dilampirkan.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BERKAS_DEFS.map((b) => {
                const on = !!berkas[b.nama];
                return (
                  <div
                    key={b.nama}
                    role="checkbox"
                    aria-checked={on}
                    aria-label={b.nama}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBerkas((s) => ({ ...s, [b.nama]: !s[b.nama] })); } }}
                    onClick={() => setBerkas((s) => ({ ...s, [b.nama]: !s[b.nama] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderRadius: 12, padding: '14px 16px',
                      border: `1px solid ${on ? '#A7D8B8' : '#E8E3D9'}`, background: on ? '#F4FAF5' : '#FCFBF7',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2F3437' }}>{b.nama}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{b.ket}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: on ? '#0F6B3D' : '#9CA3AF' }}>{on ? 'Terlampir' : 'Belum'}</span>
                  </div>
                );
              })}
            </div>
            {errors.berkas && <div className="error" style={{ marginTop: 8 }}>{errors.berkas}</div>}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ marginTop: 0 }}>Ringkasan Pendaftaran</h2>
            <div style={{ border: '1px solid #E8E3D9', borderRadius: 14, overflow: 'hidden' }}>
              {[
                ['Nama lengkap', form.nama || '—'],
                ['NISN', form.nisn || '—'],
                ['Jenis kelamin', form.jk === 'P' ? 'Perempuan' : 'Laki-laki'],
                ['Tempat & tanggal lahir', `${form.tempatLahir || '—'}, ${form.tglLahir || '—'}`],
                ['Alamat', form.alamat || '—'],
                ['Wali', `${form.wali || '—'} · ${form.hp || '—'}`],
                ['Asal sekolah', `${form.asalSekolah || '—'} (${form.tahunLulus})`],
                ['Rata-rata rapor', form.nilaiRapor || '—'],
                ['Unit dipilih', unitTerpilih.length ? unitTerpilih.join(' + ') : '—'],
                ['Jurusan MA', form.jurusan],
                ['Program pondok', form.programPondok],
                ['Berkas terlampir', `${Object.keys(berkas).filter((k) => berkas[k]).length} dari 5`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: '1px solid #F4F1E8', background: '#FCFBF7' }}>
                  <span style={{ flex: '0 0 190px', fontSize: 13, color: '#6B7280' }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#2F3437' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="alert alert-peringatan" style={{ marginTop: 18 }}>
              Dengan mengirim formulir ini, wali menyatakan data yang diisi benar dan bersedia mengikuti tata tertib pondok.
            </div>
            {hasil && (
              <div style={{ marginTop: 18, padding: 18, borderRadius: 14, background: '#EFF9F2', border: '1px solid #A7D8B8' }}>
                <div style={{ fontWeight: 700, color: '#0F6B3D', fontSize: 15, marginBottom: 6 }}>Pendaftaran terkirim</div>
                <div style={{ fontSize: 13.5, color: '#256B45', lineHeight: 1.6 }}>
                  Nomor pendaftaran Anda: <strong>{hasil.noReg}</strong><br />Simpan nomor ini untuk mengecek status seleksi.
                </div>
                <Link href={`/cek-status?noReg=${encodeURIComponent(hasil.noReg)}`} className="btn" style={{ marginTop: 14, display: 'inline-block' }}>
                  Cek status sekarang
                </Link>
              </div>
            )}
          </div>
        )}

        {!hasil && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 26, paddingTop: 20, borderTop: '1px solid #F0EDE4' }}>
            <button type="button" className="btn-sekunder" onClick={kembali} disabled={step === 1 || mengirim}>Kembali</button>
            <button type="button" className="btn" onClick={lanjut} disabled={mengirim}>
              {step === 5 ? (mengirim ? 'Mengirim…' : 'Kirim Pendaftaran') : 'Lanjut'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
