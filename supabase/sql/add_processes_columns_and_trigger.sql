-- Adiciona colunas para si_occurrence_number e e-mails de notificação
ALTER TABLE IF EXISTS public.processes
ADD COLUMN IF NOT EXISTS si_occurrence_number text,
ADD COLUMN IF NOT EXISTS notification_email_1 text,
ADD COLUMN IF NOT EXISTS notification_email_2 text,
ADD COLUMN IF NOT EXISTS notification_email_3 text;

-- Tabela de eventos para processamento assíncrono
CREATE TABLE IF NOT EXISTS public.process_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz
);

-- Função que insere evento quando status muda para Finalizado
CREATE OR REPLACE FUNCTION public.fn_process_status_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status IS NOT NULL AND NEW.status::text ILIKE 'Finalizado' AND (OLD.status IS NULL OR OLD.status::text NOT ILIKE 'Finalizado')) THEN
      INSERT INTO public.process_events (process_id, event_type, payload)
      VALUES (NEW.id, 'process_finalized', to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela processes
DROP TRIGGER IF EXISTS tr_process_status_change ON public.processes;
CREATE TRIGGER tr_process_status_change
AFTER UPDATE ON public.processes
FOR EACH ROW
EXECUTE FUNCTION public.fn_process_status_change();

-- Observação: Para executar este SQL você precisa de privilégios de admin no Supabase (p.ex. via SQL editor no painel ou psql com service role key).
