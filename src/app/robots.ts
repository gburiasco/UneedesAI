import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/api/',
          '/_next/',
          '/update-password',
          '/login',
        ],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai'],
        disallow: ['/'],
      },
    ],
    sitemap: 'https://uneedes.vercel.app/sitemap.xml',
  };
}