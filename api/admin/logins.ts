import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) {
  if (!v) return undefined as any;
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (!t || t.toLowerCase() === 'undefined' || t.toLowerCase() === 'null') return undefined as any;
  return t;
}
function createFetchWithTimeout(defaultMs = 7000) {
  return async (input: any, init?: any) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), init?.timeout ?? defaultMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return res as any;
    } finally { clearTimeout(id); }
  };
}
function getAdminClient() {
  const url = sanitizeEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
  const serviceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false }, global: { fetch: createFetchWithTimeout(8000) } as any });
}
function getAnonClientWithToken(token: string) {
  const url = sanitizeEnv(process.env.SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL);
  const anon = sanitizeEnv((process.env as any).SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY);
  if (!url || !anon) return null as any;
  return createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: createFetchWithTimeout(7000) } as any });
}
async function ensureAdmin(req: any, res: any) {
  const auth = (req.headers?.authorization as string) || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return res.status(401).json({ error: 'Não autorizado: token não fornecido.' });
  const userClient = getAnonClientWithToken(token);
  if (!userClient) return res.status(500).json({ error: 'Configuração Supabase ausente (URL/ANON).' });
  const { data: userData, error: getUserErr } = await userClient.auth.getUser();
  if (getUserErr) return res.status(401).json({ error: 'Token inválido ou problema na autenticação.' });
  const userId = (userData?.user as any)?.id ?? null;
  if (!userId) return res.status(401).json({ error: 'Token inválido.' });
  const profResp = await userClient.from('profiles').select('id,perfil').eq('id', userId).maybeSingle();
  if ((profResp as any)?.error) return res.status(401).json({ error: 'Token inválido ou sem permissão para acessar perfil.' });
  const perfilLower = (((profResp as any).data ?? profResp)?.perfil ?? '').toLowerCase();
  if (perfilLower !== 'administrador') return res.status(403).json({ error: 'Acesso proibido: somente administradores.' });
  const admin = getAdminClient();
  const db = admin ?? userClient;
  return { admin, db } as const;
}

export default async function handler(req: any, res: any) {
  const ctx = await ensureAdmin(req, res) as any;
  if (!ctx) return;
  const db = ctx.db;
  const { data: profs, error } = await db.from('profiles').select('*').limit(100);
  if (error) return res.status(400).json({ error: error.message });

  let lastById = new Map<string, string | null>();
  if (ctx.admin) {
    try {
      const { data: usersResp } = await (ctx.admin as any).auth?.admin.listUsers({ page: 1, perPage: 200 } as any);
      const users = (usersResp as any)?.users || [];
      for (const u of users) {
        const last = u?.last_sign_in_at || u?.created_at || null;
        if (u?.id) lastById.set(u.id, last);
      }
    } catch {}
  }

  const list = (profs || [])
    .map((p: any) => {
      const ts = lastById.get(p.id) || p.last_sign_in_at || p.ultimoAcesso || p.ultimo_acesso || p.created_at || p.createdAt || p.updated_at || p.updatedAt || null;
      return { id: p.id, email: p.email ?? p.user_email ?? '', nome: p.nome ?? p.full_name ?? p.name ?? '', lastSignInAt: ts };
    })
    .sort((a: any, b: any) => new Date(b.lastSignInAt || 0).getTime() - new Date(a.lastSignInAt || 0).getTime())
    .slice(0, 10);

  return res.json(list);
}
