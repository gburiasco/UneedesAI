'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, Zap, FileText, LogOut, LayoutDashboard, User, ChevronDown } from "lucide-react";

type UserProfile = {
  id: string;
  email: string | null;
  subscription_status: string | null;
  questions_generated_today: number | null;
  total_files_uploaded: number | null;
};

// LIMITI COSTANTI (Allineati con limits.ts)
const DAILY_LIMIT = 50;
const FILES_LIMIT = 10;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  
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

  // Caricamento Dati Utente
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

      // Fetch dati profilo freschi
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

  // Ricarica i dati ogni volta che cambi pagina (così si aggiornano i contatori dopo un upload)
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

  // Calcolo percentuali per le barre
  const questionsUsed = profile?.questions_generated_today ?? 0;
  const questionsPercent = Math.min(100, (questionsUsed / DAILY_LIMIT) * 100);
  
  const filesUsed = profile?.total_files_uploaded ?? 0;
  const filesPercent = Math.min(100, (filesUsed / FILES_LIMIT) * 100);

  const isPro = profile?.subscription_status === 'pro';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all">
             <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Uneedes</span>
        </Link>

        {/* AZIONI DESTRA */}
        <div className="flex items-center gap-4">
          
          {loading ? (
             <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          ) : !user ? (
            // GUEST: Bottone Login
            <Link 
              href="/login"
              className="bg-white hover:bg-slate-200 text-slate-900 px-5 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 shadow-lg shadow-white/10"
            >
              Accedi
            </Link>
          ) : (
            // LOGGED USER
            <div className="flex items-center gap-4">
              
              {/* STATI PRO (Barre di Progresso) - Nascosti su mobile piccolissimo */}
              <div className="hidden md:flex items-center gap-6 mr-2">
                
                {/* Daily Questions Limit */}
                <div className="flex flex-col gap-1 w-24">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Daily</span>
                    <span className={questionsUsed >= DAILY_LIMIT ? "text-red-400" : "text-slate-300"}>
                      {questionsUsed}/{DAILY_LIMIT}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${questionsUsed >= DAILY_LIMIT ? 'bg-red-500' : 'bg-violet-500'}`} 
                      style={{ width: `${questionsPercent}%` }} 
                    />
                  </div>
                </div>

                {/* File Limit */}
                <div className="flex flex-col gap-1 w-24">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Files</span>
                    <span className={filesUsed >= FILES_LIMIT ? "text-amber-400" : "text-slate-300"}>
                      {filesUsed}/{FILES_LIMIT}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${filesUsed >= FILES_LIMIT ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${filesPercent}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* MENU UTENTE DROPDOWN */}
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-white/10 bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-[1px]">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xs font-bold text-white uppercase">
                       {user.email?.[0] || "U"}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Content */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    
                    {/* User Info Header */}
                    <div className="p-4 border-b border-white/5 bg-slate-800/50">
                      <p className="text-sm font-bold text-white truncate">{user.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">
                        {isPro ? "Piano PRO ⚡️" : "Piano Free"}
                      </p>
                    </div>

                    {/* Links */}
                    <div className="p-1">
                      <Link 
                        href="/dashboard" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-violet-400" /> Dashboard
                      </Link>
                      
                      {/* Mobile stats (visibili solo nel menu su mobile) */}
                      <div className="md:hidden px-3 py-2 border-t border-white/5 mt-1 pt-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">I tuoi limiti</p>
                        <div className="flex justify-between text-xs text-slate-300 mb-1">
                          <span>Domande:</span> <span>{questionsUsed}/{DAILY_LIMIT}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>File:</span> <span>{filesUsed}/{FILES_LIMIT}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                      >
                        <LogOut className="w-4 h-4" /> Esci
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