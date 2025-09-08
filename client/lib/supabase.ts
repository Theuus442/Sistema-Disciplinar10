import { createClient } from "@supabase/supabase-js";

function sanitizeEnv(v?: string) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return undefined as any;
  return t;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseUrl = sanitizeEnv(rawUrl);
const supabaseKey = sanitizeEnv(rawKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
