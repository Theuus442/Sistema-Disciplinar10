import { createClient } from '@supabase/supabase-js';

// Esta função foi escrita para ser implantada como uma Supabase Edge Function.
// Ela processa linhas na tabela `process_events` onde event_type = 'process_finalized' e processed = false.
// Para envio de e-mail, tentamos usar o cliente admin do Supabase (requere SUPABASE_SERVICE_ROLE_KEY).
// Caso prefira outro provedor (SendGrid/Resend), configure SENDGRID_API_KEY e descomente a seção correspondente.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Edge function requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const admin = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
  auth: { persistSession: false },
});

async function sendEmailViaSupabaseAuth(to: string[], subject: string, html: string) {
  // Nota: Supabase Auth Notifications não expõe uma first-class REST API para envio genérico de e-mails.
  // Abaixo segue um exemplo hipotético usando a API administrativa (pode não estar disponível dependendo da versão do supabase-js).
  // Se não funcionar no seu projeto, use SendGrid (ou outro) e configure SENDGRID_API_KEY.
  try {
    // Esta chamada pode não existir em sua versão do supabase-js; é mostrada como referência.
    // @ts-ignore
    if (admin?.auth?.admin && typeof (admin.auth.admin as any).sendEmail === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await (admin.auth.admin as any).sendEmail({ to, subject, html });
      return true;
    }
  } catch (e) {
    console.error('Supabase admin sendEmail failed', e);
  }
  return false;
}

async function sendEmailViaSendGrid(to: string[], subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured; skipping send');
    return false;
  }
  const payload = {
    personalizations: [
      {
        to: to.map((t) => ({ email: t })),
        subject,
      },
    ],
    from: { email: 'no-reply@seusistema.com', name: 'SisDisciplinar' },
    content: [{ type: 'text/html', value: html }],
  };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export const handler = async (_req: Request): Promise<Response> => {
  try {
    // Buscar eventos pendentes
    const { data: events, error } = await admin
      .from('process_events')
      .select('id, process_id, payload')
      .eq('event_type', 'process_finalized')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching events', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
    }

    let processedCount = 0;
    for (const ev of events as any[]) {
      const payload = ev.payload as any;
      const processId = ev.process_id;

      // construir relatório simples
      const reportHtml = `
        <h1>Relatório do Processo ${processId}</h1>
        <p><strong>Funcionário:</strong> ${payload.funcionario ?? payload.employee_id ?? '—'}</p>
        <p><strong>Tipo de Desvio:</strong> ${payload.tipo_desvio ?? payload.tipoDesvio ?? '—'}</p>
        <p><strong>Classificação:</strong> ${payload.classificacao ?? payload.classificacao ?? '—'}</p>
        <p><strong>Data de Abertura:</strong> ${payload.created_at ?? payload.data_ocorrencia ?? '—'}</p>
        <p><strong>Resolução:</strong> ${payload.resolucao ?? payload.resolucao ?? '—'}</p>
        <p><strong>Número SI:</strong> ${payload.si_occurrence_number ?? payload.siOccurrenceNumber ?? '—'}</p>
        <hr />
        <p>Gerado em: ${new Date().toISOString()}</p>
      `;

      // coletar e-mails das colunas
      const recipients = [payload.notification_email_1, payload.notification_email_2, payload.notification_email_3]
        .filter(Boolean)
        .map((s: any) => String(s).trim())
        .filter((s: string) => s.length > 0);

      if (recipients.length === 0) {
        // marca como processado mesmo sem destinatários
        await admin.from('process_events').update({ processed: true, processed_at: new Date() }).eq('id', ev.id);
        processedCount++;
        continue;
      }

      const subject = `Relat��rio de Processo ${processId}`;

      // Tentar via Supabase Auth Notifications (se disponível), senão SendGrid
      let sent = false;
      try {
        sent = await sendEmailViaSupabaseAuth(recipients, subject, reportHtml);
      } catch (e) {
        console.error('Supabase email send error', e);
      }
      if (!sent) {
        try {
          sent = await sendEmailViaSendGrid(recipients, subject, reportHtml);
        } catch (e) {
          console.error('SendGrid send error', e);
        }
      }

      if (sent) {
        await admin.from('process_events').update({ processed: true, processed_at: new Date() }).eq('id', ev.id);
        processedCount++;
      } else {
        console.warn(`Não foi possível enviar e-mail para evento ${ev.id}; será reprocessado posteriormente.`);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: processedCount }), { status: 200 });
  } catch (e: any) {
    console.error('Handler error', e?.stack || e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
};

export default handler;
