'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Header } from "../../components/header";
import { generateMoreQuestionsAction, saveUserAnswerAction, getUserAnswersAction, deleteFileAction, resetQuizAnswersAction } from "../actions";
import { PaywallModal } from "../../components/paywall-modal";
import { Loader2, FileText, ChevronRight, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Plus, Lightbulb, Trophy, Target, PieChart, Trash2, RotateCcw } from "lucide-react";

type FileRow = {
  id: string;
  filename: string;
  file_size: number | null;
  page_count: number | null;
  uploaded_at: string;
};

type QuizQuestionRow = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  topic: string | null;
  created_at?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  // Stati Auth & UI
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"daily" | null>(null);

  // Dati File
  const [files, setFiles] = useState<FileRow[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Dati Quiz & Risposte
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [expandedTips, setExpandedTips] = useState<{ [key: string]: boolean }>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // 1. Check Auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);
      setLoadingUser(false);
    };
    checkAuth();
  }, [router]);

  // 2. Fetch Files
  useEffect(() => {
    if (!userId) return;
    const loadFiles = async () => {
      setFilesLoading(true);
      setFilesError(null);
      const { data, error } = await supabase
        .from("files")
        .select("id, filename, file_size, uploaded_at")
        .eq("user_id", userId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        setFilesError("Impossibile caricare i file");
      } else {
        setFiles((data || []) as FileRow[]);
        if (data && data.length > 0 && !selectedFileId) setSelectedFileId(data[0].id);
      }
      setFilesLoading(false);
    };
    loadFiles();
  }, [userId]);

  // 3. Fetch Quiz E RISPOSTE (Funzione Corretta)
  const loadQuestions = async () => {
    if (!selectedFileId || !userId) return;

    setQuestionsLoading(true);
    setQuestionsError(null);
    setUserAnswers({});
    setExpandedTips({});

    // 1. Scarica le DOMANDE
    const { data: qData, error } = await supabase
      .from("quiz_questions")
      .select("id, question_text, options, correct_answer, explanation, topic, created_at")
      .eq("file_id", selectedFileId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Errore domande:", error);
      setQuestionsError("Errore caricamento quiz");
      setQuestionsLoading(false);
      return;
    }

    // 2. Scarica le RISPOSTE (Via Server Action per evitare blocchi RLS)
    const questionIds = qData?.map(q => q.id) || [];
    let answerMap: { [key: string]: string } = {};

    if (questionIds.length > 0) {
      // Chiamiamo la server action invece di supabase client
      const { data: aData } = await getUserAnswersAction(userId, questionIds);

      if (aData) {
        aData.forEach((a: any) => {
          answerMap[a.question_id] = a.user_answer;
        });
      }
    }

    setQuestions((qData || []) as QuizQuestionRow[]);
    setUserAnswers(answerMap);
    setQuestionsLoading(false);
  };

  // Trigger caricamento quando cambia file
  useEffect(() => {
    loadQuestions();
  }, [selectedFileId, userId]);


