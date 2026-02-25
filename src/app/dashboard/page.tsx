'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "../../lib/supabase";
import { Header } from "../../components/header";
import { generateMoreQuestionsAction, saveUserAnswerAction, getUserAnswersAction, deleteFileAction, resetQuizAnswersAction } from "../actions";
import { PaywallModal } from "../../components/paywall-modal";
import { Eraser, Download, Loader2, FileText, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Plus, Lightbulb, Trophy, Target, PieChart, Trash2, RotateCcw, Flame, Sparkles, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dati File
  const [files, setFiles] = useState<FileRow[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Dati Quiz & Risposte
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [streak, setStreak] = useState(0);
  const [expandedTips, setExpandedTips] = useState<{ [key: string]: boolean }>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // SINTETIZZATORE AUDIO (Genera i suoni via codice senza file mp3)
  const playSound = (type: 'correct' | 'wrong') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        // Suono "Ding!" felice (sale di tono)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // Nota Do
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Sale al La
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Suono "Boop" triste (scende di tono)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.log("Audio non supportato dal browser");
    }
  };

  // --- ESPORTAZIONE PDF PROFESSIONALE ---
  const handleExportPDF = () => {
    if (!questions.length) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 30;
    let pageNum = 1;

    // Funzione per disegnare l'intestazione e il footer su ogni pagina
    const addBranding = () => {
      // Header: Logo testuale
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(139, 92, 246); // Viola Uneedes
      doc.text("Uneedes AI", margin, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Esercitazione Personalizzata", margin + 35, 15);

      // Footer con link cliccabile
      doc.setFontSize(9);
      const footerText = `Generato con Uneedes AI - uneedes-ai.vercel.app   |   Pagina ${pageNum}`;
      const textWidth = doc.getTextWidth(footerText);
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });

      // Crea l'area cliccabile invisibile (ignorando i capricci di TypeScript)
      (doc as any).link((pageWidth / 2) - (textWidth / 2), pageHeight - 14, textWidth, 6, { url: 'https://uneedes-ai.vercel.app' });
    };

    addBranding();

    // Titolo del file
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const title = doc.splitTextToSize(`Quiz: ${selectedFile?.filename || "Documento"}`, pageWidth - margin * 2);
    doc.text(title, margin, y);
    y += (title.length * 8) + 10;

    // --- 1. STAMPA DELLE DOMANDE CON I CERCHIETTI (PAGINE INIZIALI) ---
    questions.forEach((q, index) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);

      const qText = `${index + 1}. ${q.question_text}`;
      const splitQ = doc.splitTextToSize(qText, pageWidth - margin * 2);

      // Controllo fine pagina
      if (y + (splitQ.length * 6) + (q.options.length * 6) > pageHeight - 20) {
        doc.addPage();
        pageNum++;
        addBranding();
        y = 30;
      }

      doc.text(splitQ, margin, y);
      y += (splitQ.length * 6) + 3;

      // Opzioni con i cerchietti vuoti
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);

      q.options.forEach((opt) => {
        const optText = doc.splitTextToSize(`O   ${opt}`, pageWidth - margin * 2 - 5);
        doc.text(optText, margin + 5, y);
        y += (optText.length * 6) + 1;
      });
      y += 8; // Spazio tra le domande
    });

    // --- 2. PAGINA SEPARATA DELLE SOLUZIONI E SPIEGAZIONI ---
    doc.addPage();
    pageNum++;
    addBranding();
    y = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(139, 92, 246);
    doc.text("Soluzioni e Spiegazioni", margin, y);
    y += 15;

    questions.forEach((q, index) => {
      // Controllo salto pagina per le soluzioni (alzato a 50 per sicurezza)
      if (y > pageHeight - 50) {
        doc.addPage();
        pageNum++;
        addBranding();
        y = 30;
      }

      // Stampa il Testo della Domanda
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const questionText = doc.splitTextToSize(`Domanda ${index + 1}: ${q.question_text}`, pageWidth - margin * 2);
      doc.text(questionText, margin, y);
      y += (questionText.length * 5) + 2;

      // Stampa la Risposta Esatta (Verde, senza simboli speciali per non rompere i margini)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129); // Verde
      const splitAnswer = doc.splitTextToSize(`Esatta: ${q.correct_answer}`, pageWidth - margin * 2 - 5);
      doc.text(splitAnswer, margin + 5, y);
      y += (splitAnswer.length * 5) + 2;

      // Stampa la Spiegazione (Grigio)
      if (q.explanation) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // Grigio
        const splitExp = doc.splitTextToSize(`Spiegazione: ${q.explanation}`, pageWidth - margin * 2 - 5);
        doc.text(splitExp, margin + 5, y);
        y += (splitExp.length * 5) + 8; // Spazio abbondante prima della prossima domanda
      } else {
        y += 8;
      }
    });

    // Salva il file
    const safeName = (selectedFile?.filename || "Quiz").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_uneedes.pdf`);
  };

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
        topicStats[topic].total++;

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
    const bestTopic = [...chartData].sort((a, b) => b.score - a.score)[0];
    const worstTopic = [...chartData].sort((a, b) => a.score - b.score)[0];

    let feedback = "Rispondi a qualche domanda per la tua analisi.";
    if (answeredCount > 0) {
      if (score >= 80) {
        feedback = `Ottimo lavoro! Sei un asso in ${bestTopic?.name || 'tutto'}, continua così! 🔥`;
      } else if (score >= 50) {
        feedback = `Buon andamento! Vai forte in ${bestTopic?.name || 'alcuni argomenti'}, ma occhio a ${worstTopic?.name || 'certe domande'}. 📚`;
      } else {
        feedback = `C'è margine di miglioramento. Ti consiglio di ripassare bene ${worstTopic?.name || 'gli appunti'}. 💪`;
      }
    }

    return {
      total: questions.length,
      answered: answeredCount,
      correct: correctCount,
      score,
      chartData,
      bestTopic,
      worstTopic,
      feedback               // Passiamo il messaggio
    };
  }, [questions, userAnswers]);


  // --- INTERAZIONI ---

  const handleAnswerClick = async (q: QuizQuestionRow, option: string) => {
    // 1. Aggiorna UI
    setUserAnswers(prev => ({ ...prev, [q.id]: option }));

    if (!userId) return;

    // 2. Salva DB
    const isCorrect = option === q.correct_answer;
    playSound(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0); // Sbagli? La serie si spegne!
    }
    await saveUserAnswerAction(userId, q.id, option, isCorrect);
  };

  const toggleTip = (qId: string) => {
    setExpandedTips(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // --- RIPASSA SOLO GLI ERRORI ---
  const handleRetryErrors = () => {
    const newAnswers = { ...userAnswers }; // Creiamo una copia delle risposte attuali
    let errorsFound = 0;
    setStreak(0);

    // Controlliamo ogni domanda
    questions.forEach(q => {
      const currentAnswer = newAnswers[q.id];
      // Se c'è una risposta ed è diversa da quella corretta...
      if (currentAnswer && currentAnswer !== q.correct_answer) {
        delete newAnswers[q.id]; // ...la cancelliamo!
        errorsFound++;
      }
    });

    if (errorsFound > 0) {
      setUserAnswers(newAnswers); // Aggiorniamo lo stato
      // Opzionale: un piccolo feedback sonoro per l'azione
      playSound('correct');
    }
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
    setStreak(0);
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

        {/* GRIGLIA PRINCIPALE RESPONSIVE */}
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] gap-6 h-auto lg:h-[calc(100vh-200px)] min-h-[500px]">

          {/* --- MOBILE: BOTTONE MENU FILE --- */}
          <div className="lg:hidden block w-full">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 border border-white/10 rounded-2xl text-slate-200 font-semibold backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <span className="truncate">{selectedFile ? selectedFile.filename : "Seleziona un file"}</span>
              </div>
              {isMobileMenuOpen ? <ChevronUp className="w-5 h-5 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 flex-shrink-0" />}
            </button>
          </div>

          {/* COLONNA SINISTRA: LISTA FILE (Desktop sempre visibile, Mobile a scomparsa) */}
          <section className={`bg-slate-900/70 border border-white/10 rounded-2xl flex-col overflow-hidden transition-all ${isMobileMenuOpen ? 'flex h-[400px] lg:h-auto' : 'hidden lg:flex'
            }`}>
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
                <p className="p-4 text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {filesError}
                </p>
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
                        <button
                          onClick={() => {
                            setSelectedFileId(file.id);
                            setIsMobileMenuOpen(false); // Chiude menu su mobile
                          }}
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
                              <span className="font-medium whitespace-nowrap">{file.filename}</span>
                              <div className="absolute right-0 top-0 h-5 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
                              <span className="text-[10px] text-slate-500">
                                {new Date(file.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {isActive && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 ml-auto" />}
                        </button>

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

          {/* COLONNA DESTRA: QUIZ (resto del codice rimane identico) */}
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative min-h-[600px] lg:min-h-0">

            {/* Header Quiz: UNIFIED DESIGN - Mobile = Desktop */}
            {selectedFile && (
              <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/70 border-b border-white/5">

                {/* Layout Unificato - 1 Riga per Tutti */}
                <div className="flex items-center justify-between px-3 md:px-5 py-2.5 gap-2 md:gap-4">

                  {/* Sinistra: Titolo + Info */}
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 md:w-7 md:h-7 bg-violet-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3 h-3 md:w-3.5 md:h-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs md:text-sm font-semibold text-white truncate">
                        {selectedFile.filename}
                      </h2>
                      <p className="text-[9px] md:text-[10px] text-slate-500 font-medium">
                        {questions.length} domande • {stats?.answered || 0} completate
                      </p>
                    </div>

                    {/* Streak Badge */}
                    {streak > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full flex-shrink-0">
                        <Flame className={`w-3.5 h-3.5 ${streak >= 3 ? 'animate-bounce text-orange-400' : 'text-orange-400'}`} />
                        <span className="text-xs font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>

                  {/* Destra: Azioni in Linea */}
                  <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">

                    {/* PDF - Solo Icona */}
                    <button
                      onClick={handleExportPDF}
                      className="p-2 bg-slate-800/40 hover:bg-slate-700/60 rounded-lg transition-all active:scale-95 flex-shrink-0"
                      title="Scarica PDF"
                    >
                      <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 hover:text-slate-300" />
                    </button>

                    {/* Pillola Errori/Reset Compatta */}
                    <div className="flex items-center bg-slate-800/40 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
                      {stats && stats.answered > 0 && stats.answered > stats.correct && (
                        <>
                          <button
                            onClick={handleRetryErrors}
                            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 rounded-md transition-all active:scale-95"
                          >
                            <Eraser className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-[10px] md:text-xs font-medium text-orange-300">Errori</span>
                          </button>
                          <div className="w-px h-4 bg-white/10" />
                        </>
                      )}
                      <button
                        onClick={handleResetQuiz}
                        className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 hover:bg-white/5 rounded-md transition-all active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">Reset</span>
                      </button>
                    </div>

                    {/* +10 Domande HERO - SEMPRE GRANDE E VISIBILE */}
                    <button
                      onClick={handleGenerateMore}
                      disabled={generating}
                      className="relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-900/60 flex-shrink-0 overflow-hidden"
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white relative z-10" />
                      ) : (
                        <Plus className="w-4 h-4 text-white relative z-10" />
                      )}
                      <span className="text-xs md:text-sm font-bold text-white whitespace-nowrap relative z-10">
                        +10 Domande
                      </span>
                    </button>
                  </div>
                </div>

                {/* Streak Mobile (Solo se nascosto sopra) */}
                {streak > 0 && (
                  <div className="sm:hidden flex justify-center pb-2 px-3">
                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                      <Flame className={`w-3 h-3 ${streak >= 3 ? 'animate-bounce text-orange-400' : 'text-orange-400'}`} />
                      <span className="text-xs font-bold text-orange-400">{streak} in serie!</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BARRA PROGRESSI MODIFICATA (Spazi ravvicinati) */}
            {stats && stats.total > 0 && (
              <div className="flex flex-col gap-3 mx-4 md:mx-6 mt-4 mb-2">

                {/* Griglia a 3 colonne */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-800/50 p-3 rounded-xl border border-white/5">
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

                  {/* Da ripassare */}
                  <div className="col-span-2 md:col-span-1 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400 flex-shrink-0">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Da ripassare</p>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-tight">
                        {stats.worstTopic ? stats.worstTopic.name : "Tutto ok! 🎉"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Feedback */}
                {stats.answered > 0 && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-xl text-sm flex items-start md:items-center gap-3 animate-in fade-in">
                    <Sparkles className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5 md:mt-0" />
                    <p className="font-medium">{stats.feedback}</p>
                  </div>
                )}
              </div>
            )}
            {/* Fine Barra Progressi */}

            {/* GRAFICO ARGOMENTI */}
            {stats && stats.chartData.length > 0 && (
              <div className="mx-4 md:mx-6 mb-4 bg-slate-900/40 rounded-xl border border-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4">

                {/* Bottone per aprire/chiudere */}
                <button
                  onClick={() => setIsGraphExpanded(!isGraphExpanded)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-slate-300">
                      Andamento per Argomento
                    </h3>
                  </div>
                  {isGraphExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {/* Corpo del Grafico (visibile solo se espanso) */}
                {isGraphExpanded && (
                  <div className="p-5 pt-0 h-[220px] w-full border-t border-white/5 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorViolet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                          formatter={(value: any) => [`${value}%`, 'Esatte']}
                        />
                        <Bar dataKey="score" fill="url(#colorViolet)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
            {/* Fine Grafico */}

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