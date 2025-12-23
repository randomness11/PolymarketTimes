import type { Metadata } from "next";
import { UnifrakturMaguntia, Playfair_Display, EB_Garamond } from "next/font/google";
import "./globals.css";

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
  title: "Polymarket Times",
  description: "Market insights and predictions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${unifraktur.variable} ${playfair.variable} ${garamond.variable} font-serif bg-[#f4f1ea] text-[#1a1a1a]`}>
        {children}
      </body>
    </html>
  );
}
