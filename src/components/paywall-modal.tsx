import React from "react";
import { X, Sparkles, Lock, CheckCircle2, Zap, Crown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "guest" | "files" | "daily" | null;
}

export function PaywallModal({ isOpen, onClose, reason }: PaywallModalProps) {
  if (!isOpen) return null;
  const t = useTranslations('paywall');

  const content = {
    guest: {
      badge: t('guest.badge'),
      title: t('guest.title'),
      description: t('guest.description'),
      cta: t('guest.cta'),
      href: "/login",
      icon: <Sparkles className="w-8 h-8 text-violet-300" />,
      features: t.raw('guest.features'),
    },
    files: {
      badge: t('files.badge'),
      title: t('files.title'),
      description: t('files.description'),
      cta: t('files.cta'),
      href: "/pricing",
      icon: <Crown className="w-8 h-8 text-amber-300" />,
      features: t.raw('files.features'),
    },
    daily: {
      badge: t('daily.badge'),
      title: t('daily.title'),
      description: t('daily.description'),
      cta: t('daily.cta'),
      href: "/pricing",
      icon: <Zap className="w-8 h-8 text-fuchsia-300 fill-fuchsia-300/20" />,
      features: t.raw('daily.features'),
    },
  };

  const currentContent = reason ? content[reason] : content.guest;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      
      {/* Backdrop Vetro */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Card Paywall - Livello Unico, Vetro Pulito, Bordi Professionali */}
      <div className="relative w-full max-w-[420px] bg-slate-900/40 backdrop-blur-2xl rounded-2xl border border-white/10 p-8 md:p-10 shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        
        {/* Alone Magico Morbido Centrale (Nessun bordo tagliato) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-violet-500/10 blur-[100px] pointer-events-none" />

        {/* Bottone Chiudi */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200 z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge Superiore */}
        <div className="relative z-10 inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-6">
          {currentContent.badge}
        </div>

        {/* Icona "Squircle" Dinamica - Bordi Seri */}
        <div className="relative z-10 w-20 h-20 mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-inner flex items-center justify-center">
            {currentContent.icon}
          </div>
        </div>

        {/* Titolo e Descrizione */}
        <h2 className="relative z-10 text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
          {currentContent.title}
        </h2>
        <p className="relative z-10 text-sm text-slate-400 leading-relaxed mb-8 px-2">
          {currentContent.description}
        </p>

        {/* Lista Benefici - Bordi squadrati ma accoglienti */}
        <div className="relative z-10 w-full bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-3.5 mb-8 text-left shadow-inner">
          {(currentContent.features as string[])?.map((feat: string, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">{feat}</span>
            </div>
          ))}
        </div>

        {/* Aggiunto 'overflow-hidden' per tagliare il riflesso che esce fuori */}
<Link
  href={currentContent.href}
  className="relative z-10 overflow-hidden group w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
>
          {/* Effetto Vetro su Hover Pulitissimo */}
          <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
          <span className="relative z-10">{currentContent.cta}</span>
        </Link>
        
        {/* Link Sottile per uscire */}
        <button
          onClick={onClose}
          className="relative z-10 mt-5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
        >
          {t('dismissButton')}
        </button>
        
      </div>
    </div>
  );
}