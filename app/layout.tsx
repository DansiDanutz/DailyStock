import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const sans = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'DailyStock — Daily Stock & Crypto Decision Dashboard',
  description:
    'Daily AI-style decision cards for top stocks and crypto: momentum scores, trend reads, support/resistance zones and trading-discipline tips. Educational only — not financial advice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
