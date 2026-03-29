import { MetadataRoute } from 'next';

const BASE_URL = 'https://uneedes.vercel.app';
const LOCALES = ['it', 'en', 'es', 'fr', 'de'];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    '',
    '/privacy',
    '/terms'
  ];

  const pages = publicRoutes.flatMap(route =>
    LOCALES.map(locale => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: (
        route === '' ? 'daily' : 'monthly'
      ) as 'daily' | 'monthly',
      priority: route === '' ? 1.0 : 0.3,
    }))
  );

  return pages;
}