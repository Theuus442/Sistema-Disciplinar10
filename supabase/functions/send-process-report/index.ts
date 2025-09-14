import { createClient } from 'https-esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https-esm.sh/resend@3';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { process_id } = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: processData, error: processError } = await supabaseAdmin
      .from('processes')
      .select(`
        *,
        employees (
          nome_completo
        )
      `)
      .eq('id', process_id)
      .single();

    if (processError) {
      return new Response(JSON.stringify({ error: processError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const recipientEmails = [
      (processData as any).notification_email_1,
      (processData as any).notification_email_2,
      (processData as any).notification_email_3,
    ]
      .filter(Boolean)
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Processo finalizado, mas nenhum e-mail de notificação foi fornecido.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const subject = `Processo Disciplinar Finalizado: ${(processData as any).employees?.nome_completo ?? ''}`;
    const html = `
      <h1>Relatório de Medida Disciplinar</h1>
      <p>O processo disciplinar para o funcionário <strong>${(processData as any).employees?.nome_completo ?? ''}</strong> foi finalizado.</p>
      <p><strong>Tipo de Desvio:</strong> ${(processData as any).tipo_desvio ?? ''}</p>
      <p><strong>Classificação:</strong> ${(processData as any).classificacao ?? ''}</p>
      <p><strong>Resolução Final:</strong> ${(processData as any).resolucao ?? ''}</p>
      <p><strong>Número da Ocorrência no SI:</strong> ${(processData as any).si_occurrence_number ?? ''}</p>
    `;

    const { error: sendErr } = await resend.emails.send({
      from: 'Sistema Disciplinar <onboarding@resend.dev>',
      to: recipientEmails,
      subject,
      html,
    } as any);

    if (sendErr) {
      return new Response(JSON.stringify({ error: sendErr.message ?? String(sendErr) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Relatório enviado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
