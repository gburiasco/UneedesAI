'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Loader2, Mail, Lock, LogIn, Chrome, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');

  // Aggiunto "reset" ai mode possibili
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Nuova funzione dedicata al recupero password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Qui lo rimanderemo a una pagina che creeremo dopo per inserire la nuova password
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;

      setSuccessMsg(t('resetSuccess'));
      // Svuotiamo l'email per sicurezza
      setEmail("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('resetError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user && !data.session) {
          setSuccessMsg(t('checkEmail'));
          setEmail("");
          setPassword("");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "Invalid login credentials") {
        setError(t('invalidCredentials'));
      } else {
        setError(err.message || t('defaultError'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center px-4">
      {/* Sfondo sfocato ambientale */}
      <div className="absolute -top-40 -left-40 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            {mode === "reset" ? t('resetTitle') : t('title')}
          </h1>
          <p className="text-slate-400 text-sm">
            {mode === "reset" ? t('resetSubtitle') : t('subtitle')}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-[24px] p-6 shadow-2xl backdrop-blur-2xl">

          {/* Mostriamo il Selettore Vetro Apple SOLO se NON siamo in modalità reset */}
          {mode !== "reset" ? (
            <div className="relative flex p-1.5 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl mb-8 shadow-inner">
              <div className="absolute inset-1.5 overflow-hidden rounded-xl pointer-events-none">
                <div
                  className={`absolute top-0 bottom-0 w-1/2 bg-gradient-to-br from-violet-500/60 to-fuchsia-500/60 backdrop-blur-md rounded-xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_0_20px_rgba(139,92,246,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${mode === "login" ? "translate-x-0" : "translate-x-full"
                    }`}
                />
              </div>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setSuccessMsg(null); }}
                className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 ${mode === "login" ? "text-white drop-shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t('switchToLogin')}
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); setSuccessMsg(null); }}
                className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 ${mode === "signup" ? "text-white drop-shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {t('switchToSignup')}
              </button>
            </div>
          ) : (
            // Bottone "Torna indietro" super pulito quando siamo in modalità Reset
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccessMsg(null); }}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToLogin')}
            </button>
          )}

          {/* Nascondiamo il login Google se siamo in modalità reset */}
          {mode !== "reset" && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
                <span>{t('googleBtn')}</span>
              </button>

              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('or')}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </>
          )}

          {/* Form Dinamico */}
          <form onSubmit={mode === "reset" ? handleResetPassword : handleEmailSubmit} className="space-y-5">
            {/* Input Email (sempre visibile) */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                {t('emailLabel')}
              </label>
              <div className="mt-1.5 flex items-center gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-1 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600 font-medium"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
            </div>

            {/* Input Password (nascosto se siamo in modalità reset) */}
            {mode !== "reset" && (
              <div>
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('passwordLabel')}
                  </label>
                  {/* Il tasto magico che attiva la modalità reset */}
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setMode("reset"); setError(null); setSuccessMsg(null); }}
                      className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-1 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/50 focus-within:shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all duration-300">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600 font-medium"
                    placeholder={t('passwordPlaceholder')}
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
            )}

            {/* Messaggi di Errore / Successo */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium leading-relaxed">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="flex gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{successMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] disabled:opacity-60 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>
                {mode === "reset" ? t('resetBtn') : mode === "login" ? t('loginBtn') : t('signupBtn')}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}