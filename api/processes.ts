import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function sanitizeEnv(v?: string | null) { if (!v) return undefined as any; const t=v.trim().replace(/^['"]|['"]$/g, ""); if(!t||t.toLowerCase()==='undefined'||t.toLowerCase()==='null') return undefined as any; return t; }
function createFetchWithTimeout(defaultMs=7000){ return async (input:any, init?:any)=>{ const controller=new AbortController(); const id=setTimeout(()=>controller.abort(new Error('fetch timeout') as any), init?.timeout ?? defaultMs); try{ const res=await fetch(input,{...init, signal:controller.signal}); return res as any; } finally{ clearTimeout(id); } }; }
function getAdminClient(){ const url=sanitizeEnv(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL); const serviceKey=sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY); if(!url||!serviceKey) return null; return createClient(url, serviceKey, { auth:{ persistSession:false }, global:{ fetch: createFetchWithTimeout(8000) } as any }); }

export default async function handler(_req: VercelRequest, res: VercelResponse){
  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente no servidor' });

  const { data: processes, error: procErr } = await admin.from('processes').select('*').limit(200);
  if (procErr) return res.status(400).json({ error: procErr.message });
  const procs = Array.isArray(processes) ? processes : [];

  const employeeIds = Array.from(new Set(procs.map((p:any)=>p.employee_id).filter(Boolean)));
  const employeesById = new Map<string, any>();
  if (employeeIds.length){ const { data: employees } = await admin.from('employees').select('*').in('id', employeeIds as any); for(const e of employees || []) employeesById.set((e as any).id, e); }

  function normalizeClassificacao(c?: string | null){ if(!c) return 'Leve'; return c==='Media' ? 'Média' : c; }
  function normalizeStatus(s?: string | null){ if(!s) return 'Em Análise' as any; if(s==='Em_Analise') return 'Em Análise' as any; return (s.replace(/_/g,' ') as any); }

  const items = procs.map((p:any)=>{ const emp=employeesById.get(p.employee_id); const funcionario=emp?.nome_completo ?? emp?.matricula ?? ''; const d=p.created_at ?? p.data_ocorrencia ?? p.createdAt ?? p.dataOcorrencia; const dataAbertura = d ? new Date(d).toLocaleDateString() : ''; return { id:p.id, funcionario, tipoDesvio: p.tipo_desvio ?? '', classificacao: normalizeClassificacao(p.classificacao), dataAbertura, status: normalizeStatus(p.status) }; });

  return res.json(items);
}
