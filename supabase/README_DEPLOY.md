Guia de implantação — Supabase (PT-BR)

Objetivo
--------
Este guia contém passos práticos para deixar sua instância Supabase pronta para usar os recursos adicionados no repositório: colunas novas em `processes`, trigger/funcion, tabela `process_events` e a Edge Function `send_process_report`.

Arquivos relevantes (no repositório)
-----------------------------------
- supabase/sql/add_processes_columns_and_trigger.sql — SQL para criar colunas, tabela de eventos e trigger.
- supabase/edge_functions/send_process_report/index.ts — Edge Function que processa eventos e envia e‑mails.

Variáveis de ambiente necessárias
--------------------------------
- Para o frontend (Vite):
  - VITE_SUPABASE_URL = https://<sua-instancia>.supabase.co
  - VITE_SUPABASE_ANON_KEY = <anon-public-key>

- Para a Edge Function (e operações admin):
  - SUPABASE_URL = https://<sua-instancia>.supabase.co
  - SUPABASE_SERVICE_ROLE_KEY = <service-role-key>  # necessário para ações admin (ler process_events, envio admin)
  - SENDGRID_API_KEY = <sua-sendgrid-key> (opcional, fallback caso envio via Supabase admin não esteja disponível)

Passos para executar o SQL (adicionar colunas e trigger)
--------------------------------------------------------
1. Abra o painel do Supabase > SQL Editor.
2. Cole o conteúdo do arquivo `supabase/sql/add_processes_columns_and_trigger.sql` e execute.
3. Verifique se as colunas foram criadas em `public.processes` e se a tabela `public.process_events` existe.

Observações:
- A execução do SQL exige privilégios de administrador (role com permissão para ALTER TABLE e CREATE TRIGGER).

Implantando a Edge Function (opção: Supabase CLI)
------------------------------------------------
Recomendado: usar Supabase CLI para deploy das Edge Functions.

1. Instale a supabase CLI: https://supabase.com/docs/guides/cli
2. No terminal, autentique: supabase login
3. Posicione-se na pasta do projeto ou crie um diretório temporário com o conteúdo de `supabase/edge_functions/send_process_report/`.
4. Deploy:
   - supabase functions deploy send_process_report --project-ref <seu-project-ref>

Configurar variáveis de ambiente para a função:
- No painel Supabase > Functions > Config, defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (e opcionalmente SENDGRID_API_KEY).

Testar a função manualmente
--------------------------
- Após deploy, na UI de Functions do Supabase você pode invocar a função manualmente.
- Alternativamente, acione via supabase CLI:
  - supabase functions invoke send_process_report --project-ref <seu-project-ref>

Fluxo de processamento
----------------------
1. Quando um processo tem seu `status` alterado para "Finalizado", o trigger PL/pgSQL insere um registro na tabela `process_events`.
2. A Edge Function `send_process_report` lê `process_events` não processados, gera um relatório simples (HTML) e envia por e‑mail para os endereços presentes nas colunas `notification_email_1/2/3`.
3. Ao enviar com sucesso, a função marca o evento como processed = true.

Observações técnicas e alternativas
----------------------------------
- Supabase Auth Notifications: nem todas as versões/instâncias oferecem uma API pública para envio de e‑mail via admin SDK. No código da função há uma tentativa via admin client e um fallback para SendGrid.
- Se preferir outro provedor (Resend, Mailgun, etc.), adapte `send_process_report/index.ts` para usar a API correspondente e adicione a variável de ambiente necessária.
- Para processamento em tempo real sem polling/agendamento, é necessário configurar mecanismos adicionais (NOTIFY/listeners, pg_net ou serviços externos). O SQL + função atual usa fila via tabela e processamento por chamada à função.

Testes locais
-------------
- Para testar localmente a Edge Function, defina as variáveis de ambiente e execute a função com Node (ou com supabase CLI local dev):
  - export SUPABASE_URL=...
  - export SUPABASE_SERVICE_ROLE_KEY=...
  - node dist/index.js   # se compilar para JS

Checklist rápido antes de testar em produção
-------------------------------------------
- [ ] Executou SQL no Supabase
- [ ] Deploy da Edge Function e configurou variáveis de ambiente na UI
- [ ] Verificou que as colunas `notification_email_1/2/3` e `si_occurrence_number` existem
- [ ] Testou a função manualmente via UI/CLI
- [ ] Testou o fluxo de finalização do processo no frontend (campos de e‑mail preenchidos)

Suporte
-------
Se quiser, eu posso: gerar scripts para deploy automatizado (ex.: GitHub Actions), compilar a Edge Function para JS, ou criar um README de teste com curl para validar a função. Quer que eu gere o README de testes e um exemplo curl para invocar a Edge Function? 
