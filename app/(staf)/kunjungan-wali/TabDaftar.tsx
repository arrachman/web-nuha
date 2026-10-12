import { prisma } from '@/lib/prisma';
import { readSession } from '@/lib/auth';
import { getUnitAktif, filterSantriAktif } from '@/lib/unit-scope';
import { Button, Card, FormField, Input, Select, Textarea } from '@/components';
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
  const session = await readSession();
  const unitAktif = session ? await getUnitAktif(session) : null;
  const santri = await prisma.santri.findMany({
    where: { status: 'Aktif', ...(unitAktif != null ? { unitId: unitAktif } : {}) },
    include: { person: true },
    orderBy: { nis: 'asc' },
    take: 200,
  });
  const tglOpsi = ahadTerdekat(4);

  return (
    <Card judul="Pendaftaran kunjungan" sub="Diisi petugas TU atau wali via portal. Konfirmasi otomatis dikirim melalui WhatsApp.">
      <form action={daftarkanKunjungan} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        <div className="grid g2">
          <FormField label="Nama wali / tamu" htmlFor="wali">
            <Input id="wali" name="wali" placeholder="Bpk. Rahmat Hidayat" required />
          </FormField>
          <FormField label="Hubungan dengan santri" htmlFor="hubungan">
            <Input id="hubungan" name="hubungan" placeholder="Ayah / Ibu / Wali" />
          </FormField>
          <FormField label="Santri yang dikunjungi" htmlFor="santriId">
            <Select id="santriId" name="santriId" required>
              <option value="">Pilih santri</option>
              {santri.map((s) => <option key={String(s.id)} value={String(s.id)}>{s.person.fullName} · {s.nis}</option>)}
            </Select>
          </FormField>
          <FormField label="Tanggal kunjungan (Ahad)" htmlFor="tgl">
            <Select id="tgl" name="tgl" required>
              {tglOpsi.map((d) => <option key={d.toISOString()} value={d.toISOString().slice(0, 10)}>{d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
            </Select>
          </FormField>
          <FormField label="Jam kedatangan" htmlFor="jam">
            <Select id="jam" name="jam" required>
              {JAM_OPSI.map((j) => <option key={j} value={j}>{j}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Keperluan" htmlFor="keperluan">
          <Textarea id="keperluan" name="keperluan" rows={2} placeholder="Menengok, konsultasi hafalan, ambil rapor, dll." />
        </FormField>
        <Button type="submit" style={{ alignSelf: 'flex-start' }}>Daftarkan kunjungan</Button>
      </form>
    </Card>
  );
}
