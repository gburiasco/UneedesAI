import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  
  return {
    title: t('dashboardTitle'),
    description: t('dashboardDescription'),
    alternates: {
      canonical: `https://uneedes.vercel.app/${locale}/dashboard`
    },
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true
    }
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}