// --- CALCOLO STATISTICHE AVANZATE ---
const stats = useMemo(() => {
  if (!questions.length) return null;
  
  let correctCount = 0;
  let answeredCount = 0;
  
  // Mappa per argomenti: { "Matematica": { total: 10, correct: 8 } }
  let topicStats: { [key: string]: { total: number; correct: number } } = {};

  questions.forEach(q => {
    const answer = userAnswers[q.id];
    const topic = q.topic || "Generale";

    if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
    
    if (answer) {
      answeredCount++;
      topicStats[topic].total++; // Contiamo solo se risposte, o vuoi contare tutte? Qui conto le risposte date.
      
      const isCorrect = answer === q.correct_answer;
      if (isCorrect) {
        correctCount++;
        topicStats[topic].correct++;
      }
    }
  });

  const score = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  
  // Preparazione dati per il Grafico
  const chartData = Object.keys(topicStats).map(topic => {
    const t = topicStats[topic];
    const percentage = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
    return { name: topic, score: percentage, total: t.total };
  }).filter(d => d.total > 0); // Mostra solo argomenti dove hai risposto

  // Analisi "Sei forte in..."
  const bestTopic = [...chartData].sort((a,b) => b.score - a.score)[0];
  const worstTopic = [...chartData].sort((a,b) => a.score - b.score)[0];

  return { 
    total: questions.length, 
    answered: answeredCount, 
    correct: correctCount, 
    score, 
    chartData,
    bestTopic,
    worstTopic
  };
}, [questions, userAnswers]);


  // --- INTERAZIONI ---

  const handleAnswerClick = async (q: QuizQuestionRow, option: string) => {
    // 1. Aggiorna UI
    setUserAnswers(prev => ({ ...prev, [q.id]: option }));

    if (!userId) return;

    // 2. Salva DB
    const isCorrect = option === q.correct_answer;
    await saveUserAnswerAction(userId, q.id, option, isCorrect);
  };

  const toggleTip = (qId: string) => {
    setExpandedTips(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleGenerateMore = async () => {
    if (!selectedFileId || !userId) return;
    setGenerating(true);
    const result = await generateMoreQuestionsAction(selectedFileId, userId);

    if ((result as any).limitReached) {
      setPaywallReason("daily");
      setShowPaywall(true);
    } else if ((result as any).success) {
      await loadQuestions();
    }
    setGenerating(false);
  };

  // DELETE & RESET
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo file? Perderai tutte le domande e le risposte.")) return;
    if (!userId) return;

    const result = await deleteFileAction(fileId, userId);
    if ((result as any).success) {
      // Aggiorna stato locale rimuovendo il file
      setFiles(prev => prev.filter(f => f.id !== fileId));
      // Se stavo guardando quel file, resetto la vista
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setQuestions([]);
      }
    } else {
      alert("Errore durante l'eliminazione.");
    }
  };

  const handleResetQuiz = async () => {
    if (!confirm("Vuoi cancellare tutte le tue risposte e ricominciare da zero?")) return;
    if (!selectedFileId || !userId) return;

    const result = await resetQuizAnswersAction(selectedFileId, userId);
    if ((result as any).success) {
      // Resetta stato locale immediato
      setUserAnswers({});
    } else {
      alert("Errore durante il reset.");
    }
  };

  const selectedFile = files.find(f => f.id === selectedFileId);
  // --- RENDER ---
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-[40vw] h-[40vw] bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <Header />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />

      <main className="z-10 flex-1 flex flex-col pt-8 px-4 pb-16 max-w-6xl mx-auto w-full gap-6">

        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">La tua Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1 hidden sm:block">
              Seleziona un file a sinistra per esercitarti o generare nuove domande.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> Home
          </button>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-6 h-[calc(100vh-200px)] min-h-[500px]">

          {/* COLONNA SINISTRA: LISTA FILE */}
          <section className="bg-slate-900/70 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-slate-900/50">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-400" />
                I tuoi file ({files.length})
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filesLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Caricamento...
                </div>
              ) : filesError ? (
                <p className="p-4 text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {filesError}</p>
              ) : files.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  Non hai ancora file.<br />Vai in Home per caricarne uno!
                </div>
              ) : (
                <ul className="space-y-1">
                  {files.map((file) => {
                    const isActive = file.id === selectedFileId;
                    return (
                      <li key={file.id} className="relative flex items-center gap-2">
                        {/* BOTTONE FILE (non copre più tutto) */}
                        <button
                          onClick={() => setSelectedFileId(file.id)}
                          className={`flex-1 text-left flex items-center gap-3 px-3 py-3 rounded-xl border text-sm transition-all ${isActive
                            ? "border-violet-500/50 bg-violet-500/10 text-white shadow-lg shadow-violet-900/20"
                            : "border-transparent hover:bg-slate-800/70 hover:border-white/5 text-slate-300"
                            }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${isActive ? 'bg-violet-600 shadow-lg shadow-violet-600/30' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                              }`}>
                              PDF
                            </div>
                            <div className="flex flex-col overflow-hidden max-w-[180px] md:max-w-[250px] relative">
                              <span className="font-medium whitespace-nowrap">
                                {file.filename}
                              </span>
                              {/* Gradient fade */}
                              <div className="absolute right-0 top-0 h-5 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />

                              <span className="text-[10px] text-slate-500">
                                {new Date(file.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {isActive && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0" />}
                        </button>

                        {/* CESTINO SEMPRE VISIBILE */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="flex-shrink-0 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Elimina file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* COLONNA DESTRA: QUIZ INTERATTIVO */}
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative">

            {/* Header Quiz: Titolo File + Bottone +10 */}
            {selectedFile && (
              <div className="p-4 border-b border-white/5 bg-slate-900/80 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                <div>
                  <h2 className="text-base font-bold text-white truncate max-w-[200px] md:max-w-xs">
                    {selectedFile.filename}
                  </h2>
                  <p className="text-xs text-slate-400">{questions.length} domande totali</p>
                </div>
                <button
                  onClick={handleResetQuiz}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-white/5"
                  title="Cancella le risposte e ricomincia"
                >
                  <RotateCcw className="w-3 h-3" /> Ricomincia
                </button>
                <button
                  onClick={handleGenerateMore}
                  disabled={generating}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-violet-900/20 transition-all hover:scale-105"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {generating ? "Sto creando..." : "Genera +10"}
                </button>
              </div>
            )}
            {/* BARRA PROGRESSI */}
            {stats && stats.total > 0 && (
              <div className="grid grid-cols-3 gap-4 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stats.score >= 60 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Punteggio</p>
                    <p className="text-lg font-bold text-white">{stats.score}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Completato</p>
                    <p className="text-lg font-bold text-white">{stats.answered}/{stats.total}</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div className="hidden md:block overflow-hidden">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Da ripassare</p>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {/* Se esiste un worstTopic, mostriamo il nome, altrimenti "Tutto ok" */}
                      {stats.worstTopic ? stats.worstTopic.name : "Tutto ok! 🎉"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {!selectedFileId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p>Seleziona un file per vedere le domande.</p>
                </div>
              ) : questionsLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  <span>Caricamento domande...</span>
                </div>
              ) : questionsError ? (
                <p className="text-red-400 flex items-center justify-center gap-2 mt-10"><AlertCircle className="w-5 h-5" /> {questionsError}</p>
              ) : questions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p>Nessuna domanda trovata.</p>
                  <button onClick={handleGenerateMore} className="text-violet-400 hover:underline mt-2">Generane subito 10 nuove!</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((q, index) => {
                    // Logica stato risposta
                    const userAnswer = userAnswers[q.id];
                    const hasAnswered = !!userAnswer;
                    const isCorrect = userAnswer === q.correct_answer;

                    return (
                      <div key={q.id} className="bg-slate-900 border border-white/5 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2">

                        {/* Testo Domanda */}
                        <div className="flex gap-3 mb-4">
                          <span className="bg-slate-800 text-slate-400 font-mono text-xs px-2 py-1 rounded-lg h-fit">#{index + 1}</span>
                          <div>
                            <p className="text-base font-medium text-slate-100">{q.question_text}</p>
                            {q.topic && <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 block">{q.topic}</span>}
                          </div>
                        </div>

                        {/* Opzioni */}
                        <div className="grid gap-2 pl-0 md:pl-10">
                          {q.options.map((opt) => {
                            const isSelected = userAnswer === opt;
                            const isTheCorrectOne = opt === q.correct_answer;

                            // Classi dinamiche per i colori
                            let btnClass = "border-white/5 bg-slate-800/40 text-slate-300 hover:bg-slate-800"; // Default

                            if (hasAnswered) {
                              if (isTheCorrectOne) btnClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"; // Verde
                              else if (isSelected && !isCorrect) btnClass = "border-red-500/50 bg-red-500/10 text-red-300"; // Rossa
                              else btnClass = "border-transparent opacity-50"; // Altre spente
                            }

                            return (
                              <button
                                key={opt}
                                onClick={() => handleAnswerClick(q, opt)}
                                disabled={hasAnswered}
                                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex justify-between items-center ${btnClass}`}
                              >
                                <span>{opt}</span>
                                {hasAnswered && isTheCorrectOne && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                {hasAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tip / Spiegazione */}
                        <div className="pl-0 md:pl-10 mt-3">
                          <button
                            onClick={() => toggleTip(q.id)}
                            className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1 transition-colors"
                          >
                            <Lightbulb className="w-3 h-3" /> {expandedTips[q.id] ? "Nascondi spiegazione" : "Mostra spiegazione"}
                          </button>
                          {expandedTips[q.id] && (
                            <div className="mt-2 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-white/5 animate-in fade-in">
                              <span className="text-yellow-500 font-bold">Spiegazione:</span> {q.explanation || "Nessuna spiegazione disponibile."}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}

                  {/* Footer lista domande */}
                  <div className="py-8 text-center">
                    <button
                      onClick={handleGenerateMore}
                      disabled={generating}
                      className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-2 mx-auto"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Genera altre domande
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}