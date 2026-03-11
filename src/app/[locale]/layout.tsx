import type { Metadata } from "next";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uneedes AI - Test Yourself",
  description: "Upload your notes. AI creates the quiz. You learn for real.",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
      <!-- Start cookieyes banner --> <script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/a3b199f01ae02c96d7fee8220275cf40/script.js"></script> <!-- End cookieyes banner -->
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/*  Aggiungi locale={locale}  */}
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

export async function generateStaticParams() {
  return [
    {locale: 'it'},
    {locale: 'en'},
    {locale: 'es'},
    {locale: 'fr'},
    {locale: 'de'}
  ];
}