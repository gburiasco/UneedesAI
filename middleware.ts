import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['it', 'en', 'es', 'fr', 'de'],
  defaultLocale: 'it'
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};