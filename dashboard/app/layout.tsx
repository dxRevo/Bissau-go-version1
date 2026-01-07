import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bissau Go Dashboard',
  description: 'Dashboard administratif Bissau Go',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
