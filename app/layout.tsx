import type { Metadata } from 'next';
import { Fraunces, Inter, Noto_Serif_Bengali } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['400', '500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700', '800'] });
const notoBn = Noto_Serif_Bengali({ subsets: ['bengali'], variable: '--font-noto-bn', weight: ['500', '700'] });

export const metadata: Metadata = {
  title: 'বিদ্যাঙ্গন — Biddyangon | Education Management System',
  description: 'Multi-institute education management platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${notoBn.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
