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
  console.warn(
    "Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Supabase client will be a stub that throws when used."
  );

  // Export a proxy stub so importing modules don't crash at load time. Any attempt to use the
  // supabase client will throw a clear error guiding the developer to set the env vars or
  // connect the Supabase MCP.
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

  export const supabase = stub;
} else {
  export const supabase = createClient(supabaseUrl, supabaseKey);
}
