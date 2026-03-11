import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from '../../components/footer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Mapping tecnico per OpenGraph (non ha bisogno di traduzione)
const localeNames: Record<string, string> = {
  it: 'it_IT',
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE'
};

// ============================================
// METADATA DINAMICI CON NEXT-INTL
// ============================================
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  
  // Fallback di sicurezza
  const currentLocale = ['it', 'en', 'es', 'fr', 'de'].includes(locale) ? locale : 'en';
  
  // Richiamiamo le traduzioni per il namespace "Metadata" (o come preferisci chiamarlo nei JSON)
  const t = await getTranslations({ locale: currentLocale, namespace: 'Metadata' });
  
  const baseUrl = 'https://uneedes-ai.vercel.app'; // CAMBIA con il tuo dominio finale
  
  return {
    metadataBase: new URL(baseUrl),
    
    title: {
      default: t('title'),
      template: `%s | Uneedes`
    },
    
    description: t('description'),
    
    keywords: [
      'quiz generator', 'AI study tool', 'PDF to quiz', 'quiz da pdf', 
      'studio AI', 'esami universitari', 'flashcards AI', 'study app',
      'quiz interattivi', 'generatore quiz', 'intelligenza artificiale studio',
      'app studenti', 'university study tool', 'exam preparation'
    ],
    
    authors: [{ name: 'Uneedes Team' }],
    creator: 'Uneedes',
    publisher: 'Uneedes',
    
    // Open Graph (Facebook, LinkedIn, WhatsApp)
    openGraph: {
      type: 'website',
      locale: localeNames[currentLocale],
      url: `${baseUrl}/${currentLocale}`,
      siteName: 'Uneedes',
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Uneedes - AI Quiz Generator',
          type: 'image/png'
        }
      ]
    },
    
    // Twitter/X Card
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.png'],
      creator: '@uneedes' // Cambia con il tuo handle Twitter se ce l'hai
    },
    
    // Canonical URL e lingue alternative
    alternates: {
      canonical: `${baseUrl}/${currentLocale}`,
      languages: {
        'it': `${baseUrl}/it`,
        'en': `${baseUrl}/en`,
        'es': `${baseUrl}/es`,
        'fr': `${baseUrl}/fr`,
        'de': `${baseUrl}/de`
      }
    },
    
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    },
    
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png'
    },
    
    manifest: '/manifest.json',
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <script id="cookieyes" type="text/javascript" src="https://cdn-cookieyes.com/client_data/a3b199f01ae02c96d7fee8220275cf40/script.js" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

export async function generateStaticParams() {
  return [
    { locale: 'it' },
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' },
    { locale: 'de' }
  ];
}