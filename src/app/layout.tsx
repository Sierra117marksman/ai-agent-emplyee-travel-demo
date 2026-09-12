import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Wanderlust Journeys | Luxury Handcrafted Escapes & Private Villas',
  description:
    'Discover curated private villa escapes, honeymoon journeys, and bespoke expeditions. Chat with Arjun Patel, your autonomous senior travel specialist, and secure your dates with a ₹2,000 booking token.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}>
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
