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

    // 2) TRUNCATE DINAMICO INTELLIGENTE (risparmio token)
    const MAX_CHARS = 30000; // ~10 pagine accademiche
    
    let truncatedText: string;
    if (fullText.length <= MAX_CHARS) {
      // PDF corto: usa tutto (risparmio automatico!)
      truncatedText = fullText;
    } else {
      // PDF lungo: primi 80% + ultimi 20% (copre intro + conclusioni)
      const mainChunk = fullText.slice(0, MAX_CHARS * 0.8);
      const endChunk = fullText.slice(-MAX_CHARS * 0.2);
      truncatedText = mainChunk + "\n\n[...]\n\n" + endChunk;
    }

    console.log(`📄 Testo: ${fullText.length} char → Usati: ${truncatedText.length} char (${Math.round(truncatedText.length/fullText.length*100)}%)`);


    // 3) Chiama Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", });

    const prompt = `
Generate 10 multiple-choice questions from the text below.

CRITICAL RULES:
1. ALL 4 options MUST be 15-25 words each (equal length to prevent answer leaking)
2. Randomize correct answer position (A/B/C/D - not always first)
3. Wrong answers must be plausible but clearly distinguishable
4. Return ONLY valid JSON array (no markdown, no explanations)

JSON SCHEMA:
[{
  "question": "Clear, specific question text",
  "options": ["15-25 word option", "15-25 word option", "15-25 word option", "15-25 word option"],
  "answer": "Exact text match of the correct option",
  "tip": "Brief explanation (max 35 words)",
  "topic": "Main subject or concept"
}]

EXAMPLE (follow this format):
{
  "question": "Secondo il Modello dei Due Fattori di Herzberg, quali sono i fattori igienici?",
  "options": [
    "Fattori legati alla crescita personale, al riconoscimento professionale e alle opportunità di sviluppo nella carriera lavorativa",
    "Fattori legati alle condizioni di lavoro, alla retribuzione economica e alla sicurezza dell'impiego nel contesto organizzativo",
    "Fattori legati esclusivamente ai rapporti interpersonali con colleghi, superiori diretti e al clima organizzativo generale dell'azienda",
    "Fattori legati unicamente alle opportunità concrete di avanzamento, promozione verticale e progressione nella struttura gerarchica aziendale"
  ],
  "answer": "Fattori legati alle condizioni di lavoro, alla retribuzione economica e alla sicurezza dell'impiego nel contesto organizzativo",
  "tip": "Herzberg distingue fattori igienici (prevengono insoddisfazione) da motivanti (creano soddisfazione attiva).",
  "topic": "Teorie della Motivazione"
}

TEXT TO ANALYZE:
${truncatedText}
`;

    // 5) GENERAZIONE CON PARAMETRI OTTIMALI
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,      // Bassa = qualità stabile, poca variazione casuale
        topP: 0.8,             // Taglia 20% opzioni meno probabili (no risposte strane)
        maxOutputTokens: 4096, // Sufficiente per 10 domande ben formattate
        responseMimeType: "application/json" // Forza JSON valido (Gemini 2.5+)
      }
    });

    const response = await result.response;

    // 6) PARSING JSON (già pulito grazie a responseMimeType)
    let jsonString = response.text().trim();
    
    // Fallback cleaning se necessario
    jsonString = jsonString
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const startIdx = jsonString.indexOf("[");
    const endIdx = jsonString.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }

    let quiz: any;
    try {
      quiz = JSON.parse(jsonString);
    } catch (e) {
      console.error("❌ Errore parsing JSON:", e);
      console.error("Risposta raw:", jsonString.slice(0, 500));
      return { error: "Errore nella generazione delle domande. Riprova." };
    }

    // Validazione: devono essere 10 domande
    if (!Array.isArray(quiz) || quiz.length !== 10) {
      console.warn(`⚠️ Gemini ha generato ${quiz.length} domande invece di 10`);
      // Tronca o riempi per avere esattamente 10
      if (quiz.length > 10) quiz = quiz.slice(0, 10);
      if (quiz.length < 10) {
        return { error: `L'AI ha generato solo ${quiz.length} domande. Riprova.` };
      }
    }

    // --- UTENTE ANONIMO: NO SALVATAGGIO ---
    if (!userId) {
      return { success: true, quiz, saved: false };
    }

   // 7) SALVATAGGIO DB (solo utenti loggati)
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
   console.error("❌ Errore salvataggio file:", fileError);
   return { success: true, quiz, saved: false };
 }

 // 8) SALVATAGGIO DOMANDE (senza question_type)
 const quizRows = (quiz as any[]).map((q) => ({
   file_id: fileRow.id,
   user_id: userId,
   question_text: q.question,
   options: q.options,
   correct_answer: q.answer,
   explanation: q.tip,
   topic: q.topic,
 }));

 const { data: quizData, error: quizError } = await supabaseAdmin
   .from("quiz_questions")
   .insert(quizRows)
   .select();

 if (quizError) {
   console.error("❌ Errore salvataggio domande:", quizError);
   return { success: true, quiz, saved: false };
 }

 // 9) AGGIORNAMENTO CONTATORI
 try {
   await incrementLimits(userId, 1, 10);
 } catch (limitError) {
   console.error("⚠️ Errore aggiornamento limiti:", limitError);
 }

 // 10) RITORNA DOMANDE CON ID REALI (per salvataggio risposte)
 const quizWithIds = quizData.map(q => ({
   id: q.id,
   question: q.question_text,
   options: q.options,
   answer: q.correct_answer,
   tip: q.explanation,
   topic: q.topic
 }));

 return { success: true, quiz: quizWithIds, saved: true, fileId: fileRow.id };

} catch (error: any) {
 console.error("❌ Errore generale:", error);
 return { error: "Errore durante l'elaborazione del file." };
}
} 


