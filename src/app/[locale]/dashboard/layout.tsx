import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await useTranslations('Metadata');
  
  return {
    title: t('dashboardTitle'),
    description: t('dashboardDescription'),
    alternates: {
      canonical: `https://uneedes-ai.vercel.app/${locale}/dashboard`
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