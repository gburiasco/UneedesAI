'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import { FileText, UploadCloud, CheckCircle2, XCircle, Lightbulb, ArrowRight, RefreshCw, Loader2, AlertCircle, Zap, Lock, Sparkles } from "lucide-react";
import { generateQuizAction, saveUserAnswerAction } from '../actions';
import { Header } from "../../components/header";
import { supabase } from "../../lib/supabase";
import { PaywallModal } from "../../components/paywall-modal";
import { useTranslations } from 'next-intl';

// Definiamo i limiti qui per coerenza (o importali da un file di costanti se preferisci)
const DAILY_LIMIT = 50;

export default function Home() {
  const router = useRouter();
  const t = useTranslations('home');
  const tQuiz = useTranslations('quiz');
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

  // --- STATI PER LE MICRO-ANIMAZIONI ---
  const [wordIndex, setWordIndex] = useState(0);
  const heroWords = t.raw('heroWords') as string[];
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 3000); // Cambia ogni 3 secondi
    return () => clearInterval(interval);
  }, []);

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

  // Animazione contatore punteggio (Ottimizzata per i voti dei Quiz!)
  useEffect(() => {
    if (showResults && quizData && results) {
      // 1. Appena clicchi "Termina", blocchiamo il numero sullo zero!
      setAnimatedScore(0);

      const target = results.score;
      if (target === 0) return; // Se il voto è 0, abbiamo già finito!

      let current = 0;
      let timer: NodeJS.Timeout;

      // 2. Calcoliamo quanto deve durare lo scatto tra un numero e l'altro (es. 1500ms divisi per 7 = scatta ogni 214ms)
      const stepTime = Math.floor(1000 / target);

      // 3. Aspettiamo pazientemente 600ms che lo scroll sia finito prima di partire
      const delayTimer = setTimeout(() => {
        timer = setInterval(() => {
          current += 1; // Aggiungiamo un punto esatto alla volta
          setAnimatedScore(current);

          if (current >= target) {
            clearInterval(timer); // Fermati quando arrivi al voto!
          }
        }, stepTime);
      }, 500);

      // Pulizia di sicurezza
      return () => {
        clearTimeout(delayTimer);
        if (timer) clearInterval(timer);
      };
    }
  }, [showResults, results?.score]);


  // --- RENDER BOTTONE DINAMICO ---
  const renderActionButtons = () => {
    // CASO 1: GUEST CHE HA APPENA FINITO LA PROVA
    if (!isLoggedIn) {
      return (
        <button
          onClick={() => { setPaywallReason("guest"); setShowPaywall(true); }}
          className="bg-violet-600 hover:bg-violet-500 text-white py-3 px-8 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform animate-pulse"
        >
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" /> {t('saveAndContinue')}
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
          <Lock className="w-4 h-4" /> {t('unlockUnlimited')}
        </button>
      );
    }

    // CASO 3: TUTTO OK
    return (
      <button
        onClick={() => router.push("/dashboard")}
        className="bg-white text-black py-3 px-8 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <RefreshCw className="w-4 h-4" /> {t('plus10Dashboard')}
      </button>
    );
  };

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans text-slate-100">

      {/* Background Magico (Aumentata la profondità) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] left-[60%] w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <Header />

      <main className="z-10 flex-1 flex flex-col items-center pt-28 sm:pt-24 md:pt-28 px-4 pb-24 max-w-5xl mx-auto w-full">
        {/* HERO SECTION (Dinamica) */}
        {!quizData && (
          <div className="text-center mb-16 relative w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Badge con z-index alto + margine superiore aumentato */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-violet-300 mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.1)] relative z-50 mt-2 sm:mt-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>{t('heroBadge')}</span>
            </div>
            {/* Titolo Hero - Auto-height responsive */}
            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-6 leading-[1.1]">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
                {t('heroTitlePrefix')}
              </span>
              <br />
              <div className="relative inline-block w-full mt-2">
                {heroWords.map((word, i) => (
                  <span
                    key={i}
                    className={`block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-500 transition-all duration-700 ease-out ${i === wordIndex
                      ? 'relative opacity-100'
                      : 'absolute top-0 left-0 opacity-0'
                      }`}
                    style={{
                      transform: i === wordIndex
                        ? 'scale(1)'
                        : i === (wordIndex - 1 + heroWords.length) % heroWords.length
                          ? 'scale(0.9)'
                          : 'scale(0.9)'
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              {t('subtitle')} <br className="hidden md:block" />
            </p>
          </div>
        )}

        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />

        {/* UPLOAD BOX (Il Cuore dell'Esperienza) */}
        {!quizData && (
          <div className="relative w-full max-w-2xl animate-in slide-in-from-bottom-10 duration-1000 delay-150 fill-mode-both z-10">

            {/* Effetto alone dietro il box */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-[34px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

            <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 shadow-2xl">

              {/* --- BADGE STATUS --- */}
              {authChecked && !isLoggedIn && !trialUsed && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] backdrop-blur-xl z-20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{t('trialBadge')}</span>
                </div>
              )}

              {authChecked && !isLoggedIn && trialUsed && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 border border-red-500/30 text-red-300 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest z-20 flex items-center gap-1.5 shadow-xl backdrop-blur-xl">
                  <Lock className="w-3.5 h-3.5" /> {t('trialUsed')}
                </div>
              )}

              {/* CASO 1: BLOCCATO (Apre Paywall) */}
              {(!isLoggedIn && trialUsed) ? (
                <div
                  onClick={() => { setPaywallReason("guest"); setShowPaywall(true); }}
                  className="cursor-pointer border-2 border-dashed border-slate-700/50 rounded-[24px] p-10 md:p-14 flex flex-col items-center justify-center text-center transition-all min-h-[320px] hover:border-violet-500/30 hover:bg-white/[0.02] group"
                >
                  <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-inner group-hover:scale-110 transition-all duration-500 ease-out">
                    <Lock className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-3">
                    {t('guestPaywallTitle')}
                  </h3>
                  <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto mb-8 leading-relaxed">
                    {t('guestPaywallDesc')}
                  </p>

                  <button className="relative overflow-hidden px-8 py-4 rounded-2xl font-bold text-white bg-white/5 border border-violet-500/50 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_-5px_rgba(139,92,246,0.5)] transition-all duration-300 group-hover:bg-violet-600">
                    <span className="relative z-10 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-violet-300" /> {t('guestPaywallBtn')}
                    </span>
                  </button>
                </div>
              ) : (
                // CASO 2: ATTIVO (Dropzone)
                <label className="relative cursor-pointer border-2 border-dashed border-violet-500/30 rounded-[24px] p-10 md:p-14 flex flex-col items-center justify-center text-center transition-all min-h-[320px] hover:border-violet-400 hover:bg-violet-500/5 group">
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />

                  {loading ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                      <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                        <FileText className="absolute inset-0 m-auto w-8 h-8 text-violet-400 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">{t('loadingTitle')}</h3>
                      <p className="text-slate-400 mt-2 text-sm">{t('loadingDesc')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Icona Cloud con Super Animazione Premium */}
                      <div className="relative inline-block mb-6 group">
                        {/* Glow effect pulsante */}
                        <div className="absolute -inset-8 bg-violet-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />

                        {/* Outer ring rotating */}
                        <div className="absolute inset-0 rounded-full border-2 border-violet-400/20 scale-[1.6] opacity-0 group-hover:opacity-100 group-hover:scale-[2] group-hover:rotate-180 transition-all duration-1000 ease-out" />

                        {/* Middle ring counter-rotating */}
                        <div className="absolute inset-0 rounded-full border border-purple-400/30 scale-[1.3] opacity-0 group-hover:opacity-100 group-hover:scale-[1.6] group-hover:-rotate-90 transition-all duration-700 delay-75" />

                        {/* Main container */}
                        <div className="relative w-24 h-24 bg-gradient-to-br from-violet-600/20 to-purple-600/10 rounded-[2rem] flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-900/30 group-hover:shadow-2xl group-hover:shadow-violet-500/40 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-3 group-hover:rotate-3">

                          {/* Animated cloud icon */}
                          <UploadCloud
                            className="w-10 h-10 text-violet-400 group-hover:text-violet-300 transition-all duration-500 group-hover:scale-125 group-hover:rotate-6"
                            strokeWidth={1.5}
                          />

                          {/* Floating particles */}
                          {/* Floating particles - Solo Tailwind */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute top-[20%] left-[30%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                            <div className="absolute top-[40%] left-[70%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0.15s' }} />
                            <div className="absolute top-[60%] left-[50%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                            <div className="absolute top-[30%] left-[80%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0.45s' }} />
                            <div className="absolute top-[70%] left-[40%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
                            <div className="absolute top-[50%] left-[20%] w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '0.75s' }} />
                          </div>

                          {/* Inner glow pulse */}
                          <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-violet-500/0 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        {t('dropzoneTitle')}
                      </h3>
                      <p className="text-slate-400 text-sm mb-8">
                        {t('dropzoneDesc1')}<br />{t('dropzoneDesc2')} <span className="text-violet-400 underline decoration-violet-500/30 underline-offset-4 font-semibold">{t('dropzoneBrowse')}</span>
                      </p>
                    </>
                  )}
                </label>
              )}
            </div>

            {error && (
              <div className="mt-6 text-red-300 flex gap-3 justify-center items-center bg-red-500/10 py-3 px-5 rounded-xl border border-red-500/20 shadow-lg animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* QUIZ AREA (Stesso design premium della Dashboard) */}
        {quizData && (
          <div className="w-full max-w-3xl animate-in fade-in zoom-in-95 duration-500">

            {/* Risultati */}
            {showResults && (
              <div className="mb-10 bg-slate-900/60 backdrop-blur-xl border border-violet-500/30 rounded-[32px] p-10 text-center shadow-[0_20px_50px_-12px_rgba(139,92,246,0.2)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600" />
                <h2 className="text-2xl font-bold text-slate-300 mb-2 uppercase tracking-widest text-xs">{t('sessionResult')}</h2>
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 my-2 drop-shadow-lg">
                  {animatedScore}<span className="text-4xl text-slate-600">/{quizData.length}</span>
                </div>
                {results.weakTopics.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-slate-400 font-medium mb-4 text-sm">{t('suggestedReview')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {results.weakTopics.map((t, i) => (
                        <span key={i} className="bg-white/5 border border-white/10 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-medium">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lista Domande (Premium iOS Style) */}
            <div className="space-y-6">
              {quizData.map((q, qIdx) => {
                const isCorrect = userAnswers[qIdx] === q.answer;
                const hasAnswered = !!userAnswers[qIdx];

                return (
                  <div
                    key={qIdx}
                    className={`bg-slate-900/50 backdrop-blur-md border rounded-[24px] p-5 md:p-7 shadow-lg transition-all duration-500 ${showResults ? (isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5') : 'border-white/10'}`}
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold font-mono shadow-inner">
                          {qIdx + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        {q.topic && <span className="inline-block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{q.topic}</span>}
                        <h3 className="text-base md:text-lg font-medium text-slate-100 leading-relaxed">{q.question}</h3>
                      </div>
                    </div>

                    <div className="grid gap-2.5 ml-0 md:ml-12">
                      {q.options.map((opt: string, i: number) => {
                        const isSelected = userAnswers[qIdx] === opt;
                        const isTheCorrectOne = opt === q.answer;

                        let btnClass = "border-white/5 bg-white/[0.01] text-slate-300";
                        let glowColor = "rgba(139, 92, 246, 0.15)";

                        if (!showResults && isSelected) {
                          btnClass = "border-violet-500/50 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]";
                        }

                        if (showResults) {
                          if (isTheCorrectOne) {
                            btnClass = "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                            glowColor = "rgba(16, 185, 129, 0.2)";
                          } else if (isSelected) {
                            btnClass = "border-red-500/40 bg-red-500/10 text-red-200";
                            glowColor = "rgba(239, 68, 68, 0.15)";
                          } else {
                            btnClass = "border-transparent bg-transparent text-slate-500/40";
                            glowColor = "transparent";
                          }
                        }

                        return (
                          <button
                            key={i}
                            onClick={() => handleOptionClick(qIdx, opt)}
                            disabled={showResults}
                            onMouseMove={(e) => {
                              if (showResults) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`);
                              e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`);
                            }}
                            className={`group relative w-full text-left px-5 py-3.5 rounded-[16px] border text-sm md:text-base transition-all duration-300 flex justify-between items-center overflow-hidden ${showResults ? 'cursor-default' : 'hover:border-white/10 hover:text-white active:scale-[0.99]'} ${btnClass}`}
                          >
                            {!showResults && !isSelected && (
                              <div
                                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
                                style={{ background: `radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), ${glowColor}, transparent 40%)` }}
                              />
                            )}
                            <span className="relative z-10 pr-4">{opt}</span>

                            {showResults && isTheCorrectOne && <CheckCircle2 className="w-5 h-5 text-emerald-400 relative z-10 flex-shrink-0 animate-in zoom-in" />}
                            {showResults && isSelected && !isTheCorrectOne && <XCircle className="w-5 h-5 text-red-400 relative z-10 flex-shrink-0 animate-in zoom-in" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tip Section (Stile Insight Apple) */}
                    <div className="ml-0 md:ml-12 mt-5 pt-4 border-t border-white/5">
                      <button onClick={() => toggleTip(qIdx)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-violet-400 transition-colors">
                        <Lightbulb className={`w-4 h-4 ${expandedTips[qIdx] ? 'text-violet-400' : ''}`} />
                        {expandedTips[qIdx] ? tQuiz('hideTip') : tQuiz('showTip')}
                      </button>
                      {expandedTips[qIdx] && (
                        <div className="mt-3 text-sm leading-relaxed text-slate-300/90 bg-violet-500/5 border border-violet-500/30 px-4 py-3 rounded-xl shadow-inner animate-in fade-in slide-in-from-top-1">
                          {q.tip}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS (Flottanti ed Eleganti) */}
            <div className="sticky bottom-6 mt-12 flex flex-col items-center gap-4 z-40">

              {/* Contatore Quota Premium */}
              {isLoggedIn && (
                <div className="bg-[#0B0F19]/90 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10 text-xs font-medium text-slate-400 shadow-2xl">
                  {t('dailyQuota')} <span className={questionsUsedToday >= DAILY_LIMIT ? "text-red-400 font-bold" : "text-white font-bold"}>{questionsUsedToday}</span> / {DAILY_LIMIT} {t('questions')}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {!showResults ? (
                  <button
                    onClick={() => {
                      setShowResults(true);
                      // MAGIA: Scorrimento fluido verso l'alto
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={Object.keys(userAnswers).length < quizData.length}
                    className="group relative overflow-hidden bg-white text-slate-950 text-base font-bold py-4 px-10 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {t('finishAndSeeResults')} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setQuizData(null)}
                      className="bg-slate-800/80 backdrop-blur-lg text-white py-3.5 px-8 rounded-2xl font-semibold border border-white/10 hover:bg-slate-700 hover:border-white/20 transition-all active:scale-95"
                    >
                      {t('loadNewFile')}
                    </button>

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