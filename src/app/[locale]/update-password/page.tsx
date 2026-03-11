'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useTranslations('updatePassword');
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Supabase sa già quale utente è grazie al token passato nell'URL dell'email
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      // Successo! L'utente ora ha la nuova password ed è loggato
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center px-4">
      {/* Sfondo sfocato ambientale (Stesso tema della pagina di login) */}
      <div className="absolute -top-40 -left-40 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            {t('newPasswordLabel')}
          </h1>
          <p className="text-slate-400 text-sm">
            {success ? "Tutto pronto per ripartire." : "Scegli una password sicura per il tuo account."}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-[24px] p-6 shadow-2xl backdrop-blur-2xl">
          
          {success ? (
            // SCHERMATA DI SUCCESSO
            <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('successTitle')}</h2>
              <p className="text-slate-400 text-sm mb-8">
                {t('successDesc')}
              </p>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
              >
                <span>{t('dashboardBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // FORM INSERIMENTO NUOVA PASSWORD
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  {t('newPasswordLabel')}
                </label>
                
                <div className="mt-1.5 flex items-center gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-1 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-300">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600 font-medium"
                    placeholder={t('newPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || password.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                <span>{t('saveBtn')}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}