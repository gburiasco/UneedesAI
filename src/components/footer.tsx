'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto bg-[#0B0F19] overflow-hidden">
      
      {/* 1. Effetto Vetro e Glow di Sfondo */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[200px] bg-violet-600/10 blur-[120px] pointer-events-none" />
      
      {/* 2. Linea di separazione "Laser" */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      {/* PADDING RIDOTTO DA py-16 A py-10 */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-12 z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Colonna Brand */}
          <div className="md:col-span-5 lg:col-span-4 pr-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.2)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:-rotate-3">
                <div className="absolute inset-0 bg-white/20 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <Zap className="h-4 w-4 text-white fill-white relative z-10" />
              </div>
              <span className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight group-hover:text-white transition-colors">
                Uneedes
              </span>
            </Link>
            <p className="text-sm text-slate-400/90 leading-relaxed font-medium max-w-sm">
              {t('tagline', { defaultValue: 'Trasforma i tuoi appunti in quiz interattivi con la potenza dell\'AI. Il modo più intelligente per superare il prossimo esame.' })}
            </p>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-2"></div>

          {/* Colonne Link - SPAZIATURA E COLORI CORRETTI */}
          <div className="md:col-span-7 lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-8">
            
            {/* Colonna Prodotto */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4">
                {t('product', { defaultValue: 'Prodotto' })}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('home', { defaultValue: 'Home' })}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('pricing', { defaultValue: 'Prezzi' })}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('dashboard', { defaultValue: 'Dashboard' })}</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Colonna Supporto */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4">
                {t('support', { defaultValue: 'Supporto' })}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="mailto:support@uneedes.com" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('contact', { defaultValue: 'Contattaci' })}</span>
                  </a>
                </li>
                <li>
                  <a href="https://discord.gg/uneedes" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('community', { defaultValue: 'Community Discord' })}</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Colonna Legale */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-4">
                {t('legal', { defaultValue: 'Legale' })}
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/privacy" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('privacy', { defaultValue: 'Privacy Policy' })}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors">
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('terms', { defaultValue: 'Terms of Service' })}</span>
                  </Link>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).CookieYes) {
                        (window as any).CookieYes.showSettings();
                      }
                    }}
                    className="group inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors text-left"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{t('cookieSettings', { defaultValue: 'Cookie Settings' })}</span>
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Divider Inferiore - MARGINI RIDOTTI */}
        <div className="mt-10 pt-6 border-t border-white-[0.05] flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-400 tracking-wide">All systems operational</span>
          </div>
          
          {/* Copyright */}
          <p className="text-sm font-medium text-slate-500 md:absolute md:left-1/2 md:-translate-x-1/2">
            © {currentYear} Uneedes. {t('rights', { defaultValue: 'All rights reserved.' })}
          </p>

          {/* Social Links Premium */}
          <div className="flex items-center gap-3">
            <a 
              href="https://twitter.com/uneedes" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-violet-500/20 hover:border-violet-500/50 hover:scale-110 active:scale-95 transition-all duration-300 shadow-inner"
              aria-label="Twitter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a 
              href="https://linkedin.com/company/uneedes" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-violet-500/20 hover:border-violet-500/50 hover:scale-110 active:scale-95 transition-all duration-300 shadow-inner"
              aria-label="LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}