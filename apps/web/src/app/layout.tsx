import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_SC } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { brandTokens } from '@/lib/brand';

import './globals.css';

const appSans = Noto_Sans_SC({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const appMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AIV Studio',
  description: 'Seko-baselined mock workflow frontend for AIV Studio.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${appSans.variable} ${appMono.variable}`}>
        <div className="site-shell">
          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
