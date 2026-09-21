import { prisma } from '@/lib/prisma';
import { Card } from '@/components';
import { daftarkanKunjungan } from './actions';

const JAM_OPSI = ['09.00', '10.00', '11.00', '13.00', '14.00', '15.00'];

/** 4 hari Ahad terdekat — jadwal kunjungan umum berlaku setiap Ahad. */
function ahadTerdekat(n: number) {
  const hasil: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (hasil.length < n) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) hasil.push(new Date(cursor));
  }
  return hasil;
}

/** Form pendaftaran kunjungan — menulis baris Kunjungan berstatus menunggu verifikasi. */
export async function TabDaftar() {
  const santri = await prisma.santri.findMany({
    where: { status: 'Aktif' },
    include: { person: true },
    orderBy: { nis: 'asc' },
    take: 200,
  });
  const tglOpsi = ahadTerdekat(4);

  return (
    <Card judul="Pendaftaran kunjungan" sub="Diisi petugas TU atau wali via portal. Konfirmasi otomatis dikirim melalui WhatsApp.">
      <form action={daftarkanKunjungan} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        <div className="grid g2">
          <div className="field">
            <label htmlFor="wali">Nama wali / tamu</label>
            <input id="wali" name="wali" placeholder="Bpk. Rahmat Hidayat" required />
          </div>
          <div className="field">
            <label htmlFor="hubungan">Hubungan dengan santri</label>
            <input id="hubungan" name="hubungan" placeholder="Ayah / Ibu / Wali" />
          </div>
          <div className="field">
            <label htmlFor="santriId">Santri yang dikunjungi</label>
            <select id="santriId" name="santriId" required>
              <option value="">Pilih santri</option>
              {santri.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName} · {s.nis}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tgl">Tanggal kunjungan (Ahad)</label>
            <select id="tgl" name="tgl" required>
              {tglOpsi.map((d) => <option key={d.toISOString()} value={d.toISOString().slice(0, 10)}>{d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="jam">Jam kedatangan</label>
            <select id="jam" name="jam" required>
              {JAM_OPSI.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="keperluan">Keperluan</label>
          <textarea id="keperluan" name="keperluan" rows={2} placeholder="Menengok, konsultasi hafalan, ambil rapor, dll." />
        </div>
        <button className="btn" type="submit" style={{ alignSelf: 'flex-start' }}>Daftarkan kunjungan</button>
      </form>
    </Card>
  );
}
