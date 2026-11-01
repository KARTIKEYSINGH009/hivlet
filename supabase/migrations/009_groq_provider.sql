-- Groq provider, local only, NOT live-verified. DO NOT RUN LIVE without
-- Kartikey's separate yes. Run AFTER 005, 006, 007, 008, in order.
--
-- Groq first pick made 2026-11-01. This only widens the provider
-- checks so an agent row can use provider 'groq'. It stores NO key:
-- agent_credentials still holds a key REFERENCE only, and the worker
-- resolves GROQ_API_KEY from server-only environment at run time.
--
-- Known Groq models on this account (from prior Verity work):
-- openai/gpt-oss-20b, openai/gpt-oss-120b, qwen/qwen3.8-27b.
-- llama-3.3-70b-versatile returned model_not_found on this account
-- and must not be used. Model choice stays per agent, configurable.

-- agents table: schema.sql and 002 both set this named check.
alter table agents drop constraint if exists agents_provider_check;
alter table agents add constraint agents_provider_check
  check (provider in ('openai', 'anthropic', 'gemini', 'groq', 'custom'));

-- agent_credentials table: 003 sets an unnamed check, so drop it
-- dynamically by looking up any check constraint mentioning provider,
-- rather than guessing its auto-generated name. Then re-add it with
-- 'groq' included. No key data is touched.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'agent_credentials'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%provider%'
  loop
    execute 'alter table agent_credentials drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

alter table agent_credentials add constraint agent_credentials_provider_check
  check (provider in ('openai', 'anthropic', 'gemini', 'groq', 'custom'));
