import './globals.css';
import { LanguageProvider } from '../lib/languageContext';

export const metadata = {
  title: 'Pendulum',
  description: 'Your externalized intuition. A Personal Myth Engine that holds space for what moves through you.',
  metadataBase: new URL('https://mypendulum.co'),
  openGraph: {
    title: 'Pendulum',
    description: 'Your externalized intuition. No tracking. No streaks. Just presence.',
    url: 'https://mypendulum.co',
    siteName: 'Pendulum',
    images: [
      {
        url: 'https://mypendulum.co/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pendulum - Personal Myth Engine',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pendulum',
    description: 'Your externalized intuition. No tracking. No streaks. Just presence.',
    images: ['https://mypendulum.co/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2275%22 r=%2215%22 fill=%22%23c9a962%22/><line x1=%2250%22 y1=%2210%22 x2=%2250%22 y2=%2265%22 stroke=%22%23c9a962%22 stroke-width=%223%22/></svg>" />
      </head>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
