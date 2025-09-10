import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function run() {
  try {
    console.log('Testing Supabase URL:', url);
    const { data, error, status } = await supabase.from('profiles').select('*').limit(1);
    console.log({ status });
    if (error) {
      console.error('Error from supabase:', error.message, error.details || '');
      process.exit(1);
    }
    console.log('Success, data sample:', data);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

run();
