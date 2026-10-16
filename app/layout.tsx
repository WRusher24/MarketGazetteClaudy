import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Providers from '@/components/Providers';
import Shell from '@/components/Shell';
import { THEME_IDS } from '@/lib/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketGazette',
  description: 'Your personal stock newspaper: live news, interactive charts and an AI analyst.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

const themeScript = `try{var ids=${JSON.stringify(THEME_IDS)};var t=localStorage.getItem('mg-theme');if(ids.indexOf(t)<0)t='dark';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
