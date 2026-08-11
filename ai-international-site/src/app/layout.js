import { Public_Sans, Newsreader, IBM_Plex_Mono } from 'next/font/google';

import { ThemeProvider } from 'src/theme/theme-provider';
import './globals.css';

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-public-sans',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-newsreader',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});

export const metadata = {
  title: 'AI Nexus International',
  description:
    'AI Nexus for international participants — choose your region and enter the AI Fluency programme.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.className} ${publicSans.variable} ${newsreader.variable} ${ibmPlexMono.variable}`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
