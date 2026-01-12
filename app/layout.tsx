import type { Metadata } from "next";
import { UnifrakturMaguntia, Playfair_Display, EB_Garamond } from "next/font/google";
import "./globals.css";
import { ReadableModeProvider } from "./components/ReadableModeProvider";
import { ThemeProvider } from "./context/ThemeContext";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${unifraktur.variable} ${playfair.variable} ${garamond.variable} font-serif`}>
        <ThemeProvider>
          <ReadableModeProvider>
            {children}
          </ReadableModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
