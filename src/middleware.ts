import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Tutte le lingue che supporti
  locales: ['it', 'en', 'es', 'fr', 'de'],

  // La lingua di default se un utente visita la root (localhost:3000/)
  defaultLocale: 'it',
  
  // Opzionale ma consigliato: nasconde il prefisso /it/ per la lingua di default
  localePrefix: 'as-needed' 
});

export const config = {
  // Il matcher dice al middleware su quali percorsi deve agire.
  // Ignora le API, i file di Next.js e i file statici (immagini, css, ecc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};