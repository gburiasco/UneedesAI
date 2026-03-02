'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation'; 
import { useLocale } from 'next-intl';

// 1. Definiamo le lingue supportate e i loro nomi
const LOCALES = ['it', 'en', 'es', 'fr', 'de'];
const LANGUAGE_NAMES: Record<string, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch'
};

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  // Chiude il menu se clicchi fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Logica di routing universale
  // 2. Logica di routing universale
  const switchLanguage = (newLocale: string) => {
    const pathParts = pathname.split('/'); // Es. ['', 'en', 'dashboard']
    const firstSegment = pathParts[1];

    let newPath;

    // Controlliamo se la parte subito dopo lo slash è una delle nostre lingue
    if (LOCALES.includes(firstSegment)) {
      // Sostituiamo il prefisso vecchio con quello nuovo
      pathParts[1] = newLocale;
      newPath = pathParts.join('/');
    } else {
      // Se non c'è il prefisso (siamo su /dashboard, lingua default), lo aggiungiamo
      newPath = `/${newLocale}${pathname === '/' ? '' : pathname}`;
    }
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    // --- LA MODIFICA È QUI SOTTO ---
    window.location.href = newPath;
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bottone a Pillola (Apple Style) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          isOpen 
            ? 'bg-white/10 border-white/20 shadow-lg text-white' 
            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{currentLocale}</span>
      </button>

      {/* Menu a Tendina Fluttuante (Vetro) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-32 bg-[#0B0F19]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
          <div className="p-1 flex flex-col gap-0.5">
            {/* 3. Generiamo i bottoni dinamicamente */}
            {LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLanguage(loc)}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  currentLocale === loc 
                    ? 'bg-violet-500/20 text-violet-300' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {LANGUAGE_NAMES[loc]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}