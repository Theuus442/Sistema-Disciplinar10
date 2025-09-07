import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: SupabaseClient;

if (isSupabaseConfigured) {
  client = createClient(supabaseUrl!, supabaseKey!);
} else {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth/data features."
    );
  }
  client = new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
      );
    },
  });
}

export const supabase = client;
