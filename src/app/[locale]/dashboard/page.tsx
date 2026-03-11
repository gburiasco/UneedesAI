'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { supabase } from "../../../lib/supabase";
import { Header } from "../../../components/header";
import { generateMoreQuestionsAction, saveUserAnswerAction, getUserAnswersAction, deleteFileAction, resetQuizAnswersAction } from "../../actions";
import { PaywallModal } from "../../../components/paywall-modal";
import { X, Eraser, Download, Loader2, FileText, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Plus, Lightbulb, Trophy, Target, PieChart, Trash2, RotateCcw, Flame, Sparkles, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Metadata } from 'next'

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

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await useTranslations('Metadata');
  
  return {
    title: t('dashboardTitle'),
    description: t('dashboardDescription'),
    alternates: {
      canonical: `https://uneedes-ai.vercel.app/${locale}/dashboard`
    },
    robots: {
      index: false,  
      follow: false,
      noarchive: true,
      nosnippet: true
    }
  };
}

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
  const t = useTranslations('dashboard');
  const quiz = useTranslations('quiz');

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

  // Stati Export PDF Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState({
    includeQuestions: true,
    includeAnswers: true,
    includeExplanations: true,
    printFriendly: true
  });

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

  // Apre il modal di personalizzazione
  const handleExportPDF = () => {
    if (!questions.length) return;
    setShowExportModal(true);
    setExportProgress(0);
  };


  // FUNZIONE VERA DI EXPORT (chiamata dal modal dopo conferma)
  const generatePDFEnterprise = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 30;
    let pageNum = 1;

    // Palette colori fedele al tuo screenshot
    const colors = {
      primary: [139, 92, 246] as [number, number, number],      // Viola Uneedes (#8b5cf6)
      primaryLight: [237, 233, 254] as [number, number, number],// Viola chiarissimo
      text: [30, 41, 59] as [number, number, number],           // Slate-800
      textLight: [100, 116, 139] as [number, number, number],   // Slate-500
      topicBg: [243, 244, 246] as [number, number, number],     // Grigio chiaro per i topic (#f3f4f6)
      border: [226, 232, 240] as [number, number, number],      // Slate-200
      success: [16, 185, 129] as [number, number, number],      // Green per soluzioni
      warning: [245, 158, 11] as [number, number, number]
    };

    setExportProgress(10);
    await new Promise(resolve => setTimeout(resolve, 100));

    const addBranding = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("UNEEDES", margin, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      doc.text("AI-Powered Quiz Generator", margin + 25, 15);

      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.8);
      doc.line(margin, 18, pageWidth - margin, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      const footerText = `uneedes-ai.vercel.app`;
      const pageText = `Pagina ${pageNum}`;

      doc.text(footerText, margin, pageHeight - 12);
      doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 12);
    };

// ============================================
// COVER PAGE 
// ============================================

// Gradient background simulato (3 rettangoli sfumati)
doc.setFillColor(250, 249, 255);
doc.rect(0, 0, pageWidth, pageHeight / 3, 'F');
doc.setFillColor(248, 246, 255);
doc.rect(0, pageHeight / 3, pageWidth, pageHeight / 3, 'F');
doc.setFillColor(245, 243, 255);
doc.rect(0, (pageHeight / 3) * 2, pageWidth, pageHeight / 3, 'F');

// Pattern decorativo (linee diagonali sottili top-right)
doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.setLineWidth(0.2);
for (let i = 0; i < 8; i++) {
  const startX = pageWidth - 40 + (i * 5);
  doc.line(startX, 0, startX + 30, 30);
}

y = 5;

// Badge "AI-Powered" moderno in alto
doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.roundedRect((pageWidth - 60) / 2, y, 60, 8, 4, 4, 'F');
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(255, 255, 255);
const badgeText = "AI-POWERED";
const badgeW = doc.getTextWidth(badgeText);
doc.text(badgeText, (pageWidth - badgeW) / 2, y + 5);

y += 20;

// Logo grande con effetto 3D
const logoSize = 35;
const logoX = (pageWidth - logoSize) / 2;

