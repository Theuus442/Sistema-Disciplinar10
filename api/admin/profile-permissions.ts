import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:VercelRequest,res:VercelResponse){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=(((profResp as any).data ?? profResp)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }

export default async function handler(req: VercelRequest, res: VercelResponse){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;

  if (req.method === 'GET') {
    try {
      const { data, error } = await db.from('profile_permissions').select('*');
      if (error) return res.status(400).json({ error: error.message });
      const rows = Array.isArray(data) ? data : [];
      const byProfile: Record<string, string[]> = {};
      for (const r of rows as any[]) {
        const p = r.perfil || 'unknown';
        byProfile[p] = byProfile[p] || [];
        byProfile[p].push(r.permission);
      }
      return res.json(byProfile);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  if (req.method === 'POST') {
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      const { error } = await db.from('profile_permissions').insert({ perfil, permission });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  if (req.method === 'DELETE') {
    const { perfil, permission } = req.body as any;
    if (!perfil || !permission) return res.status(400).json({ error: 'perfil and permission required' });
    try {
      const { error } = await db.from('profile_permissions').delete().eq('perfil', perfil).eq('permission', permission);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
