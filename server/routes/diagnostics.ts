import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return undefined as any;
  return t;
}

function createFetchWithTimeout(defaultMs = 7000) {
  return async (input: any, init?: any) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), init?.timeout ?? defaultMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return res as any;
    } catch (e: any) {
      if (e && e.name === 'AbortError') throw new Error('fetch timeout');
      throw e;
    } finally {
      clearTimeout(id);
    }
  };
}

function createClientSafe(url?: string, key?: string) {
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false }, global: { fetch: createFetchWithTimeout(7000) } as any });
  } catch (e) {
    return null;
  }
}

export const adminDiagnostics: RequestHandler = async (req, res) => {
  try {
    const token = req.headers["x-admin-diag-token"] as string | undefined;
    const expected = sanitizeEnv(process.env.ADMIN_DIAG_TOKEN || null);
    if (!expected) return res.status(403).json({ error: "ADMIN_DIAG_TOKEN not configured on server" });
    if (!token || token !== expected) return res.status(403).json({ error: "Invalid diagnostic token" });

    const supabaseUrl = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL || null);
    const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY || null);
    const service = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || null);

    const result: any = { env: { supabaseUrl: !!supabaseUrl, anon: !!anon, serviceRole: !!service } };

    // Test anon client
    if (supabaseUrl && anon) {
      const anonClient = createClientSafe(supabaseUrl, anon);
      if (!anonClient) result.anon = { ok: false, error: 'createClient failed' };
      else {
        try {
          const { data, error } = await anonClient.from('profiles').select('id').limit(1);
          if (error) result.anon = { ok: false, error: error.message };
          else result.anon = { ok: true, sampleCount: Array.isArray(data) ? data.length : 0 };
        } catch (e: any) {
          result.anon = { ok: false, error: e?.message || String(e) };
        }
      }
    } else {
      result.anon = { ok: false, error: 'missing envs' };
    }

    // Test admin client if service key present
    if (supabaseUrl && service) {
      const adminClient = createClientSafe(supabaseUrl, service);
      if (!adminClient) result.admin = { ok: false, error: 'createClient failed' };
      else {
        try {
          const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 } as any);
          const users = (usersPage as any)?.users || [];
          result.admin = { ok: true, usersCount: users.length };
        } catch (e: any) {
          result.admin = { ok: false, error: e?.message || String(e) };
        }
      }
    } else {
      result.admin = { ok: false, error: 'missing service key' };
    }

    return res.json(result);
  } catch (e: any) {
    console.error('adminDiagnostics error', e?.stack || e?.message || e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