// Ombra 3D (3 layers)
doc.setFillColor(220, 200, 250);
doc.roundedRect(logoX + 3, y + 3, logoSize, logoSize, 10, 10, 'F');
doc.setFillColor(210, 190, 246);
doc.roundedRect(logoX + 2, y + 2, logoSize, logoSize, 10, 10, 'F');
doc.setFillColor(200, 180, 242);
doc.roundedRect(logoX + 1, y + 1, logoSize, logoSize, 10, 10, 'F');

// Logo principale
doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.roundedRect(logoX, y, logoSize, logoSize, 10, 10, 'F');

// Lettera U con glow
doc.setFont("helvetica", "bold");
doc.setFontSize(32);
doc.setTextColor(255, 255, 255);
const uText = "U";
const uWidth = doc.getTextWidth(uText);
doc.text(uText, logoX + (logoSize - uWidth) / 2, y + 23);

y += logoSize + 18;

// Brand Name grande
doc.setFont("helvetica", "bold");
doc.setFontSize(36);
doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
const brandName = "UNEEDES";
const brandW = doc.getTextWidth(brandName);
doc.text(brandName, (pageWidth - brandW) / 2, y);

y += 8;

// Tagline con spacing
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
const tagline = "Q U I Z   G E N E R A T O R";
const taglineW = doc.getTextWidth(tagline);
doc.text(tagline, (pageWidth - taglineW) / 2, y);

y += 4;

// Linea decorativa centrata
const lineLength = 40;
doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.setLineWidth(1);
doc.line((pageWidth - lineLength) / 2, y, (pageWidth + lineLength) / 2, y);

y += 4;

// Titolo documento in box premium
doc.setFillColor(255, 255, 255);
doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
doc.setLineWidth(0.5);
doc.roundedRect(margin + 8, y, contentWidth - 16, 16, 8, 8, 'FD');

// Ombra interna simulata
doc.setDrawColor(240, 240, 245);
doc.setLineWidth(0.3);
doc.roundedRect(margin + 9, y + 1, contentWidth - 18, 43, 7, 7, 'S');

y += 10;
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
const titleLines = doc.splitTextToSize(
  selectedFile?.filename.replace(/\.pdf$/i, '') || 'Quiz di Esercitazione',
  contentWidth - 28
);
titleLines.forEach((line: string) => {
  const lineWidth = doc.getTextWidth(line);
  doc.text(line, (pageWidth - lineWidth) / 2, y);
  y += 5;
});

y = 125;

// Stats cards in griglia
const cardWidth = (contentWidth - 16) / 3;
const cardHeight = 35;
const cardGap = 4;
const startX = margin + 8;

const uniqueTopics = [...new Set(questions.map(q => q.topic).filter(Boolean))];
const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

// Card 1: Domande
doc.setFillColor(252, 249, 255);
doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.setLineWidth(1);
doc.roundedRect(startX, y, cardWidth, cardHeight, 4, 4, 'FD');

doc.setFont("helvetica", "bold");
doc.setFontSize(28);
doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
const questNumStr = String(questions.length);
const questNumW = doc.getTextWidth(questNumStr);
doc.text(questNumStr, startX + (cardWidth - questNumW) / 2, y + 18);

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
const questLabel = "DOMANDE";
const questLabelW = doc.getTextWidth(questLabel);
doc.text(questLabel, startX + (cardWidth - questLabelW) / 2, y + 28);

// Card 2: Argomenti
const card2X = startX + cardWidth + cardGap;
doc.setFillColor(249, 255, 252);
doc.setDrawColor(colors.success[0], colors.success[1], colors.success[2]);
doc.roundedRect(card2X, y, cardWidth, cardHeight, 4, 4, 'FD');

doc.setFont("helvetica", "bold");
doc.setFontSize(28);
doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
const topicsNumStr = String(uniqueTopics.length);
const topicsNumW = doc.getTextWidth(topicsNumStr);
doc.text(topicsNumStr, card2X + (cardWidth - topicsNumW) / 2, y + 18);

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
const topicsLabel = "ARGOMENTI";
const topicsLabelW = doc.getTextWidth(topicsLabel);
doc.text(topicsLabel, card2X + (cardWidth - topicsLabelW) / 2, y + 28);

