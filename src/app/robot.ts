import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',        // ❌ Area privata
          '/api/',             // ❌ Endpoint API
          '/_next/',           // ❌ Asset Next.js
          '/update-password',  // ❌ Funzionalità utente
          '/login',            // ❌ Form login
        ],
      },
      // Blocca AI scrapers
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai'],
        disallow: ['/'],
      }
    ],
    sitemap: 'https://uneedes-ai.vercel.app/sitemap.xml', 
  };
}