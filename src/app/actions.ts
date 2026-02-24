'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { extractText } from "unpdf";
import { canUploadFile, checkDailyLimit, incrementLimits } from "../lib/limits";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });

export async function generateQuizAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const userId = formData.get("userId") as string | null;

  if (!file) {
    return { error: "Nessun file caricato" };
  }

  // --- 1. CONTROLLO LIMITI (SOLO PER UTENTI LOGGATI) ---
  // Lo facciamo subito per non sprecare risorse AI se l'utente è bloccato
  if (userId) {
    const allowedFile = await canUploadFile(userId);
    if (!allowedFile) {
      return { limitReached: true, reason: "files" };
    }

    const allowedDaily = await checkDailyLimit(userId);
    if (!allowedDaily) {
      return { limitReached: true, reason: "daily" };
    }
  }

  try {
    // 1) Lettura PDF ultra-rapida con unpdf
    const arrayBuffer = await file.arrayBuffer();
    const { text } = await extractText(arrayBuffer);

    // FIX ERRORE: Se 'text' è un array di pagine, lo uniamo in una stringa sola.
    // Se è già una stringa, la lasciamo così.
    const fullText = Array.isArray(text) ? text.join("\n") : (text || "");

    // DEBUG: Vediamo se unpdf sta leggendo bene
    console.log("--- TESTO ESTRATTO (Primi 200 car.) ---");
    console.log(fullText.slice(0, 200));
    console.log("---------------------------------------");

    if (!fullText || fullText.trim().length < 50) {
      return { error: "Il PDF sembra vuoto o è una scansione. Serve testo selezionabile." };
    }

    // Troncamento intelligente
    const truncatedText = fullText.slice(0, 30000);

    // 2) Chiama Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", });

    const prompt = `
Sei un professore universitario che deve creare un esame.

REGOLA ASSOLUTA: Devi generare ESATTAMENTE 10 domande. Non 9, non 11, non 26. DIECI.

ISTRUZIONI:
1. Leggi attentamente il testo sotto
2. Identifica i 10 concetti più importanti
3. Crea 1 domanda per ogni concetto (= 10 domande totali)
4. Ogni domanda ha 4 opzioni (A, B, C, D)
5. Restituisci SOLO il JSON, senza testo aggiuntivo

FORMATO JSON (esatto):
[
  {
    "question": "Testo domanda...",
    "options": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
    "answer": "Testo ESATTO dell'opzione corretta",
    "tip": "Breve spiegazione (max 50 parole)",
    "topic": "Nome argomento"
  }
]

IMPORTANTE: Conta le domande prima di rispondere. Se ne hai più di 10, elimina le ultime.

TESTO DA ANALIZZARE:
${truncatedText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    let jsonString = response.text()
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Pulizia JSON robusta
    const startIdx = jsonString.indexOf("[");
    const endIdx = jsonString.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }
    // Fix per backslash che rompono il JSON
    jsonString = jsonString.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    let quiz: any;
    try {
      quiz = JSON.parse(jsonString);
    } catch (e) {
      console.error("Errore parsing JSON:", e);
      return { error: "Errore nella generazione delle domande. Riprova." };
    }

    // Se non c'è userId → utente anonimo: NON salvare nulla su Supabase
    if (!userId) {
      return { success: true, quiz, saved: false };
    }

    // 3) Salvataggio nel DB usando supabaseAdmin
    const { data: fileRow, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        user_id: userId,
        filename: file.name,
        file_size: file.size,
        extracted_text: truncatedText,
        processed: true,
      })
      .select("id")
      .single();

    if (fileError) {
      console.error("Errore salvataggio file:", fileError);
      return { success: true, quiz, saved: false };
    }

    const quizRows = (quiz as any[]).map((q) => ({
      file_id: fileRow.id,
      user_id: userId,
      question_text: q.question,
      question_type: "multiple_choice",
      options: q.options,
      correct_answer: q.answer,
      explanation: q.tip,
      topic: q.topic,
    }));

    await supabaseAdmin.from("quiz_questions").insert(quizRows);

    // --- 5. AGGIORNAMENTO CONTATORI ---
    // Se siamo arrivati qui, il salvataggio è riuscito. Aggiorniamo i limiti.
    try {
      await incrementLimits(userId, 1, 10); // +1 File, +10 Domande
    } catch (limitError) {
      console.error("Errore aggiornamento limiti:", limitError);
      // Non blocchiamo l'utente se fallisce l'aggiornamento del contatore, ma lo logghiamo
    }

    return { success: true, quiz, saved: true, fileId: fileRow.id };

  } catch (error: any) {
    console.error("Errore generale:", error);
    return { error: "Errore durante l'elaborazione del file." };
  }
}

// ... (Tutto il codice precedente rimane uguale)

/**
 * GENERAZIONE INCREMENTALE (Punto 7)
 * Genera altre 10 domande per un file esistente.
 */
export async function generateMoreQuestionsAction(fileId: string, userId: string) {
  if (!fileId || !userId) return { error: "Dati mancanti" };

  // 1. CONTROLLO LIMITI (Solo Daily, perché il file è già caricato)
  const allowedDaily = await checkDailyLimit(userId);
  if (!allowedDaily) {
    return { limitReached: true, reason: "daily" };
  }

  try {
    // 2. Recuperiamo il testo del file e le domande GIÀ esistenti
    const { data: fileRow, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("extracted_text, filename")
      .eq("id", fileId)
      .eq("user_id", userId) // Sicurezza: deve essere suo
      .single();

    if (fetchError || !fileRow || !fileRow.extracted_text) {
      return { error: "File non trovato o testo mancante." };
    }

    // Prendiamo le domande vecchie per evitare duplicati
    const { data: oldQuestions } = await supabaseAdmin
      .from("quiz_questions")
      .select("question_text")
      .eq("file_id", fileId);

    const existingQuestionsText = oldQuestions?.map(q => q.question_text).join("\n- ") || "";

    // 3. Prompt Avanzato per Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
Sei un docente universitario.
Il tuo compito è creare 10 NUOVE domande a risposta multipla basate sul testo fornito.

IMPORTANTE:
Ecco un elenco di domande che hai GIÀ generato per questo testo. NON RIPETERLE. Crea domande su aspetti diversi o con formulazioni diverse.
DOMANDE ESISTENTI DA EVITARE:
- ${existingQuestionsText.slice(0, 2000)} (lista troncata per brevità)

ISTRUZIONI:
1. Analizza il testo originale.
2. Crea 10 NUOVE domande a risposta multipla (4 opzioni di uguale lunghezza).
3. Restituisci SOLO un JSON valido.

FORMATO JSON:
[
  {
    "question": "Nuova Domanda...",
    "options": ["A", "B", "C", "D"],
    "answer": "Risposta corretta",
    "tip": "Spiegazione",
    "topic": "Argomento"
  }
]

TESTO ORIGINALE:
${fileRow.extracted_text.slice(0, 30000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Pulizia JSON
    let jsonString = response.text()
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const startIdx = jsonString.indexOf("[");
    const endIdx = jsonString.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }
    jsonString = jsonString.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

    let newQuiz: any[];
    try {
      newQuiz = JSON.parse(jsonString);
    } catch (e) {
      console.error("Errore JSON Incremental:", e);
      return { error: "Errore dell'AI. Riprova." };
    }

    // 4. Salvataggio Nuove Domande
    const quizRows = newQuiz.map((q) => ({
      file_id: fileId,
      user_id: userId,
      question_text: q.question,
      question_type: "multiple_choice",
      options: q.options,
      correct_answer: q.answer,
      explanation: q.tip,
      topic: q.topic,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("quiz_questions")
      .insert(quizRows);

    if (insertError) {
      console.error("Errore salvataggio nuove domande:", insertError);
      return { error: "Errore salvataggio DB" };
    }

    // 5. Incrementiamo solo il contatore DOMANDE (File non cambia)
    await incrementLimits(userId, 0, 10);

    return { success: true, count: newQuiz.length };

  } catch (error: any) {
    console.error("Errore Gen More:", error);
    return { error: "Errore imprevisto." };
  }
}

// * SALVA RISPOSTA
// in src/app/actions.ts

export async function saveUserAnswerAction(
  userId: string,
  questionId: string,
  selectedOption: string,
  isCorrect: boolean
) {
  console.log("--> Tentativo salvataggio:", { userId, questionId, selectedOption });

  try {
    const { data, error } = await supabaseAdmin
      .from("user_answers")
      .upsert(
        {
          user_id: userId,
          question_id: questionId,
          user_answer: selectedOption, // <--- NOME COLONNA CORRETTO (dallo screenshot)
          is_correct: isCorrect
        },
        { onConflict: "user_id, question_id" } // Ora questo funzionerà grazie all'SQL sopra
      )
      .select();

    if (error) {
      console.error("❌ ERRORE SUPABASE:", error.message);
      return { error: error.message };
    }

    //console.log("✅ Risposta salvata!", data);
    return { success: true };
  } catch (err: any) {
    console.error("❌ ERRORE CRITICO:", err);
    return { error: "Errore interno server" };
  }
}
// Aggiungi in fondo a src/app/actions.ts

export async function getUserAnswersAction(userId: string, questionIds: string[]) {
  try {
    const { data } = await supabaseAdmin
      .from("user_answers")
      .select("question_id, user_answer")
      .eq("user_id", userId)
      .in("question_id", questionIds);

    return { data };
  } catch (error) {
    console.error("Errore lettura risposte:", error);
    return { data: [] };
  }
}
// ... (tutto il codice precedente resta uguale)

// --- 4. ELIMINA FILE COMPLETO ---
export async function deleteFileAction(fileId: string, userId: string) {
  try {
    // Grazie al CASCADE impostato via SQL, cancellando il file
    // verranno cancellate automaticamente domande e risposte.
    const { error } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Errore eliminazione file:", error);
    return { error: "Impossibile eliminare il file." };
  }
}

// --- 5. RESETTA RISPOSTE (Ricomincia Quiz) ---
export async function resetQuizAnswersAction(fileId: string, userId: string) {
  try {
    // 1. Troviamo gli ID delle domande di questo file
    const { data: questions } = await supabaseAdmin
      .from("quiz_questions")
      .select("id")
      .eq("file_id", fileId);

    const questionIds = questions?.map(q => q.id) || [];

    if (questionIds.length === 0) return { success: true };

    // 2. Cancelliamo tutte le risposte associate a queste domande per questo utente
    const { error } = await supabaseAdmin
      .from("user_answers")
      .delete()
      .in("question_id", questionIds)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Errore reset risposte:", error);
    return { error: "Impossibile resettare il quiz." };
  }
}