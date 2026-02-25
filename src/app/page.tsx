'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, XCircle, Lightbulb, ArrowRight, RefreshCw, Loader2, AlertCircle, Zap, Lock, Sparkles } from "lucide-react";
import { generateQuizAction, saveUserAnswerAction } from './actions';
import { Header } from "../components/header";
import { supabase } from "../lib/supabase";
import { PaywallModal } from "../components/paywall-modal";

// Definiamo i limiti qui per coerenza (o importali da un file di costanti se preferisci)
const DAILY_LIMIT = 50;

export default function Home() {
  const router = useRouter();
  
  // --- STATI ---
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [expandedTips, setExpandedTips] = useState<{ [key: number]: boolean }>({});
  const [error, setError] = useState("");
  
  // Stati Utente
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [questionsUsedToday, setQuestionsUsedToday] = useState(0); // <--- NUOVO: Counter

  // Stati Paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"guest" | "files" | "daily" | null>(null);

  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      // 1. Check Auth
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setAuthChecked(true);

      // 2. Check Trial (Local Storage)
      if (typeof window !== "undefined") {
        const flag = window.localStorage.getItem("uneedes_trial_used");
        setTrialUsed(flag === "true");
      }

      // 3. Fetch Contatori Utente (Se loggato)
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("questions_generated_today")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setQuestionsUsedToday(profile.questions_generated_today || 0);
        }
      }
    };
    init();
  }, [quizData]); // Ricarica i contatori ogni volta che generiamo un quiz (quizData cambia)

  // --- GESTIONE UPLOAD ---
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    // Blocco Guest Trial
    if (!isLoggedIn && trialUsed) {
      setPaywallReason("guest");
      setShowPaywall(true);
      e.target.value = "";
      return;
    }

    setLoading(true);
    setError("");
    setQuizData(null);
    setUserAnswers({});
    setShowResults(false);

    const formData = new FormData();
    const file = e.target.files[0];
    formData.append("file", file);
    if (isLoggedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) formData.append("userId", user.id);
    }

    const result = await generateQuizAction(formData);

    // Blocco Limiti Backend
    if ((result as any).limitReached) {
        setPaywallReason((result as any).reason);
        setShowPaywall(true);
        setLoading(false);
        e.target.value = "";
        return;
    }

    if ((result as any).error) {
      setError((result as any).error ?? "");
    } else {
      setQuizData((result as any).quiz);
      // Aggiorna trial locale
      if (!isLoggedIn && typeof window !== "undefined") {
        window.localStorage.setItem("uneedes_trial_used", "true");
        setTrialUsed(true);
      }
      // Se è loggato, incrementiamo il contatore locale per feedback immediato
      if (isLoggedIn) {
        setQuestionsUsedToday(prev => prev + 10); 
      }
    }
    setLoading(false);
  }

  // --- LOGICA QUIZ UI ---
  const handleOptionClick = async (qIndex: number, option: string) => {
    if (showResults) return;
    
    // 1. Aggiorna UI
    setUserAnswers(prev => ({ ...prev, [qIndex]: option }));
  
    // 2. Salva nel DB (solo se loggato E domanda ha ID reale)
    if (!isLoggedIn || !quizData) return;
  
    const q = quizData[qIndex];
    
    // ✅ Verifica che la domanda abbia un ID reale (significa che è salvata nel DB)
    if (!q.id) {
      console.log("⚠️ Domanda senza ID - utente anonimo, skip salvataggio");
      return;
    }
  
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const isCorrect = option === q.answer;
    
    console.log("💾 Salvo risposta:", { questionId: q.id, option, isCorrect });
    await saveUserAnswerAction(user.id, q.id, option, isCorrect);
  };

  const toggleTip = (idx: number) => {
    setExpandedTips(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const calculateScore = () => {
    if (!quizData) return { score: 0, weakTopics: [] };
    let score = 0;
    let weakTopics: string[] = [];
    quizData.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) score++;
      else if (q.topic && !weakTopics.includes(q.topic)) weakTopics.push(q.topic);
    });
    return { score, weakTopics };
  };

  const results = calculateScore();

  // --- RENDER BOTTONE DINAMICO ---
  const renderActionButtons = () => {
    // CASO 1: GUEST CHE HA APPENA FINITO LA PROVA
    if (!isLoggedIn) {
      return (
        <button 
          onClick={() => { setPaywallReason("guest"); setShowPaywall(true); }}
          className="bg-violet-600 hover:bg-violet-500 text-white py-3 px-8 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform animate-pulse"
        >
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300"/> Salva e Continua
        </button>
      );
    }
  
    // CASO 2: LIMITE GIORNALIERO RAGGIUNTO
    if (questionsUsedToday >= DAILY_LIMIT) {
      return (
        <button 
          onClick={() => { setPaywallReason("daily"); setShowPaywall(true); }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-8 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Lock className="w-4 h-4"/> Sblocca Illimitato
        </button>
      );
    }
  
    // CASO 3: TUTTO OK
    return (
      <button 
        onClick={() => router.push("/dashboard")} 
        className="bg-white text-black py-3 px-8 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <RefreshCw className="w-4 h-4"/> +10 Domande (Dashboard)
      </button>
    );
  };

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans text-slate-100">
      
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>
      
      <Header />

      <main className="z-10 flex-1 flex flex-col items-center pt-10 px-4 pb-20 max-w-4xl mx-auto w-full">

        {!quizData && (
          <div className="text-center mt-10 mb-16">
            <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 mb-6">
              Mettiti alla prova.
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Carica le dispense. L'AI crea il quiz. Tu impari davvero.
            </p>
          </div>
        )}

        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />

        {/* UPLOAD BOX */}
        {!quizData && (
          <div className="relative w-full max-w-2xl animate-in slide-in-from-bottom-5 z-0">
            
            {/* --- BADGE 1: PROVA DISPONIBILE (Design Premium) --- */}
            {authChecked && !isLoggedIn && !trialUsed && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-300 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)] backdrop-blur-md z-20 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Prova Gratuita Attiva</span>
              </div>
            )}

            {/* --- BADGE 2: PROVA ESAURITA (Design Locked) --- */}
            {authChecked && !isLoggedIn && trialUsed && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800/80 border border-white/10 text-slate-400 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest z-20 flex items-center gap-2 shadow-xl">
                <Lock className="w-3 h-3" /> Prova Esaurita
              </div>
            )}

            {/* CASO 1: BLOCCATO (Trial usata e non loggato) -> Apre MODALE SUBITO */}
            {(!isLoggedIn && trialUsed) ? (
               <div 
                 onClick={() => { setPaywallReason("guest"); setShowPaywall(true); }}
                 className="cursor-pointer relative bg-slate-900/40 backdrop-blur-sm border border-dashed border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all w-full min-h-[300px] hover:bg-slate-900/60 group"
               >
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform">
                    <Lock className="w-8 h-8 text-slate-500" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    Hai già usato la tua prova
                  </h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                    Registrati gratuitamente per continuare a generare quiz e salvare i tuoi progressi.
                  </p>

                  {/* Pulsante SBLOCCA ACCESSO (Restyling Neon) */}
                  <button className="relative px-8 py-3 rounded-xl font-bold text-white bg-slate-900 border border-violet-500/50 shadow-[0_0_20px_-5px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.6)] hover:border-violet-400 hover:scale-105 transition-all duration-300 group-hover:text-violet-200">
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-400 fill-violet-400" /> Sblocca Accesso
                    </span>
                  </button>
               </div>
            ) : (
            // CASO 2: ATTIVO (Loggato O Prova Disponibile) -> Apre FILE PICKER
              <label className="relative cursor-pointer bg-slate-900/80 backdrop-blur-xl border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-violet-500/50 hover:bg-slate-900/90 transition-all w-full min-h-[300px] group">
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
                
                {loading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
                    <h3 className="text-xl font-semibold text-white">Analisi in corso...</h3>
                    <p className="text-slate-400 mt-2">Sto leggendo il PDF e preparando le trappole.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                      <UploadCloud className="w-8 h-8 text-violet-400 group-hover:text-violet-300 transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-violet-200 transition-colors">
                      Carica le tue dispense (PDF)
                    </h3>
                    <div className="bg-violet-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-violet-500/20 mt-4 group-hover:bg-violet-500 group-hover:shadow-violet-500/40 transition-all">
                      Genera Quiz
                    </div>
                  </>
                )}
              </label>
            )}
            
            {error && <div className="mt-4 text-red-400 flex gap-2 justify-center bg-red-500/10 py-2 px-4 rounded-lg border border-red-500/20"><AlertCircle className="w-5 h-5"/> {error}</div>}
          </div>
        )}

        {/* QUIZ AREA */}
        {quizData && (
          <div className="w-full max-w-3xl animate-in fade-in duration-500">
            {/* Risultati */}
            {showResults && (
              <div className="mb-10 bg-slate-900/80 border border-violet-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />
                 <h2 className="text-3xl font-bold text-white mb-2">Risultato Finale</h2>
                 <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 my-4">
                   {results.score}/{quizData.length}
                 </div>
                 {results.weakTopics.length > 0 && (
                   <div className="mt-4">
                     <p className="text-red-300 font-semibold mb-2">Argomenti deboli:</p>
                     <div className="flex flex-wrap justify-center gap-2">
                       {results.weakTopics.map((t, i) => (
                         <span key={i} className="bg-red-500/20 text-red-200 text-xs px-2 py-1 rounded-full">{t}</span>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            )}

            {/* Lista Domande (Codice UI Invariato ma incluso per completezza) */}
            <div className="grid gap-8">
              {quizData.map((q, qIdx) => {
                const isCorrect = userAnswers[qIdx] === q.answer;
                return (
                  <div key={qIdx} className={`relative bg-slate-900/40 border rounded-2xl p-6 transition-all ${showResults ? (isCorrect ? 'border-emerald-500/30' : 'border-red-500/30') : 'border-white/5'}`}>
                    <div className="flex gap-4 mb-4">
                      <span className="bg-slate-800 text-slate-300 font-mono font-bold px-3 py-1 rounded-lg text-sm h-fit">{qIdx + 1}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{q.question}</h3>
                        {q.topic && <span className="text-xs text-slate-500 uppercase">{q.topic}</span>}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {q.options.map((opt: string, i: number) => {
                        const isSelected = userAnswers[qIdx] === opt;
                        let btnClass = "border-white/5 hover:bg-white/5 text-slate-300";
                        if (!showResults && isSelected) btnClass = "border-violet-500 bg-violet-500/10 text-white";
                        if (showResults) {
                           if (opt === q.answer) btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-200";
                           else if (isSelected) btnClass = "border-red-500 bg-red-500/20 text-red-200";
                           else btnClass = "border-transparent opacity-50";
                        }
                        return (
                          <button key={i} onClick={() => handleOptionClick(qIdx, opt)} disabled={showResults} className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between ${btnClass}`}>
                            <span>{opt}</span>
                            {showResults && opt === q.answer && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {showResults && isSelected && opt !== q.answer && <XCircle className="w-5 h-5 text-red-400" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                       <button onClick={() => toggleTip(qIdx)} className="flex items-center gap-2 text-xs text-slate-400 hover:text-violet-400">
                         <Lightbulb className="w-4 h-4" /> {expandedTips[qIdx] ? "Nascondi Tip" : "Vedi Tip"}
                       </button>
                       {expandedTips[qIdx] && <div className="mt-2 text-sm text-yellow-200/80 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10">💡 {q.tip}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS DINAMICI */}
            <div className="sticky bottom-6 mt-12 flex flex-col items-center gap-3 z-40">
               
               {/* Contatore Visibile */}
               {isLoggedIn && (
                 <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-slate-400 shadow-lg">
                   Hai usato <span className={questionsUsedToday >= DAILY_LIMIT ? "text-red-400 font-bold" : "text-violet-400 font-bold"}>{questionsUsedToday}</span>/{DAILY_LIMIT} domande oggi
                 </div>
               )}

               <div className="flex justify-center gap-4">
                 {!showResults ? (
                   <button onClick={() => setShowResults(true)} disabled={Object.keys(userAnswers).length < quizData.length} className="bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold py-4 px-12 rounded-full shadow-xl disabled:opacity-50 transition-transform hover:scale-105">
                     Scopri Risultati <ArrowRight className="w-5 h-5 inline ml-2"/>
                   </button>
                 ) : (
                   <div className="flex gap-3">
                     <button onClick={() => setQuizData(null)} className="bg-slate-800 text-white py-3 px-8 rounded-full font-semibold border border-white/10 hover:bg-slate-700">Nuovo File</button>
                     
                     {/* BOTTONE INTELLIGENTE */}
                     {renderActionButtons()}
                   </div>
                 )}
               </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}