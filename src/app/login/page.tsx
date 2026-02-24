'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Loader2, Mail, Lock, LogIn, Chrome } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Errore durante l'autenticazione.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="absolute -top-40 -left-40 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px]" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-blue-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Accedi a Uneedes</h1>
          <p className="text-slate-400 text-sm">
            Salva i tuoi quiz, traccia i progressi e sblocca i limiti del PRD.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-semibold hover:scale-[1.01] transition-transform disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-5 h-5" />
            )}
            <span>Continua con Google</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="px-3 text-xs text-slate-500 uppercase tracking-wide">
              oppure
            </span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Email / Password */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400">Email</label>
              <div className="mt-1 flex items-center gap-2 bg-slate-900 rounded-xl border border-slate-700/60 px-3">
                <Mail className="w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-600"
                  placeholder="nome@universita.it"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400">Password</label>
              <div className="mt-1 flex items-center gap-2 bg-slate-900 rounded-xl border border-slate-700/60 px-3">
                <Lock className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-600"
                  placeholder="Minimo 6 caratteri"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>
                {mode === "login" ? "Accedi con Email" : "Registrati con Email"}
              </span>
            </button>
          </form>

          <div className="mt-4 text-xs text-slate-400 text-center">
            {mode === "login" ? (
              <>
                Non hai un account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  Registrati
                </button>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  Accedi
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

