import { AuthGate } from '@/components/auth-gate';
import { themeInitScript } from '@/lib/theme-init-script';
import type { Metadata, Viewport } from 'next';
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
  title: 'Student Day Tracker',
  description:
    'Daily activity tracker for students — timeline, calendar history, and insights. Sign in with Google to sync across devices; works offline. Installable PWA.',
  applicationName: 'Student Day Tracker',
  appleWebApp: {
    capable: true,
    title: 'Day Tracker',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline script is required to run before hydration to prevent theme FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
