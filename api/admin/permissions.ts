import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:VercelRequest,res:VercelResponse){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=(((profResp as any).data ?? profResp)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }

export default async function handler(req: VercelRequest, res: VercelResponse){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;
  try {
    const { data, error } = await db.from('permissions').select('name, permission');
    if (!error && Array.isArray(data) && data.length>0) {
      return res.json((data as any).map((d:any)=> d.permission || d.name).filter(Boolean));
    }
  } catch {}
  return res.json([
    'processo:criar',
    'processo:ver_todos',
    'processo:editar',
    'relatorios:ver',
    'usuarios:gerenciar',
  ]);
}
