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

let _supabase: any;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Supabase client will be a stub that throws when used."
  );

  const stub = new Proxy(
    {},
    {
      get() {
        throw new Error(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or connect Supabase via the MCP."
        );
      },
      apply() {
        throw new Error(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or connect Supabase via the MCP."
        );
      },
    }
  ) as any;

  _supabase = stub;
} else {
  _supabase = createClient(supabaseUrl, supabaseKey);
}

export const supabase = _supabase;
