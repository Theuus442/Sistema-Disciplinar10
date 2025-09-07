import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

function createNotConfiguredClient() {
  const message =
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication and data features.';

  const auth = {
    async signInWithPassword() {
      return { data: null, error: { message } };
    },
    async getUser() {
      return { data: { user: null }, error: { message } };
    },
  };

  const chain = () => ({
    select() {
      return chain();
    },
    eq() {
      return chain();
    },
    ilike() {
      return chain();
    },
    limit() {
      return chain();
    },
    async maybeSingle() {
      return { data: null, error: { message } };
    },
    async then() {
      return { data: null, error: { message } } as any;
    },
  });

  const from = () => chain();

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[Supabase] ' + message);
  }

  return { auth, from } as any;
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string)
  : createNotConfiguredClient();
