import { createClient } from "@supabase/supabase-js";

// Client lato browser / componenti client:
// Usa le chiavi pubbliche di Supabase (URL + anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);