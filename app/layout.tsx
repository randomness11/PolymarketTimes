import type { Metadata } from "next";
import { UnifrakturMaguntia, Playfair_Display, EB_Garamond } from "next/font/google";
import "./globals.css";
import { ReadableModeProvider } from "./components/ReadableModeProvider";

const unifraktur = UnifrakturMaguntia({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-unifraktur',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "The Polymarket Times",
  description: "Tomorrow's news today. The world's premier prediction market chronicle.",
  metadataBase: new URL('https://polymarkettimes.com'),
  openGraph: {
    title: "The Polymarket Times",
    description: "Tomorrow's news today. The world's premier prediction market chronicle.",
    url: 'https://polymarkettimes.com',
    siteName: 'The Polymarket Times',
    images: [
      {
        url: '/api/og?edition=latest',
        width: 1200,
        height: 630,
        alt: 'The Polymarket Times',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Polymarket Times",
    description: "Tomorrow's news today. The world's premier prediction market chronicle.",
    images: ['/api/og?edition=latest'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${unifraktur.variable} ${playfair.variable} ${garamond.variable} font-serif bg-[#f4f1ea] text-[#1a1a1a]`}>
        <ReadableModeProvider>
          {children}
        </ReadableModeProvider>
      </body>
    </html>
  );
}
