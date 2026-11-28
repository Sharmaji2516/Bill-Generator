import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfirmationModalProvider } from '@/contexts/ConfirmationModalContext';
import { BusinessProvider } from '@/contexts/BusinessContext';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'ChittorTech Billing | Multi-Business GST & Enterprise Invoicing',
  description:
    'Enterprise multi-business billing, GST tax invoicing, quotations, payment tracking, and financial analytics platform for ChittorTech, Mewari Achaar, and Visit Chittorgarh.',
  applicationName: 'ChittorTech Billing',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-[100dvh] bg-[#F5F8FC] text-[#334155] antialiased">
        <AuthProvider>
          <ConfirmationModalProvider>
            <BusinessProvider>{children}</BusinessProvider>
          </ConfirmationModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