/**
 * GENERAZIONE INCREMENTALE (Punto 7)
 * Genera altre 10 domande per un file esistente.
 */
export async function generateMoreQuestionsAction(fileId: string, userId: string) {
  if (!fileId || !userId) return { error: "Dati mancanti" };

  // Controllo limiti daily
  const allowedDaily = await checkDailyLimit(userId);
  if (!allowedDaily) {
    return { limitReached: true, reason: "daily" };
  }

  try {
    // 1. Recupera testo + domande esistenti
    const { data: fileRow, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("extracted_text, filename")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !fileRow || !fileRow.extracted_text) {
      return { error: "File non trovato o testo mancante." };
    }

    // 2. Prendi domande esistenti per anti-duplicazione
    const { data: oldQuestions } = await supabaseAdmin
      .from("quiz_questions")
      .select("question_text, topic")
      .eq("file_id", fileId);

    const existingQuestions = oldQuestions?.map(q => q.question_text).join("\n") || "None yet";

    // 3. PROMPT OTTIMIZZATO (stesso stile della funzione principale)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `Generate 10 NEW multiple-choice questions from the text below.

CRITICAL RULES:
1. ALL 4 options MUST be 15-25 words each (equal length)
2. Randomize correct answer position (A/B/C/D)
3. Questions must be DIFFERENT from existing ones (see below)
4. Cover NEW concepts not already tested
5. Return ONLY valid JSON array

EXISTING QUESTIONS TO AVOID:
${existingQuestions.slice(0, 1500)}

JSON SCHEMA:
[{
  "question": "New question about untested concept",
  "options": ["15-25 word option", "15-25 word option", "15-25 word option", "15-25 word option"],
  "answer": "Exact match of correct option",
  "tip": "Brief explanation (max 35 words)",
  "topic": "Subject or concept"
}]

TEXT:
${fileRow.extracted_text}`;

    // 4. Generazione con parametri ottimali
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    });

    const response = await result.response;
    let jsonString = response.text().trim();

    // Pulizia fallback
    jsonString = jsonString
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const startIdx = jsonString.indexOf("[");
    const endIdx = jsonString.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1) {
      jsonString = jsonString.substring(startIdx, endIdx + 1);
    }

    let newQuiz: any[];
    try {
      newQuiz = JSON.parse(jsonString);
    } catch (e) {
      console.error("❌ Errore parsing JSON:", e);
      return { error: "Errore dell'AI. Riprova." };
    }

    // Validazione: devono essere 10 domande
    if (!Array.isArray(newQuiz) || newQuiz.length !== 10) {
      console.warn(`⚠️ Gemini ha generato ${newQuiz.length} domande invece di 10`);
      if (newQuiz.length > 10) newQuiz = newQuiz.slice(0, 10);
      if (newQuiz.length < 10) {
        return { error: `L'AI ha generato solo ${newQuiz.length} domande. Riprova.` };
      }
    }

    // 5. Salvataggio (senza question_type)
    const quizRows = newQuiz.map((q) => ({
      file_id: fileId,
      user_id: userId,
      question_text: q.question,
      options: q.options,
      correct_answer: q.answer,
      explanation: q.tip,
      topic: q.topic,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("quiz_questions")
      .insert(quizRows);

    if (insertError) {
      console.error("❌ Errore salvataggio:", insertError);
      return { error: "Errore salvataggio DB" };
    }

    // 6. Incrementa contatore
    await incrementLimits(userId, 0, 10);

    return { success: true, count: newQuiz.length };

  } catch (error: any) {
    console.error("❌ Errore Gen More:", error);
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