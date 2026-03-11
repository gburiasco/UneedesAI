'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-white/5 bg-slate-950/80 backdrop-blur-xl">
      {/* Pattern decorativo top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          {/* Colonna Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">U</span>
              </div>
              <span className="text-xl font-bold text-white">Uneedes</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t('tagline', { defaultValue: 'Trasforma i tuoi PDF in quiz interattivi con AI. Studio intelligente per studenti moderni.' })}
            </p>
          </div>

          {/* Colonna Prodotto */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t('product', { defaultValue: 'Prodotto' })}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                  {t('home', { defaultValue: 'Home' })}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                  {t('pricing', { defaultValue: 'Prezzi' })}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                  {t('dashboard', { defaultValue: 'Dashboard' })}
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonna Legale */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t('legal', { defaultValue: 'Legale' })}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                  {t('privacy', { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">
                  {t('terms', { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
              <li>
                <button 
                  onClick={() => {
                    // Se usi CookieYes, aprirà il banner
                    if (typeof window !== 'undefined' && (window as any).CookieYes) {
                      (window as any).CookieYes.showSettings();
                    }
                    // Se usi react-cookie-consent custom, gestisci qui
                  }}
                  className="text-sm text-slate-400 hover:text-violet-400 transition-colors text-left"
                >
                  {t('cookieSettings', { defaultValue: 'Cookie Settings' })}
                </button>
              </li>
            </ul>
          </div>

          {/* Colonna Supporto */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t('support', { defaultValue: 'Supporto' })}
            </h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:support@uneedes.com" 
                  className="text-sm text-slate-400 hover:text-violet-400 transition-colors"
                >
                  {t('contact', { defaultValue: 'Contattaci' })}
                </a>
              </li>
              <li>
                <a 
                  href="https://discord.gg/uneedes" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-slate-400 hover:text-violet-400 transition-colors"
                >
                  {t('community', { defaultValue: 'Community Discord' })}
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Copyright */}
            <p className="text-sm text-slate-500">
              © {currentYear} Uneedes. {t('rights', { defaultValue: 'All rights reserved.' })}
            </p>

            {/* Social Links (opzionali) */}
            <div className="flex items-center gap-4">
              <a 
                href="https://twitter.com/uneedes" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-violet-400 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a 
                href="https://linkedin.com/company/uneedes" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-violet-400 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}