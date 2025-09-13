import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Edge Function requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { persistSession: false },
});

function parseCsvToObjects(csvText: string) {
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++; // escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur !== '' || row.length > 0) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      }
      if (ch === '\r' && next === '\n') i++;
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const objs: any[] = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    if (values.length === 1 && values[0].trim() === '') continue;
    const obj: any = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (values[c] ?? '').trim();
    }
    objs.push(obj);
  }
  return objs;
}

async function upsertEmployees(rows: any[]) {
  const details: any[] = [];
  const toUpsert: any[] = [];
  const matriculas = new Set<string>();

  for (const row of rows) {
    const matricula = (row['matricula'] ?? row['matrícula'] ?? '').trim();
    if (!matricula) {
      details.push({ row, error: 'matricula missing' });
      continue;
    }
    const nome_completo = (row['nome_completo'] ?? row['nome'] ?? '').trim();
    const cargo = (row['cargo'] ?? '').trim() || null;
    const setor = (row['setor'] ?? '').trim() || null;
    const gestor_id = (row['gestor_id'] ?? '').trim() || null;
    toUpsert.push({ matricula, nome_completo, cargo, setor, gestor_id });
    matriculas.add(matricula);
  }

  // fetch existing matriculas
  let existing: any[] = [];
  if (matriculas.size > 0) {
    const { data, error } = await admin.from('employees').select('matricula').in('matricula', Array.from(matriculas) as any);
    if (!error && Array.isArray(data)) existing = data as any[];
  }
  const existingSet = new Set((existing || []).map((e: any) => e.matricula));

  const inserted = toUpsert.filter((t) => !existingSet.has(t.matricula)).length;
  const updated = toUpsert.filter((t) => existingSet.has(t.matricula)).length;

  if (toUpsert.length > 0) {
    const { error: upsertErr } = await admin.from('employees').upsert(toUpsert as any, { onConflict: 'matricula' });
    if (upsertErr) {
      return { error: upsertErr, inserted: 0, updated: 0, details };
    }
  }

  return { inserted, updated, details };
}

export const handler = async (req: Request): Promise<Response> => {
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Only POST allowed' }), { status: 405 });

    let csvText: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      csvText = body?.csv ?? null;
    } else if (contentType.includes('multipart/form-data')) {
      const form = await (req as any).formData();
      const file = form.get('file') as any;
      if (file && typeof file.text === 'function') {
        csvText = await file.text();
      } else if (file && file.arrayBuffer) {
        const ab = await file.arrayBuffer();
        csvText = new TextDecoder().decode(ab);
      }
    } else {
      // Try raw text
      csvText = await req.text().catch(() => null);
    }

    if (!csvText) return new Response(JSON.stringify({ error: 'CSV file required (send as form-data file or JSON { csv } or raw text)' }), { status: 400 });

    const objs = parseCsvToObjects(csvText);
    if (!Array.isArray(objs)) return new Response(JSON.stringify({ error: 'Invalid CSV' }), { status: 400 });

    const result = await upsertEmployees(objs);
    if ((result as any).error) {
      return new Response(JSON.stringify({ error: (result as any).error?.message || String((result as any).error) }), { status: 500 });
    }

    return new Response(JSON.stringify({ inserted: result.inserted, updated: result.updated, errors: result.details.length, details: result.details }), { status: 200 });
  } catch (e: any) {
    console.error('import_employees handler error', e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
};

export default handler;
