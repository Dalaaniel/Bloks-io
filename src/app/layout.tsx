import type { Metadata } from 'next';
import './globals.css';
import { InventoryProvider } from '@/context/inventory-context';
import Header from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Tetris Canvas',
  description: 'A creative canvas for your Tetris blocks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <InventoryProvider>
          <div className="flex flex-col h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Toaster />
          </div>
        </InventoryProvider>
      </body>
    </html>
  );
}
