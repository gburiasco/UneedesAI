import { MetadataRoute } from 'next';

const BASE_URL = 'https://uneedes-ai.vercel.app'; // CAMBIA con dominio finale
const LOCALES = ['it', 'en', 'es', 'fr', 'de'];

export default function sitemap(): MetadataRoute.Sitemap {
  // Solo pagine PUBBLICHE che vogliamo indicizzare
  const publicRoutes = [
    '',        // Home (priorità massima)
    '/privacy', // Privacy Policy
    '/terms'    // Terms of Service
  ];

  const pages = publicRoutes.flatMap(route =>
    LOCALES.map(locale => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: (
        route === '' ? 'daily' :      // Home cambia spesso
        'monthly'                      // Privacy/Terms stabili
      ) as 'daily' | 'monthly',
      priority: (
        route === '' ? 1.0 :           // Home priorità massima
        0.3                            // Privacy/Terms bassa
      ),
    }))
  );

  return pages;
}