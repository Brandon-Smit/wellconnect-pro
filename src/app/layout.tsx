import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import React from 'react';
import { Providers } from './providers';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WellConnect Pro',
  description: 'Ethical Mental Health Outreach Platform',
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
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Providers>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Header />
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
