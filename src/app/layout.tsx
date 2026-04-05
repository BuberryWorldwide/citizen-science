import type { Metadata, Viewport } from 'next';
import { SessionProvider } from '@/components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buberry Citizen Science',
  description: 'Track and monitor trees with AI species identification, seasonal phenology quests, and community verification. Citizen science for regenerative agroforestry.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Buberry Citizen Science',
    description: 'Track trees with AI species ID, seasonal quests, and community verification. Citizen science for agroforestry.',
    url: 'https://citizen.buberryworldwide.com',
    siteName: 'Buberry Worldwide',
    type: 'website',
    images: [{ url: 'https://citizen.buberryworldwide.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buberry Citizen Science',
    description: 'Track trees with AI species ID, seasonal quests, and community verification.',
    images: ['https://citizen.buberryworldwide.com/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// Inline script to set theme before first paint — prevents flash
const themeScript = `(function(){try{var t=localStorage.getItem('buberry-theme');if(!t)t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
