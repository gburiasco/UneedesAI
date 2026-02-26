'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "../../lib/supabase";
import { Header } from "../../components/header";
import { generateMoreQuestionsAction, saveUserAnswerAction, getUserAnswersAction, deleteFileAction, resetQuizAnswersAction } from "../actions";
import { PaywallModal } from "../../components/paywall-modal";
import { X, Eraser, Download, Loader2, FileText, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Plus, Lightbulb, Trophy, Target, PieChart, Trash2, RotateCcw, Flame, Sparkles, BarChart3 } from "lucide-react";
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFileDrawer, setShowFileDrawer] = useState(false);
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
  const handleExportPDF = async () => {
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
    // --- SALVATAGGIO (Versione Premium Mobile-First) ---
    const rawName = selectedFile?.filename || "Documento";
    const cleanName = rawName.replace(/\.[^/.]+$/, "").replace(/[\\/:*?"<>|]/g, "").trim();
    const fileName = `${cleanName} - Quiz by Uneedes.pdf`;

    // 1. Trasformiamo il PDF in dati grezzi (Blob) invece di forzare il download
    const pdfBlob = doc.output('blob');

    // 2. Capiamo se l'utente è su uno smartphone/tablet
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      try {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        // Controlliamo se il telefono supporta il menu di condivisione nativo
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
          });
        } else {
          // Fallback per telefoni più vecchi: apre il PDF nel lettore nativo del telefono
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
        }
      } catch (error) {
        // Se l'utente chiude la tendina o c'è un errore, tentiamo il download classico
        console.log("Condivisione annullata o non supportata", error);
        doc.save(fileName);
      }
    } else {
      // Su PC usiamo il salvataggio classico che funziona sempre
      doc.save(fileName);
    }
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

  // Mostra bottone scroll-to-top quando scrolli
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      {/* --- DRAWER LATERALE FILE (Apple iOS Premium Style) --- */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-in-out ${showFileDrawer ? 'visible' : 'invisible'}`}>
        {/* Backdrop (Vetro scuro) */}
        <div onClick={() => setShowFileDrawer(false)} className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-500 ease-out ${showFileDrawer ? 'opacity-100' : 'opacity-0'}`}/>

        {/* Pannello Drawer */}
        <div className={`absolute top-0 left-0 h-full w-[85vw] max-w-[360px] bg-[#0B0F19]/80 backdrop-blur-2xl border-r border-white/10 shadow-[30px_0_60px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${showFileDrawer ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Header Minimalista */}
          <div className="pt-8 pb-4 px-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Documenti</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">{files.length} file caricati</p>
            </div>
            <button
              onClick={() => setShowFileDrawer(false)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista File Scorrevole */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 custom-scrollbar">
            {filesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                <span className="text-sm font-medium">Sincronizzazione in corso...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                  <FileText className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-base text-slate-200 font-semibold">Il tuo archivio è vuoto</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Torna alla Home per caricare il tuo primo documento e iniziare a studiare.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 pb-4">
                {files.map((file) => {
                  const isActive = file.id === selectedFileId;
                  return (
                    <li key={file.id} className="relative group flex items-center gap-2">

                      {/* Card File Interattiva */}
                      <button
                        onClick={() => {
                          setSelectedFileId(file.id);
                          setShowFileDrawer(false);
                        }}
                        className={`flex-1 min-w-0 text-left flex items-center gap-3.5 p-3 rounded-[20px] border transition-all duration-200 active:scale-[0.98] ${isActive
                            ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-purple-500/5 shadow-lg shadow-violet-900/20"
                            : "border-transparent bg-white/[0.03] hover:bg-white/[0.06] text-slate-300"
                          }`}
                      >
                        {/* Icona Appunto/Documento (Sostituisce la scritta PDF) */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner ${isActive
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/5'
                          }`}>
                          <FileText className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                        </div>

                        {/* Testi (Nome File e Data) */}
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className={`text-sm truncate transition-colors ${isActive ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                            {file.filename}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                            {new Date(file.uploaded_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Indicatore Attivo */}
                        {isActive && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mr-1" />}
                      </button>

                      {/* Bottone Cestino Esterno (Subdolo, si accende al passaggio/tocco) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                        className="flex-shrink-0 p-3.5 text-slate-500 hover:text-red-400 hover:bg-red-500/15 bg-white/[0.02] border border-transparent hover:border-red-500/20 rounded-[18px] transition-all active:scale-90"
                        title="Elimina file"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer Brandizzato Uneedes */}
          <div className="mt-auto p-5 border-t border-white/5 bg-gradient-to-t from-slate-950/80 to-transparent">
            <div className="flex items-center justify-center gap-2 text-slate-400/80 hover:text-slate-300 transition-colors cursor-default">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-widest">Uneedes AI</span>
            </div>
          </div>
        </div>
      </div>

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

          {/* COLONNA SINISTRA: LISTA FILE (Desktop Premium UI) */}
          <section className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl flex-col overflow-hidden hidden lg:flex h-full">
            
            {/* Header Desktop Elegante */}
            <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-md shadow-violet-900/40">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">I tuoi documenti</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-white/5">
                {files.length}
              </span>
            </div>

            {/* Lista File Scorrevole */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filesLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  <span className="text-sm font-medium">Caricamento in corso...</span>
                </div>
              ) : filesError ? (
                <div className="p-4 m-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {filesError}
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                    <FileText className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base text-slate-200 font-semibold">Il tuo archivio è vuoto</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Vai in Home per caricarne uno e iniziare a studiare!
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {files.map((file) => {
                    const isActive = file.id === selectedFileId;
                    return (
                      <li key={file.id} className="relative group flex items-center gap-2">
                        
                        {/* Card File Interattiva */}
                        <button
                          onClick={() => setSelectedFileId(file.id)}
                          className={`flex-1 min-w-0 text-left flex items-center gap-3.5 p-3 rounded-[20px] border transition-all duration-200 active:scale-[0.98] ${
                            isActive
                              ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-purple-500/5 shadow-lg shadow-violet-900/20"
                              : "border-transparent bg-white/[0.03] hover:bg-white/[0.06] text-slate-300"
                          }`}
                        >
                          {/* Icona Appunto/Documento (Apple Style) */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner ${
                            isActive 
                              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30' 
                              : 'bg-white/5 text-slate-400 border border-white/5 group-hover:text-slate-300'
                          }`}>
                            <FileText className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                          </div>

                          {/* Testi (Nome File e Data con taglio intelligente) */}
                          <div className="flex flex-col flex-1 min-w-0 pr-2">
                            <span className={`text-sm truncate transition-colors ${isActive ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                              {file.filename}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                              Caricato il {new Date(file.uploaded_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          
                          {/* Indicatore Attivo */}
                          {isActive && <ChevronRight className="w-4 h-4 text-violet-400 flex-shrink-0 mr-1" />}
                        </button>

                        {/* Bottone Cestino Esterno (Magia Desktop: Appare solo all'hover o se è attivo) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className={`flex-shrink-0 p-3.5 text-slate-500 hover:text-red-400 hover:bg-red-500/15 bg-white/[0.02] border border-transparent hover:border-red-500/20 rounded-[18px] transition-all active:scale-90 ${
                            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Elimina file"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            {/* Piccolo Footer Sfumato inferiore (Opzionale, dà un tocco di chiusura) */}
            <div className="h-4 w-full bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none absolute bottom-0"></div>
          </section>

          {/* COLONNA DESTRA: QUIZ */}
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative min-h-[600px] lg:min-h-0">

            {/* Header Quiz: MOBILE 2 RIGHE + DESKTOP 1 RIGA */}
            {selectedFile && (
              <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/70 border-b border-white/5">

                {/* MOBILE: 2 Righe Separate */}
                <div className="lg:hidden flex flex-col p-3 gap-2.5">

                  {/* Riga 1: Menu Hamburger + Titolo */}
                  <div className="flex items-center gap-2">
                    {/* Hamburger Menu */}
                    <button
                      onClick={() => setShowFileDrawer(true)}
                      className="p-2 bg-slate-800/50 hover:bg-slate-700/60 rounded-lg transition-all active:scale-95 flex-shrink-0"
                    >
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-white truncate leading-tight">
                          {selectedFile.filename}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {questions.length} domande • {stats?.answered || 0} fatte
                        </p>
                      </div>
                    </div>

                    {/* Streak */}
                    {streak > 0 && (
                      <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>

                  {/* Riga 2: Azioni Ben Spaziate */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">

                    {/* PDF */}
                    <button onClick={handleExportPDF} className="flex items-center justify-center w-7 h-7 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 rounded-lg transition-all active:scale-95 flex-shrink-0" title="Scarica PDF">
                      <Download className="w-3.5 h-3.5 md:w-4 md:h4 text-slate-400 hover:text-slate-300" />
                    </button>

                    {/* Errori/Reset */}
                    <div className="flex items-center bg-slate-800/50 rounded-lg p-0.5 gap-0.5">
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

                    {/* +10 Domande HERO */}
                    <button onClick={handleGenerateMore} disabled={generating} className="relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-900/60 flex-shrink-0 overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {generating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                      <span className="text-xs font-semibold text-white">10 Domande</span>
                    </button>
                  </div>
                </div>

                {/* DESKTOP: 1 Riga Orizzontale */}
                <div className="hidden lg:flex items-center justify-between px-5 py-2.5 gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-white truncate max-w-[400px]">
                        {selectedFile.filename}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {questions.length} domande • {stats?.answered || 0} completate
                      </p>
                    </div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                        <Flame className={`w-3.5 h-3.5 ${streak >= 3 ? 'animate-bounce text-orange-400' : 'text-orange-400'}`} />
                        <span className="text-xs font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>


                  <div className="flex items-center gap-2">
                    <button onClick={handleExportPDF} className="p-2 bg-slate-800/40 hover:bg-slate-700/60 rounded-lg transition-all">
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="flex items-center bg-slate-800/40 rounded-lg p-0.5 gap-0.5">
                      {stats && stats.answered > 0 && stats.answered > stats.correct && (
                        <>
                          <button onClick={handleRetryErrors} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 rounded-md transition-all">
                            <Eraser className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-xs font-medium text-orange-300">Errori</span>
                          </button>
                          <div className="w-px h-4 bg-white/10" />
                        </>
                      )}
                      <button onClick={handleResetQuiz} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-md transition-all">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-300">Reset</span>
                      </button>
                    </div>
                    <button onClick={handleGenerateMore} disabled={generating} className="relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-900/60 flex-shrink-0 overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {generating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                      <span className="text-xs font-semibold text-white">10 Domande</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* BARRA PROGRESSI E RESTO DEL CODICE... */}

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

            {/* CORPO DOMANDE (Design Compatto + Effetto Hover Dinamico) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              {!selectedFileId ? (
                /* Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-white/[0.02] border border-white/5 shadow-xl flex items-center justify-center mb-5">
                    <FileText className="w-8 h-8 text-slate-600" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Nessun documento selezionato</h3>
                  <p className="text-slate-400 mt-2 max-w-sm text-sm">
                    Scegli un file dalla libreria a sinistra per visualizzare il quiz.
                  </p>
                </div>
              ) : questionsLoading ? (
                /* Caricamento */
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 gap-4 animate-in fade-in">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                  <span className="text-sm font-medium tracking-wide">Generazione in corso...</span>
                </div>
              ) : questionsError ? (
                /* Errore */
                <div className="p-5 mt-10 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center animate-in fade-in">
                  <AlertCircle className="w-8 h-8 text-red-400 mb-2" /> 
                  <p className="text-red-400/90 text-sm font-medium">{questionsError}</p>
                </div>
              ) : questions.length === 0 ? (
                /* Nessuna Domanda */
                <div className="h-full flex flex-col items-center justify-center text-center py-10 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5">
                    <Sparkles className="w-6 h-6 text-violet-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200">Pronto per iniziare?</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-5">Non ci sono ancora domande per questo file.</p>
                  <button 
                    onClick={handleGenerateMore} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Genera le prime 10
                  </button>
                </div>
              ) : (
                /* LISTA DOMANDE (Compatta) */
                <div className="space-y-5 max-w-3xl mx-auto pb-10">
                  {questions.map((q, index) => {
                    const userAnswer = userAnswers[q.id];
                    const hasAnswered = !!userAnswer;
                    const isCorrect = userAnswer === q.correct_answer;

                    return (
                      <div 
                        key={q.id} 
                        className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        {/* --- INTESTAZIONE DOMANDA (Adattiva Mobile/Desktop) --- */}
                        <div className="flex flex-col md:flex-row md:items-start gap-2.5 md:gap-4 mb-4 md:mb-5">
                          
                          {/* RIGA 1 (Mobile) / SINISTRA (PC): Badge Numerico */}
                          <div className="flex items-center gap-3 md:mt-0.5 md:flex-shrink-0">
                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold font-mono shadow-inner flex-shrink-0">
                              {index + 1}
                            </div>
                            
                            {/* Argomento: Mostrato a fianco del numero SOLO su telefono */}
                            {q.topic && (
                              <span className="md:hidden inline-block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {q.topic}
                              </span>
                            )}
                          </div>
                          
                          {/* RIGA 2 (Mobile) / DESTRA (PC): Testo Domanda */}
                          <div className="flex-1 w-full mt-1 md:mt-0">
                            
                            {/* Argomento: Mostrato sopra la domanda SOLO su PC */}
                            {q.topic && (
                              <span className="hidden md:inline-block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                {q.topic}
                              </span>
                            )}
                            <h3 className="text-sm md:text-base font-medium text-slate-100 leading-snug">
                              {q.question_text}
                            </h3>
                          </div>
                        </div>

                        {/* --- GRIGLIA OPZIONI --- */}
                        {/* Su mobile parte dal margine (ml-0), su PC rientra (md:ml-11) per allinearsi al testo */}
                        <div className="grid gap-1.5 ml-0 md:ml-11">
                          {q.options.map((opt) => {
                            const isSelected = userAnswer === opt;
                            const isTheCorrectOne = opt === q.correct_answer;
                            
                            let btnClass = "border-white/5 bg-white/[0.01] text-slate-300"; 
                            let glowColor = "rgba(139, 92, 246, 0.15)"; 
                            
                            if (hasAnswered) {
                              if (isTheCorrectOne) {
                                btnClass = "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                                glowColor = "rgba(16, 185, 129, 0.2)"; 
                              } else if (isSelected && !isCorrect) {
                                btnClass = "border-red-500/40 bg-red-500/10 text-red-200";
                                glowColor = "rgba(239, 68, 68, 0.15)"; 
                              } else {
                                btnClass = "border-transparent bg-transparent text-slate-500/40";
                                glowColor = "transparent"; 
                              }
                            }

                            return (
                              <button
                                key={opt}
                                onClick={() => handleAnswerClick(q, opt)}
                                disabled={hasAnswered}
                                onMouseMove={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const y = e.clientY - rect.top;
                                  e.currentTarget.style.setProperty('--x', `${x}px`);
                                  e.currentTarget.style.setProperty('--y', `${y}px`);
                                }}
                                className={`group relative w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-300 flex justify-between items-center overflow-hidden ${hasAnswered ? 'cursor-default' : 'hover:border-white/10 hover:text-white active:scale-[0.99]'} ${btnClass}`}
                              >
                                {!hasAnswered && (
                                  <div 
                                    className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
                                    style={{ background: `radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), ${glowColor}, transparent 40%)` }}
                                  />
                                )}
                                {hasAnswered && isTheCorrectOne && (
                                  <div 
                                    className="pointer-events-none absolute inset-0 opacity-100 z-0"
                                    style={{ background: `radial-gradient(800px circle at 0% 50%, ${glowColor}, transparent 100%)` }}
                                  />
                                )}

                                <span className="relative z-10 pr-4 leading-relaxed">{opt}</span>
                                
                                {hasAnswered && isTheCorrectOne && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 relative z-10 flex-shrink-0 animate-in zoom-in" />
                                )}
                                {hasAnswered && isSelected && !isCorrect && (
                                  <XCircle className="w-4 h-4 text-red-400 relative z-10 flex-shrink-0 animate-in zoom-in" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* --- SEZIONE SPIEGAZIONE --- */}
                        {/* Anche qui: ml-0 su mobile, ml-11 su PC */}
                        <div className="ml-0 md:ml-11 mt-4">
                          <button
                            onClick={() => toggleTip(q.id)}
                            className="text-xs font-medium text-slate-400 hover:text-violet-400 flex items-center gap-1.5 transition-colors"
                          >
                            <Lightbulb className={`w-3.5 h-3.5 ${expandedTips[q.id] ? 'text-violet-400' : ''}`} /> 
                            {expandedTips[q.id] ? "Chiudi spiegazione" : "Mostra spiegazione"}
                          </button>
                          
                          {/* Box Insight Tutto Tondo e Bordo Viola */}
                          {expandedTips[q.id] && (
                            <div className="mt-3 text-xs md:text-sm leading-relaxed text-slate-300/90 bg-violet-500/5 border border-violet-500/40 px-4 py-3 rounded-xl shadow-sm shadow-violet-900/20 animate-in fade-in slide-in-from-top-1">
                              {q.explanation || "Nessuna spiegazione dettagliata disponibile."}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}

                  {/* Footer Pulsante Minimal */}
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={handleGenerateMore}
                      disabled={generating}
                      className="group flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-violet-500/30 rounded-full transition-all active:scale-95 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-violet-400 group-hover:text-violet-300" />
                      )}
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                        {generating ? "Generazione..." : "Genera altre 10"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      {/* BOTTONE SCROLL TO TOP (Floating) */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="lg:hidden fixed bottom-6 right-6 z-30 p-3 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full shadow-2xl shadow-violet-900/60 transition-all active:scale-90 animate-in fade-in slide-in-from-bottom-4"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}