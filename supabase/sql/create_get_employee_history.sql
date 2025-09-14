-- Creates a resilient get_employee_history RPC that adapts to column names
-- Run this in Supabase SQL editor (or via MCP) on your project

CREATE OR REPLACE FUNCTION public.get_employee_history(p_employee_id text)
RETURNS TABLE (
  id text,
  data timestamptz,
  tipo text,
  classificacao text,
  status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  has_tipo_desvio boolean;
  has_misconduct_type boolean;
  has_classificacao boolean;
  has_classification boolean;
  has_data_ocorrencia boolean;
  date_col text;
  tipo_col text;
  class_col text;
  dyn_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='processes' AND column_name='tipo_desvio'
  ) INTO has_tipo_desvio;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='processes' AND column_name='misconduct_type'
  ) INTO has_misconduct_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='processes' AND column_name='classificacao'
  ) INTO has_classificacao;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='processes' AND column_name='classification'
  ) INTO has_classification;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='processes' AND column_name='data_ocorrencia'
  ) INTO has_data_ocorrencia;

  date_col := CASE WHEN has_data_ocorrencia THEN 'data_ocorrencia' ELSE 'created_at' END;
  tipo_col := CASE
                WHEN has_tipo_desvio THEN 'tipo_desvio'
                WHEN has_misconduct_type THEN 'misconduct_type'
                ELSE NULL
              END;
  class_col := CASE
                 WHEN has_classificacao THEN 'classificacao'
                 WHEN has_classification THEN 'classification'
                 ELSE NULL
               END;

  dyn_sql := 'SELECT id::text as id, ' || quote_ident(date_col) || ' as data, ' ||
             COALESCE(quote_ident(tipo_col) || '::text', 'NULL::text') || ' as tipo, ' ||
             COALESCE(quote_ident(class_col) || '::text', 'NULL::text') || ' as classificacao, ' ||
             'status::text as status ' ||
             'FROM public.processes WHERE employee_id = $1 ORDER BY ' || quote_ident(date_col) || ' DESC';

  RETURN QUERY EXECUTE dyn_sql USING p_employee_id;
END;
$$;

-- Optional: grant execute to anon/authenticated roles if needed
-- GRANT EXECUTE ON FUNCTION public.get_employee_history(text) TO anon, authenticated;
