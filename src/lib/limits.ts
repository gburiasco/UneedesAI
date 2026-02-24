import { createClient } from "@supabase/supabase-js";

const MAX_DAILY_QUESTIONS = 50;
const MAX_TOTAL_FILES = 10;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function canUploadFile(userId: string): Promise<boolean> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("total_files_uploaded")
    .eq("id", userId)
    .single();

  if (error || !user) return false;
  return (user.total_files_uploaded || 0) < MAX_TOTAL_FILES;
}

export async function checkDailyLimit(userId: string): Promise<boolean> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("questions_generated_today, last_questions_reset")
    .eq("id", userId)
    .single();

  if (error || !user) return false;

  const lastReset = new Date(user.last_questions_reset);
  const now = new Date();

  const isDifferentDay =
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear();

  if (isDifferentDay) {
    await supabaseAdmin
      .from("users")
      .update({
        questions_generated_today: 0,
        last_questions_reset: new Date().toISOString(),
      })
      .eq("id", userId);
    return true;
  }

  return (user.questions_generated_today || 0) < MAX_DAILY_QUESTIONS;
}

export async function incrementLimits(userId: string, files: number, questions: number) {
  const { error } = await supabaseAdmin.rpc("increment_limits", {
    user_id_param: userId,
    files_inc: files,
    questions_inc: questions,
  });

  if (error) console.error("Errore RPC increment:", error);
}