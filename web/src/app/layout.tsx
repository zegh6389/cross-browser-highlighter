import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Web Highlighter - Save and organize your highlights',
  description: 'Highlight text on any website, sync across devices, and organize your research. Free for up to 300 words.',
  keywords: ['highlighter', 'web annotation', 'research tool', 'productivity'],
  authors: [{ name: 'Web Highlighter' }],
  openGraph: {
    title: 'Web Highlighter',
    description: 'Highlight text on any website, sync across devices.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
