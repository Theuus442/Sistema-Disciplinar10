import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t = v.trim().replace(/^['"]|['"]$/g, ""); if (!t || t.toLowerCase()==='undefined' || t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs = 7000) { return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const key=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!key) return null; return createClient(url,key,{auth:{persistSession:false},global:{fetch:createFetchWithTimeout(8000)} as any}); }
function getAnonClientWithToken(token:string){ const url=sanitizeEnv(process.env.SUPABASE_URL||(process.env as any).VITE_SUPABASE_URL); const anon=sanitizeEnv((process.env as any).SUPABASE_ANON_KEY||(process.env as any).VITE_SUPABASE_ANON_KEY); if(!url||!anon) return null as any; return createClient(url,anon,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`},fetch:createFetchWithTimeout(7000)} as any}); }
async function ensureAdmin(req:VercelRequest,res:VercelResponse){ const auth=(req.headers?.authorization as string)||''; const token=auth.startsWith('Bearer ')?auth.slice(7):auth; if(!token) return res.status(401).json({error:'Não autorizado: token não fornecido.'}); const userClient=getAnonClientWithToken(token); if(!userClient) return res.status(500).json({error:'Configuração Supabase ausente (URL/ANON).'}); const {data:userData,error:getUserErr}=await userClient.auth.getUser(); if(getUserErr) return res.status(401).json({error:'Token inválido ou problema na autenticação.'}); const userId=(userData?.user as any)?.id ?? null; if(!userId) return res.status(401).json({error:'Token inválido.'}); const profResp=await userClient.from('profiles').select('id,perfil').eq('id',userId).maybeSingle(); if((profResp as any)?.error) return res.status(401).json({error:'Token inválido ou sem permissão para acessar perfil.'}); const perfilLower=(((profResp as any).data ?? profResp)?.perfil ?? '').toLowerCase(); if(perfilLower!=='administrador') return res.status(403).json({error:'Acesso proibido: somente administradores.'}); const admin=getAdminClient(); const db=admin ?? userClient; return {admin,db} as const; }

export default async function handler(req: VercelRequest, res: VercelResponse){
  const ctx = await ensureAdmin(req,res) as any; if(!ctx) return; const db = ctx.db;
  const { data: processes, error: procErr } = await db.from('processes').select('*').limit(200);
  if (procErr) return res.status(400).json({ error: procErr.message });
  const procs = Array.isArray(processes) ? processes : [];
  const employeeIds = Array.from(new Set(procs.map((p:any)=>p.employee_id).filter(Boolean)));
  const employeesById = new Map<string, any>();
  if (employeeIds.length){ const { data: employees } = await db.from('employees').select('*').in('id', employeeIds as any); for(const e of employees || []) employeesById.set((e as any).id, e); }
  const procActivities = procs.map((p:any)=>{ const at=p?.created_at||(p as any)?.data_da_ocorrencia||p?.updated_at||p?.createdAt||(p as any)?.dataOcorrencia||p?.updatedAt||new Date().toISOString(); const emp=employeesById.get(p.employee_id); const nome=emp?.nome_completo ?? 'Funcionário'; const tipo=p.tipo_desvio ?? 'Processo'; return { id:`process:${p.id}`, descricao:`Abertura de processo (${tipo}) para ${nome}`, at:String(at) }; });
  const { data: recentProfiles, error: profilesErr } = await db.from('profiles').select('*').limit(100);
  if (profilesErr) return res.status(400).json({ error: profilesErr.message });
  const userActivities = (recentProfiles || []).map((p:any)=>{ const at=p.ultimo_acesso||p.ultimoAcesso||p.updated_at||p.updatedAt||p.created_at||p.createdAt||new Date().toISOString(); return { id:`user:${p.id}`, descricao:`Cadastro de usuário ${p.nome || p.email || p.id}`, at:String(at) }; });
  const all = [...procActivities, ...userActivities].sort((a,b)=> new Date(b.at as any).getTime() - new Date(a.at as any).getTime()).slice(0,15);
  return res.json(all);
}
