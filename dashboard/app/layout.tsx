import type { Metadata } from 'next';
import './globals.css';
import { Outfit } from 'next/font/google';
import Providers from '@/components/Providers';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Restaurant Dashboard — Order Management',
  description: 'Manage your restaurant menu, orders, and kitchen operations in real-time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
