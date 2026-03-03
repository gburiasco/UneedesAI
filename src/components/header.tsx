'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, Zap, LogOut, LayoutDashboard, ChevronDown, Crown } from "lucide-react";
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
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detect scroll per glassmorphism dinamico
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-[#0B0F19]/90 backdrop-blur-3xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]' 
        : 'bg-[#0B0F19]/70 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* LOGO (Animato con Glow Premium) */}
        <Link href="/" className="flex items-center gap-2.5 group relative z-10">
          {/* Glow effect che pulsa */}
          <div className="absolute -inset-2 bg-violet-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
          
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-900/40 group-hover:shadow-2xl group-hover:shadow-violet-500/50 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
            {/* Vetro interno lucido */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Riflesso superiore */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-white/40" />
            <Zap className="h-4 w-4 text-white fill-white relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-500" />
          </div>
          
          <span className="font-extrabold text-xl bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:from-violet-200 group-hover:via-white group-hover:to-violet-200 transition-all duration-500">
            Uneedes
          </span>
        </Link>

        {/* AZIONI DESTRA */}
        <div className="flex items-center gap-3 md:gap-4">
          <LanguageSwitcher />
          
          {loading ? (
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          ) : !user ? (
            // GUEST: Bottone Login Premium con Shimmer
            <Link
              href="/login"
              className="relative overflow-hidden group px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-xs md:text-sm text-white bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border border-violet-500/30 hover:border-violet-400/50 shadow-lg shadow-violet-900/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-500 hover:scale-105"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">{t('login')}</span>
            </Link>
          ) : (
            // LOGGED USER
            <div className="flex items-center gap-3 md:gap-4">

              {/* PROGRESS BARS PREMIUM (Desktop) */}
              <div className="hidden lg:flex items-center gap-6 mr-2">

                {/* Daily Questions Bar */}
                <div className="flex flex-col gap-1.5 w-32 group cursor-default">
                  <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-widest leading-none">
                    <span className="text-slate-500 group-hover:text-violet-400 transition-colors duration-300">{t('daily')}</span>
                    <span className={`transition-colors duration-300 ${questionsUsed >= DAILY_LIMIT ? "text-red-400" : "text-slate-300"}`}>
                      {questionsUsed}<span className="text-slate-600">/{DAILY_LIMIT}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        questionsUsed >= DAILY_LIMIT 
                          ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400' 
                          : 'bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500'
                      }`}
                      style={{ width: `${questionsPercent}%` }}
                    >
                      {/* Glow interno */}
                      <div className="absolute inset-0 bg-white/20 blur-sm" />
                      {/* Riflesso destro */}
                      <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-white/30 to-transparent rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Files Bar */}
                <div className="flex flex-col gap-1.5 w-32 group cursor-default">
                  <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-widest leading-none">
                    <span className="text-slate-500 group-hover:text-emerald-400 transition-colors duration-300">{t('files')}</span>
                    <span className={`transition-colors duration-300 ${filesUsed >= FILES_LIMIT ? "text-amber-400" : "text-slate-300"}`}>
                      {filesUsed}<span className="text-slate-600">/{FILES_LIMIT}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        filesUsed >= FILES_LIMIT 
                          ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400' 
                          : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400'
                      }`}
                      style={{ width: `${filesPercent}%` }}
                    >
                      {/* Glow interno */}
                      <div className="absolute inset-0 bg-white/20 blur-sm" />
                      {/* Riflesso destro */}
                      <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-white/30 to-transparent rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* USER MENU DROPDOWN PREMIUM */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all duration-300 group ${
                    menuOpen 
                      ? 'bg-white/10 border border-white/20 shadow-lg shadow-violet-900/20' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Avatar con Badge PRO */}
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-all duration-300 group-hover:scale-105 ${
                      isPro 
                        ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 border-2 border-amber-300/50 shadow-amber-500/30' 
                        : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10'
                    }`}>
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    {/* Crown Badge per PRO */}
                    {isPro && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center border border-amber-200 shadow-lg shadow-amber-500/50">
                        <Crown className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-all duration-300 ${menuOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {/* Dropdown Menu ULTRA PREMIUM */}
                {menuOpen && (
                  <>
                    {/* Backdrop invisible */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMenuOpen(false)}
                    />
                    
                    <div className="absolute right-0 top-full mt-3 w-72 bg-[#0B0F19]/98 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-300 origin-top-right">
                      
                      {/* User Header con Gradient */}
                      <div className="relative p-5 border-b border-white/5 bg-gradient-to-br from-violet-500/5 to-transparent">
                        <p className="text-sm font-bold text-white truncate mb-2">{user.email}</p>
                        {isPro ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-xs font-bold text-amber-300 uppercase tracking-wider shadow-lg shadow-amber-900/20">
                            <Crown className="w-3 h-3 fill-amber-300" /> {t('proUser')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {t('freePlan')}
                          </span>
                        )}
                      </div>

                      {/* Stats Mobile (visibili solo su mobile nel dropdown) */}
                      <div className="lg:hidden px-5 py-4 border-b border-white/5 bg-black/20">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">{t('currentLimits')}</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-400">{t('generatedQuestions')}</span>
                            <span className={questionsUsed >= DAILY_LIMIT ? "text-red-400 font-bold" : "text-white"}>{questionsUsed}/{DAILY_LIMIT}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-400">{t('uploadedFiles')}</span>
                            <span className={filesUsed >= FILES_LIMIT ? "text-amber-400 font-bold" : "text-white"}>{filesUsed}/{FILES_LIMIT}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-2">
                        <Link
                          href="/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300"
                        >
                          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover:bg-violet-500 group-hover:border-violet-400 group-hover:shadow-lg group-hover:shadow-violet-500/30 transition-all duration-300">
                            <LayoutDashboard className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors" />
                          </div>
                          <span className="group-hover:translate-x-1 transition-transform duration-300">{t('dashboard')}</span>
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="group flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl transition-all duration-300 mt-1"
                        >
                          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:border-red-400 group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-300">
                            <LogOut className="w-4 h-4 text-red-400 group-hover:text-white transition-colors" />
                          </div>
                          <span className="group-hover:translate-x-1 transition-transform duration-300">{t('logout')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </nav>
  );
}