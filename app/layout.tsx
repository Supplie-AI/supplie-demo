import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Supplie.ai — Grounding Demo',
  description: 'Supplie.ai Grounding Demo for Zeder Corporation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
