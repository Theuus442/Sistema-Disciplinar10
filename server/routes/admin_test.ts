import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, '');
  if (!t || t.toLowerCase() === 'undefined' || t.toLowerCase() === 'null') return undefined as any;
  return t;
}

export async function testServiceRole(req: any, res: any) {
  try {
    const url = sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
    const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !serviceKey) {
      return res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL not configured on server.' });
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Try a simple query to validate access
    const { data, error } = await admin.from('profiles').select('id,nome,perfil').limit(5) as any;
    if (error) return res.status(500).json({ ok: false, error: error.message || String(error) });

    return res.json({ ok: true, count: Array.isArray(data) ? data.length : 0, data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
