import React from "react";
import { X, Sparkles, Lock, CheckCircle2, Zap } from "lucide-react";
import Link from "next/link";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "guest" | "files" | "daily" | null;
}

export function PaywallModal({ isOpen, onClose, reason }: PaywallModalProps) {
  if (!isOpen) return null;

  const content = {
    guest: {
      title: "Crea il tuo account",
      description: "Hai provato la potenza dell'AI. Ora salva i tuoi progressi e accedi da qualsiasi dispositivo.",
      cta: "Registrati Gratis",
      href: "/login", // O /signup se hai una pagina dedicata
      features: ["Salva i tuoi quiz", "Accedi alla Dashboard", "Fino a 10 file gratuiti"],
    },
    files: {
      title: "Spazio esaurito",
      description: "Hai raggiunto il limite di 10 file del piano Free. Passa a Pro per non avere limiti.",
      cta: "Passa a PRO - 9.99€",
      href: "/pricing", // O link a Stripe
      features: ["Caricamenti illimitati", "Quiz più lunghi", "Supporto prioritario"],
    },
    daily: {
      title: "Limite giornaliero raggiunto",
      description: "Hai generato il massimo di domande per oggi (50). Torna domani o togli ogni limite ora.",
      cta: "Sblocca tutto - 9.99€",
      href: "/pricing",
      features: ["Domande illimitate", "Modalità Studio Avanzata", "Nessun tempo di attesa"],
    },
  };

  // Fallback se reason è null (non dovrebbe succedere)
  const currentContent = reason ? content[reason] : content.guest;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative bg-slate-900 border border-violet-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-violet-500/20 overflow-hidden">
        
        {/* Effetto Glow Sfondo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Tasto Chiudi */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icona Header */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
            {reason === "guest" ? (
              <Sparkles className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-white" />
            )}
          </div>
        </div>

        {/* Testi */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{currentContent.title}</h2>
          <p className="text-slate-400 leading-relaxed">
            {currentContent.description}
          </p>
        </div>

        {/* Lista Benefici */}
        <div className="space-y-3 mb-8 bg-slate-800/50 p-4 rounded-xl border border-white/5">
          {currentContent.features.map((feat, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href={currentContent.href}
          className="block w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-center font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/50 flex items-center justify-center gap-2"
        >
          {currentContent.cta} <Zap className="w-4 h-4 fill-white" />
        </Link>
        
        <button
          onClick={onClose}
          className="w-full text-center text-slate-500 text-sm mt-4 hover:text-slate-300 underline decoration-slate-700"
        >
          No grazie, forse più tardi
        </button>
      </div>
    </div>
  );
}