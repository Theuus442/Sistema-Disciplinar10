Import Employees Edge Function

Descrição
---------
Edge Function que recebe um arquivo CSV (via multipart/form-data com campo 'file', ou JSON { csv: '...' }) e faz upsert na tabela `employees` com base na coluna `matricula`.

Requisitos de ambiente
----------------------
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Como deployar
-------------
1. Instale e configure o Supabase CLI: https://supabase.com/docs/guides/cli
2. Coloque esta pasta em seu projeto local (`supabase/edge_functions/import_employees`).
3. Faça deploy:
   supabase functions deploy import_employees --project-ref <SEU_PROJECT_REF>
4. Defina as variáveis de ambiente no painel ou via CLI (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).

Testes
------
Exemplo usando curl (multipart/form-data):

curl -X POST "https://<YOUR_PROJECT>.functions.supabase.co/import_employees" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -F "file=@/path/to/funcionarios.csv;type=text/csv"

Exemplo usando JSON body (envia o CSV como texto):

curl -X POST "https://<YOUR_PROJECT>.functions.supabase.co/import_employees" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"csv": "matricula,nome_completo,cargo,setor,gestor_id\n123,Jo\"ao Silva,Analista,TI,EMP-001"}'

Formato CSV esperado
--------------------
Colunas (nomes e ordem): matricula, nome_completo, cargo, setor, gestor_id
- `matricula` é obrigatório; linhas sem matrícula serão ignoradas e reportadas em details.

Resposta
--------
JSON: { inserted: number, updated: number, errors: number, details: [ ... ] }

Observações
-----------
- A função usa upsert com onConflict: 'matricula'. Garanta que exista uma constraint/índice único na coluna matricula na tabela employees para comportamento correto.
- Para arquivos grandes, considere dividir em chunks e chamar a função repetidamente.