// Card 3: Data
const card3X = card2X + cardWidth + cardGap;
doc.setFillColor(255, 250, 245);
doc.setDrawColor(colors.warning[0], colors.warning[1], colors.warning[2]);
doc.roundedRect(card3X, y, cardWidth, cardHeight, 4, 4, 'FD');

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
const dateStr = today.toUpperCase();
const dateW = doc.getTextWidth(dateStr);
doc.text(dateStr, card3X + (cardWidth - dateW) / 2, y + 16);

doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
const dateLabel = "GENERATO";
const dateLabelW = doc.getTextWidth(dateLabel);
doc.text(dateLabel, card3X + (cardWidth - dateLabelW) / 2, y + 28);

y += cardHeight + 10;

// Indice elegante
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
doc.text("INDICE", margin + 8, y);

y += 8;

if (exportOptions.includeQuestions) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 8, y, contentWidth - 16, 14, 4, 4, 'FD');
  
  // Numero sezione in cerchio
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.circle(margin + 16, y + 7, 4, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("1", margin + 15, y + 8);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("Sezione Domande", margin + 25, y + 8.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
  doc.text("PAG. 2", pageWidth - margin - 24, y + 8);
  
  y += 16;
}

if (exportOptions.includeAnswers) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(colors.success[0], colors.success[1], colors.success[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 8, y, contentWidth - 16, 14, 4, 4, 'FD');
  
  // Numero sezione in cerchio
  doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
  doc.circle(margin + 16, y + 7, 4, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("2", margin + 15, y + 8);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("Soluzioni e Spiegazioni", margin + 25, y + 8.5);
  
  const solutionsPage = 2 + Math.ceil(questions.length / 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
  doc.text(`PAG. ${solutionsPage}`, pageWidth - margin - 24, y + 8);
}

// Footer elegante con QR
y = pageHeight - 35;
doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
doc.setLineWidth(0.3);
doc.line(margin + 15, y, pageWidth - margin - 15, y);

y += 1;

// QR Code simulato (box con pattern)
const qrSize = 20;
const qrX = (pageWidth - qrSize) / 2;
doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
doc.setLineWidth(1);
doc.rect(qrX, y, qrSize, qrSize);

// Pattern QR simulato
doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    if ((row + col) % 2 === 0) {
      doc.rect(qrX + 2 + (col * 4), y + 2 + (row * 4), 3, 3, 'F');
    }
  }
}

y += qrSize + 3;

doc.setFont("helvetica", "normal");
doc.setFontSize(7);
doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
const footerText = "Scansiona per accedere al quiz online";
const footerW = doc.getTextWidth(footerText);
doc.text(footerText, (pageWidth - footerW) / 2, y);

setExportProgress(30);

    // ============================================
    // SEZIONE I: DOMANDE (Layout identico allo Screen)
    // ============================================
    if (exportOptions.includeQuestions) {
      doc.addPage();
      pageNum++;
      addBranding();
      y = 20;

      // Header Viola come da screen
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Sezione I: Domande", margin + 6, y + 9);
      y += 16;

      let currentTopic = '';
      let justChangedPage = false;

      questions.forEach((q, index) => {
        const qTopicStr = q.topic || '';
        const isNewTopic = qTopicStr && qTopicStr !== currentTopic;

        // 1. IMPOSTO I FONT PRIMA DI CALCOLARE (Il segreto per non far sbordare il testo)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        const splitQ = doc.splitTextToSize(q.question_text, contentWidth - 12);

        let optionsHeight = 0;
        const parsedOptions = q.options.map(opt => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          const lines = doc.splitTextToSize(opt, contentWidth - 22);
          optionsHeight += (lines.length * 4.5) + 3; // Ridotto lo spazio a +3
          return lines;
        });

        const topicHeight = isNewTopic ? 10 : 0; // Topic height ridotto
        const exactHeight = topicHeight + (splitQ.length * 5) + optionsHeight + 4; // Padding finale ridotto

        // Salto pagina se non ci sta
        if (y + exactHeight > pageHeight - 20) {
          doc.addPage();
          pageNum++;
          addBranding();
          y = 20;
          justChangedPage = true;
        }

        // Topic Banner (Grigio chiaro come da screen)
        if (isNewTopic) {
          currentTopic = qTopicStr;
          doc.setFillColor(colors.topicBg[0], colors.topicBg[1], colors.topicBg[2]);
          doc.rect(margin, y, contentWidth, 6, 'F');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 150);
          doc.text(currentTopic.toUpperCase(), margin + 2, y + 4.5);
          y += 6;
          justChangedPage = false;
        }

        // Numero Domanda (Quadrato viola arrotondato)
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.roundedRect(margin, y, 7, 7, 1.5, 1.5, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        // Centratura numero
        const numStr = String(index + 1);
        const numOffset = numStr.length > 1 ? 1 : 2.5;
        doc.text(numStr, margin + numOffset, y + 5);

        // Testo Domanda
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(splitQ, margin + 10, y + 4.5);
        y += (splitQ.length * 5) + 1;

        // Opzioni stile Web
        parsedOptions.forEach((optLines, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);

          // Lettera viola dentro cerchietto leggero
          doc.setDrawColor(210, 210, 210);
          doc.setLineWidth(0.4);
          doc.circle(margin + 12.5, y + 2, 2.5, 'S');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          const letterWidth = doc.getTextWidth(letter);
          doc.text(letter, margin + 12.5 - (letterWidth / 2), y + 3.2);

          // Testo Opzione
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.text(optLines, margin + 18, y + 3.2);

          y += (optLines.length * 4.5) + 1;
        });

        y += 1; // Spazio extra tra le domande
      });
      setExportProgress(70);
    }

    // ============================================
    // SEZIONE II: SOLUZIONI (Fix Sbavature Text)
    // ============================================
    if (exportOptions.includeAnswers) {
      doc.addPage();
      pageNum++;
      addBranding();
      y = 20;

      doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Sezione II: Soluzioni", margin + 6, y + 9);
      y += 16;

      questions.forEach((q, index) => {
        // FIX CRITICO: setFont PRIMA di calcolare le linee
        // 1. Rimuoviamo il taglio (substring), la domanda va intera
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const qLines = doc.splitTextToSize(q.question_text, contentWidth - 12);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const ansLines = doc.splitTextToSize(q.correct_answer, contentWidth - 18);

        let expLines: string[] = [];
        if (exportOptions.includeExplanations && q.explanation) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          expLines = doc.splitTextToSize(q.explanation, contentWidth - 12);
        }

        let boxContentHeight = 6; // Padding base ridotto
        boxContentHeight += (qLines.length * 4.5) + 1;
        boxContentHeight += (ansLines.length * 5) + 1;
        if (expLines.length > 0) boxContentHeight += (expLines.length * 4.5) + 1;
        // Tolto l'extra spazio per q.topic perché ora va di fianco al titolo!

        if (y + boxContentHeight > pageHeight - 20) {
          doc.addPage();
          pageNum++;
          addBranding();
          y = 20;
        }

        doc.setFillColor(252, 253, 255);
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, contentWidth, boxContentHeight, 3, 3, 'FD');

        let innerY = y + 6;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        const titleStr = `DOMANDA ${index + 1}`;
        doc.text(titleStr, margin + 5, innerY);

        if (q.topic) {
          const titleWidth = doc.getTextWidth(titleStr);
          doc.setFillColor(243, 244, 246);
          doc.roundedRect(margin + 5 + titleWidth + 4, innerY - 4, doc.getTextWidth(q.topic) + 4, 5, 1, 1, 'F');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(q.topic.toUpperCase(), margin + 5 + titleWidth + 6, innerY - 0.5);
        }

        innerY += 4; // Salto riga ridotto

        // Testo della domanda (ora intero)
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.text(qLines, margin + 5, innerY);
        innerY += (qLines.length * 4.5) + 1;

        // Risposta e icona
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
        doc.text("✓", margin + 4, innerY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(ansLines, margin + 10, innerY);
        innerY += (ansLines.length * 5) + 0;

        // Spiegazione (opzionale)
        if (expLines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          doc.text(expLines, margin + 5, innerY);
        }
        y += boxContentHeight + 1; // Spazio extra tra box ridotto
      });
      setExportProgress(90);
    }

    // ============================================
    // SALVATAGGIO
    // ============================================
    const rawName = selectedFile?.filename || 'Quiz';
    const cleanName = rawName.replace(/\.[^/.]+$/, "").replace(/[\\/:*?"<>|]/g, "");
    const fileName = `${cleanName} - Uneedes.pdf`;

    const pdfBlob = doc.output('blob');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    setExportProgress(100);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (isMobile) {
      try {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName });
        } else {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          setShowExportModal(false);
          return;
        }
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
      }
    } else {
      doc.save(fileName);
    }

    setShowExportModal(false);
    setExportProgress(0);
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
        setFilesError(t('filesLoadError'));
      } else {
        setFiles((data || []) as FileRow[]);
        if (data && data.length > 0 && !selectedFileId) setSelectedFileId(data[0].id);
      }
      setFilesLoading(false);
    };
    loadFiles();
  }, [userId]);

  // Trigger caricamento quando cambia file
  useEffect(() => {
    loadQuestions();
  }, [selectedFileId, userId]);

  // Scroll button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      setQuestionsError(t('quizLoadError'));
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



  // --- CALCOLO STATISTICHE AVANZATE ---
  const stats = useMemo(() => {
    if (!questions.length) return null;

    let correctCount = 0;
    let answeredCount = 0;

    // Mappa per argomenti: { "Matematica": { total: 10, correct: 8 } }
    let topicStats: { [key: string]: { total: number; correct: number } } = {};

    questions.forEach(q => {
      const answer = userAnswers[q.id];
      const topic = q.topic || t('generalTopic');

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

    let feedback = t('feedback.empty');
    if (answeredCount > 0) {
      if (score >= 80) {
        feedback = t('feedback.excellent', { topic: bestTopic?.name || t('feedback.fallbackAll') });
      } else if (score >= 50) {
        feedback = t('feedback.good', {
          bestTopic: bestTopic?.name || t('feedback.fallbackSome'),
          worstTopic: worstTopic?.name || t('feedback.fallbackCertain')
        });
      } else {
        feedback = t('feedback.needsImprovement', { topic: worstTopic?.name || t('feedback.fallbackNotes') });
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
    if (!confirm(t('confirmDelete'))) return;
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
      alert(t('errorDelete'));
    }
  };

  const handleResetQuiz = async () => {
    setStreak(0);
    if (!confirm(t('confirmReset'))) return;
    if (!selectedFileId || !userId) return;

    const result = await resetQuizAnswersAction(selectedFileId, userId);
    if ((result as any).success) {
      // Resetta stato locale immediato
      setUserAnswers({});
    } else {
      alert(t('errorReset'));
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
        <div onClick={() => setShowFileDrawer(false)} className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-500 ease-out ${showFileDrawer ? 'opacity-100' : 'opacity-0'}`} />

        {/* Pannello Drawer */}
        <div className={`absolute top-0 left-0 h-full w-[85vw] max-w-[360px] bg-[#0B0F19]/80 backdrop-blur-2xl border-r border-white/10 shadow-[30px_0_60px_rgba(0,0,0,0.6)] flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${showFileDrawer ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Header Minimalista */}
          <div className="pt-8 pb-4 px-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{t('drawerTitle')}</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">{files.length} {t('uploadedFilesCount')}</p>
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
                <span className="text-sm font-medium">{t('syncing')}</span>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                  <FileText className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-base text-slate-200 font-semibold">{t('emptyArchiveTitle')}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  {t('emptyArchiveDescMobile')}
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
                        title={t('deleteFileTooltip')}
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
              <span className="text-xs font-semibold uppercase tracking-widest">{t('brandingTitle')}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24 w-full">

        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{t('title')}</h1>
            <p className="text-slate-400 text-sm mt-1 hidden sm:block">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> {t('homeButton')}
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
                <h2 className="text-base font-bold text-white tracking-tight">{t('yourDocuments')}</h2>
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
                  <span className="text-sm font-medium">{t('loadingFiles')}</span>
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
                  <h3 className="text-base text-slate-200 font-semibold">{t('emptyArchiveTitle')}</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    {t('emptyArchiveDescDesktop')}
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
                          className={`flex-1 min-w-0 text-left flex items-center gap-3.5 p-3 rounded-[20px] border transition-all duration-200 active:scale-[0.98] ${isActive
                            ? "border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-purple-500/5 shadow-lg shadow-violet-900/20"
                            : "border-transparent bg-white/[0.03] hover:bg-white/[0.06] text-slate-300"
                            }`}
                        >
                          {/* Icona Appunto/Documento (Apple Style) */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-inner ${isActive
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
                              {t('uploadedOnPrefix')} {new Date(file.uploaded_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                          className={`flex-shrink-0 p-3.5 text-slate-500 hover:text-red-400 hover:bg-red-500/15 bg-white/[0.02] border border-transparent hover:border-red-500/20 rounded-[18px] transition-all active:scale-90 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                          title={t('deleteFileTooltip')}
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
                          {questions.length} {t('questionsCount')} • {stats?.answered || 0} {t('completedCount')}
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
                    <button onClick={handleExportPDF} className="flex items-center justify-center w-7 h-7 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 rounded-lg transition-all active:scale-95 flex-shrink-0" title={t('downloadPdfTooltip')}>
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
                            <span className="text-[10px] md:text-xs font-medium text-orange-300">{t('errors')}</span>
                          </button>
                          <div className="w-px h-4 bg-white/10" />
                        </>
                      )}
                      <button
                        onClick={handleResetQuiz}
                        className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 hover:bg-white/5 rounded-md transition-all active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] md:text-xs font-medium text-slate-300">{t('reset')}</span>
                      </button>
                    </div>

                    {/* +10 Domande HERO */}
                    <button onClick={handleGenerateMore} disabled={generating} className="relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-900/60 flex-shrink-0 overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {generating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                      <span className="text-xs font-semibold text-white">{t('generate10Questions')}</span>
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
                        {questions.length} {t('questionsCount')} • {stats?.answered || 0} {t('completedCount')}
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
                            <span className="text-xs font-medium text-orange-300">{t('errors')}</span>
                          </button>
                          <div className="w-px h-4 bg-white/10" />
                        </>
                      )}
                      <button onClick={handleResetQuiz} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-md transition-all">
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-300">{t('reset')}</span>
                      </button>
                    </div>
                    <button onClick={handleGenerateMore} disabled={generating} className="relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/40 hover:shadow-xl hover:shadow-violet-900/60 flex-shrink-0 overflow-hidden">
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {generating ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                      <span className="text-xs font-semibold text-white">{t('generate10Questions')}</span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* BARRA PROGRESSI E RESTO DEL CODICE... */}

            {/* BARRA PROGRESSI - Con animazione smooth scroll */}
            {stats && stats.total > 0 && (
              <div className="flex flex-col gap-3 mx-4 md:mx-6 mt-4 mb-2 transition-all duration-500 ease-out">

                {/* Griglia a 3 colonne */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stats.score >= 60 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t('score')}</p>
                      <p className="text-lg font-bold text-white">{stats.score}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t('completed')}</p>
                      <p className="text-lg font-bold text-white">{stats.answered}/{stats.total}</p>
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-400 flex-shrink-0">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t('review')}</p>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-tight">
                        {stats.worstTopic ? stats.worstTopic.name : t('allOk')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FEEDBACK AI - SEMPRE VISIBILE (fuori dal container sopra) */}
            {stats && stats.answered > 0 && (
              <div className="mx-4 md:mx-6 mb-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-xl text-sm flex items-start md:items-center gap-3 animate-in fade-in">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5 md:mt-0" />
                <p className="font-medium">{stats.feedback}</p>
              </div>
            )}

            {/* GRAFICO ARGOMENTI - SEMPRE VISIBILE */}
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
                      {t('chartTitle')}
                    </h3>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isGraphExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Contenuto Grafico Espandibile - Design Lineare Premium (2 Colonne) */}
                <div className={`transition-all duration-500 ease-out ${isGraphExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {/* Contenitore con scrollbar interna, si attiva solo se serve davvero */}
                  <div className="p-5 pt-1 overflow-y-auto custom-scrollbar max-h-[400px]">
                    {/* Griglia: 1 colonna su telefono, 2 colonne su PC */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      {stats.chartData.map((entry: any, index: number) => {
                        // Determina colori e stati
                        const isDanger = entry.score < 50;
                        const isSuccess = entry.score >= 80;

                        const colorClass = isDanger
                          ? "from-red-600 to-rose-400"
                          : isSuccess
                            ? "from-violet-600 to-fuchsia-500"
                            : "from-amber-500 to-orange-400";

                        const textClass = isDanger ? "text-red-400" : isSuccess ? "text-fuchsia-300" : "text-amber-400";

                        return (
                          <div key={index} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-end text-sm">
                              <span className="font-semibold text-slate-200 truncate pr-4">{entry.name}</span>
                              <span className={`font-bold flex-shrink-0 ${textClass}`}>{entry.score}%</span>
                            </div>

                            {/* Track della barra */}
                            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                              {/* Riempimento animato */}
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r relative ${colorClass}`}
                                style={{ width: `${entry.score}%` }}
                              >
                                {/* Effetto luce (glow) interno alla Apple */}
                                <div className="absolute top-0 right-0 bottom-0 w-3 bg-white/20 blur-[1px] rounded-full"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
                  <h3 className="text-lg font-bold text-white tracking-tight">{t('noDocumentSelected')}</h3>
                  <p className="text-slate-400 mt-2 max-w-sm text-sm">
                    {t('chooseFileToView')}
                  </p>
                </div>
              ) : questionsLoading ? (
                /* Caricamento */
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 gap-4 animate-in fade-in">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                  <span className="text-sm font-medium tracking-wide">{t('generating')}</span>
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
                  <h3 className="text-base font-bold text-slate-200">{t('readyToStart')}</h3>
                  <p className="text-slate-400 text-sm mt-1 mb-5">{t('noQuestionsYet')}</p>
                  <button
                    onClick={handleGenerateMore}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> {t('generateFirst10')}
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
                            {expandedTips[q.id] ? quiz('hideTip') : quiz('showTip')}
                          </button>

                          {/* Box Insight Tutto Tondo e Bordo Viola */}
                          {expandedTips[q.id] && (
                            <div className="mt-3 text-xs md:text-sm leading-relaxed text-slate-300/90 bg-violet-500/5 border border-violet-500/40 px-4 py-3 rounded-xl shadow-sm shadow-violet-900/20 animate-in fade-in slide-in-from-top-1">
                              {q.explanation || t('noExplanation')}
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
                        {generating ? t('generating') : t('generateMore10')}
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
      {/* MODAL EXPORT PDF - Desktop Modal / Mobile Bottom Sheet */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExportModal(false)}
          />

          {/* Modal/Bottom Sheet */}
          <div className={`relative w-full md:w-auto md:min-w-[500px] bg-slate-900/95 backdrop-blur-xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 ${exportProgress > 0 ? '' : 'md:rounded-3xl'
            } rounded-t-3xl md:rounded-3xl shadow-2xl`}>

            {/* Header */}
            <div className="p-6 border-b border-white/5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">📄 Esporta Quiz</h3>
                  <p className="text-sm text-slate-400">
                    {selectedFile?.filename.replace(/\.pdf$/i, '')}
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Mini preview info */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>📊 {questions.length} domande</span>
                <span>•</span>
                <span>📑 ~{Math.ceil(questions.length / 2) + 2} pagine</span>
                <span>•</span>
                <span>📄 A4</span>
              </div>
            </div>

            {/* Options */}
            {exportProgress === 0 && (
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-300 mb-3">Personalizza contenuto:</p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeQuestions}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeQuestions: e.target.checked }))}
                        className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-violet-600 checked:border-violet-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Domande con spazi</p>
                        <p className="text-xs text-slate-400">Per esercitarsi o stampare</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeAnswers}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnswers: e.target.checked }))}
                        className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-violet-600 checked:border-violet-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Risposte corrette</p>
                        <p className="text-xs text-slate-400">Sezione con tutte le soluzioni</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeExplanations}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeExplanations: e.target.checked }))}
                        disabled={!exportOptions.includeAnswers}
                        className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-violet-600 checked:border-violet-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">Spiegazioni dettagliate</p>
                        <p className="text-xs text-slate-400">Approfondimenti per ogni risposta</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {exportProgress > 0 && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">
                    {exportProgress < 100 ? 'Generazione PDF in corso...' : 'PDF generato!'}
                  </p>
                </div>

                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${exportProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2 text-right">{exportProgress}%</p>
              </div>
            )}

            {/* Actions */}
            {exportProgress === 0 && (
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={generatePDFEnterprise}
                  disabled={!exportOptions.includeQuestions && !exportOptions.includeAnswers}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-900/30"
                >
                  Genera PDF ✨
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}