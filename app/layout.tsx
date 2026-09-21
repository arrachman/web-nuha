import type { Metadata } from 'next';
import { Lora, Plus_Jakarta_Sans, Amiri } from 'next/font/google';
import './globals.css';

// Tiga muka huruf yang dipakai prototype: Lora untuk judul & angka besar,
// Plus Jakarta Sans untuk seluruh UI, Amiri khusus dua wordmark Arab.
const lora = Lora({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-lora', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta', display: 'swap' });
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });

export const metadata: Metadata = {
  title: 'SIMTERPADU | Nurul Huda Mergosono',
  description: 'Sistem Informasi Manajemen Terpadu Yayasan Pendidikan Islam Nurul Huda Mergosono.',
  icons: {
    icon: '/assets/logo-nuha-favicon.webp',
    shortcut: '/assets/logo-nuha-favicon.webp',
    apple: '/assets/logo-nuha-favicon.webp',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${lora.variable} ${jakarta.variable} ${amiri.variable}`}>
      <body>{children}</body>
    </html>
  );
}
