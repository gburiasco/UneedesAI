'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, Zap, Globe, LogOut, LayoutDashboard, ChevronDown, Crown } from "lucide-react";
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from "./langSwitch";

type UserProfile = {
  id: string;
  email: string | null;
  subscription_status: string | null;
  questions_generated_today: number | null;
  total_files_uploaded: number | null;
};

const DAILY_LIMIT = 50;
const FILES_LIMIT = 10;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('header');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Chiudi menu se clicco fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("users")
        .select("id, email, subscription_status, questions_generated_today, total_files_uploaded")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(profileData as UserProfile | null);
      setLoading(false);
    } catch (err) {
      console.error("Errore header:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const questionsUsed = profile?.questions_generated_today ?? 0;
  const questionsPercent = Math.min(100, (questionsUsed / DAILY_LIMIT) * 100);

  const filesUsed = profile?.total_files_uploaded ?? 0;
  const filesPercent = Math.min(100, (filesUsed / FILES_LIMIT) * 100);

  const isPro = profile?.subscription_status === 'pro';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19]/70 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* LOGO (Animato e Glow) */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.3)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:-rotate-3">
            {/* Vetro interno */}
            <div className="absolute inset-0 bg-white/20 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <Zap className="h-4 w-4 text-white fill-white relative z-10" />
          </div>
          <span className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight group-hover:text-white transition-colors">
            Uneedes
          </span>
        </Link>

        {/* AZIONI DESTRA */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {loading ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          ) : !user ? (
            // GUEST: Bottone Login Premium
            <Link
              href="/login"
              className="relative overflow-hidden group px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-xs md:text-sm text-white bg-white/5 border border-white/10 hover:border-violet-500/50 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <span className="relative z-10">{t('login')}</span>
            </Link>
          ) : (
            // LOGGED USER
            <div className="flex items-center gap-4">

              {/* STATI PRO (Barre di Progresso Premium) */}
              <div className="hidden md:flex items-center gap-6 mr-3">

                {/* Daily Questions */}
                <div className="flex flex-col gap-1.5 w-28 group cursor-default">
                  <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-widest leading-none">
                    <span className="text-slate-500 group-hover:text-violet-400 transition-colors">{t('daily')}</span>
                    <span className={questionsUsed >= DAILY_LIMIT ? "text-red-400" : "text-slate-300"}>
                      {questionsUsed}<span className="text-slate-600">/{DAILY_LIMIT}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${questionsUsed >= DAILY_LIMIT ? 'bg-gradient-to-r from-red-600 to-rose-400' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`}
                      style={{ width: `${questionsPercent}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px] rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* File Limit */}
                <div className="flex flex-col gap-1.5 w-28 group cursor-default">
                  <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-widest leading-none">
                    <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">{t('files')}</span>
                    <span className={filesUsed >= FILES_LIMIT ? "text-amber-400" : "text-slate-300"}>
                      {filesUsed}<span className="text-slate-600">/{FILES_LIMIT}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${filesUsed >= FILES_LIMIT ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-teal-400'}`}
                      style={{ width: `${filesPercent}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MENU UTENTE DROPDOWN (Pillola Dinamica) */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 p-1 pr-2 rounded-full border transition-all duration-300 group ${menuOpen ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner transition-transform group-hover:scale-105 ${isPro ? 'bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-300/50' : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10'}`}>
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-300 ${menuOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {/* Dropdown Content - Opacità aumentata e ombra rafforzata */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-[#0B0F19]/98 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] origin-top-right">
                    {/* User Info Header */}
                    <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                      <p className="text-sm font-bold text-white truncate mb-1.5">{user.email}</p>
                      <div className="flex items-center">
                        {isPro ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-widest shadow-inner">
                            <Crown className="w-3 h-3" /> {t('proUser')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('freePlan')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover:bg-violet-500 group-hover:border-violet-400 transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform">{t('dashboard')}</span>
                      </Link>

                      {/* Mobile stats (visibili solo nel menu su mobile) */}
                      <div className="md:hidden px-4 py-3 border-y border-white/5 my-1 bg-black/20">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">{t('currentLimits')}</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-400">{t('generatedQuestions')}</span>
                            <span className={questionsUsed >= DAILY_LIMIT ? "text-red-400" : "text-white"}>{questionsUsed}/{DAILY_LIMIT}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-400">{t('uploadedFiles')}</span>
                            <span className={filesUsed >= FILES_LIMIT ? "text-amber-400" : "text-white"}>{filesUsed}/{FILES_LIMIT}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="group flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all mt-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:border-red-400 transition-colors">
                          <LogOut className="w-4 h-4 text-red-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform">{t('logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </nav>
  );
}