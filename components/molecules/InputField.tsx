'use client';

import type { ClientField, Row } from '@/lib/crud/types';
import { IkonOpsi } from '@/components/atoms/IkonOpsi';
import { PemilihBanyakOrang } from '@/components/molecules/PemilihBanyakOrang';
import { PemilihWilayah } from '@/components/molecules/PemilihWilayah';

const nilaiAwal = (field: ClientField, row?: Row) => {
  const raw = row?.[field.name];
  if (raw === null || raw === undefined) return '';
  if (field.type === 'date') return String(raw).slice(0, 10);
  return String(raw);
};

/** Pilihan sedikit (≤3) lebih cepat dibaca sebagai tombol daripada dropdown. */
const AMBANG_SEGMEN = 3;

/** `onPilih` dipakai form untuk menampilkan field lanjutan sesuai opsi terpilih. */
type Props = { field: ClientField; id: string; row?: Row; onPilih?: (nilai: string) => void };

/** Satu kontrol form sesuai tipe field — segmented untuk opsi sedikit, toggle untuk boolean. */
export function InputField({ field, id, row, onPilih }: Props) {
  const nilai = nilaiAwal(field, row);
  const lapor = onPilih ? (event: { target: { value: string } }) => onPilih(event.target.value) : undefined;

  if (field.type === 'orang-banyak') {
    return <PemilihBanyakOrang
      name={field.name}
      label={field.label}
      id={id}
      hint={field.hint}
      hubungan={field.hubungan ?? ['Wali']}
      placeholder={field.placeholder}
      hanyaSantri={field.hanyaSantri}
      nilaiAwal={nilai || undefined}
    />;
  }

  if (field.type === 'wilayah') {
    return <PemilihWilayah name={field.name} label={field.label} id={id} hint={field.hint} placeholder={field.placeholder} nilaiAwal={nilai || undefined} />;
  }

  if (field.type === 'pilihan-banyak' && field.options) {
    // Satu orang bisa memegang lebih dari satu peran (mis. guru yang juga wali
    // santri), jadi kontrolnya kotak centang, bukan radio.
    const terpilih = new Set(nilai.split(',').filter(Boolean));
    // Tampilannya kotak centang eksplisit, bukan segmented pill: pil bersebelahan
    // terbaca sebagai pilihan tunggal sehingga operator mengira klik = ganti,
    // padahal artinya centang/lepas.
    return <div className="centang-chip" role="group" aria-labelledby={`${id}-label`}>
      {field.options.map((option) => <label className="centang-chip-opsi" key={option} data-opsi={option}>
        <input
          type="checkbox"
          name={field.name}
          value={option}
          defaultChecked={terpilih.has(option)}
          onChange={(event) => {
            // Kotak centang ini tak terkendali (`defaultChecked`), jadi keadaan
            // terkini dibaca dari form — bukan dari Set yang ikut ter-render
            // ulang dan akan kehilangan pilihan sebelumnya.
            const form = event.target.form;
            const semua = form ? [...form.elements].filter((el): el is HTMLInputElement =>
              el instanceof HTMLInputElement && el.name === field.name && el.checked) : [];
            lapor?.({ target: { value: semua.map((el) => el.value).join(',') } });
          }}
        />
        <span>{field.optionLabels?.[option] ?? option}</span>
      </label>)}
    </div>;
  }

  if (field.type === 'boolean') {
    const aktif = row ? Boolean(row[field.name]) : true;
    return <label className="toggle">
      <input id={id} name={field.name} type="checkbox" defaultChecked={aktif} />
      <span className="toggle-jalur" aria-hidden><span className="toggle-bulat" /></span>
      <span className="toggle-teks">{field.labelYa ?? 'Aktif'}</span>
    </label>;
  }

  if (field.refOptions) {
    return <select id={id} name={field.name} required={field.required} defaultValue={nilai}>
      <option value="">Pilih…</option>
      {field.refOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>;
  }

  if (field.type === 'select' && field.options) {
    // Radio bergaya segmented: seluruh opsi terlihat sekaligus, satu klik untuk ganti.
    if (field.options.length <= AMBANG_SEGMEN) {
      // `ikonSaja` menyembunyikan teks; namanya tetap ada di title & aria-label
      // supaya tetap terbaca pembaca layar dan muncul saat hover.
      const ikonSaja = field.ikonSaja && field.optionIcons;
      return <div className={`segmen${ikonSaja ? ' segmen-ikon' : ''}`} role="radiogroup" aria-labelledby={`${id}-label`}>
        {field.options.map((option) => {
          const teks = field.optionLabels?.[option] ?? option;
          const ikon = field.optionIcons?.[option];
          return <label className="segmen-opsi" key={option} title={ikonSaja ? teks : undefined} data-opsi={option}>
            <input type="radio" name={field.name} value={option} required={field.required} defaultChecked={nilai === option} onChange={lapor} aria-label={ikonSaja ? teks : undefined} />
            <span>
              {ikon && <IkonOpsi nama={ikon} />}
              {!ikonSaja && teks}
            </span>
          </label>;
        })}
      </div>;
    }
    return <select id={id} name={field.name} required={field.required} defaultValue={nilai} onChange={lapor}>
      <option value="">Pilih…</option>
      {field.options.map((option) => <option key={option} value={option}>{field.optionLabels?.[option] ?? option}</option>)}
    </select>;
  }

  if (field.type === 'textarea') {
    return <textarea id={id} name={field.name} required={field.required} placeholder={field.placeholder} defaultValue={nilai} rows={3} />;
  }

  return <input
    id={id}
    name={field.name}
    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
    step={field.step}
    required={field.required}
    placeholder={field.placeholder}
    defaultValue={nilai}
  />;
}
