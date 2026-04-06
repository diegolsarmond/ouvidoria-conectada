-- Create assistant_prompts table
create table public.assistant_prompts (
  id uuid not null default extensions.uuid_generate_v4 (),
  orquestrador text null default ''::text,
  cadastro text null default ''::text,
  consulta text null default ''::text,
  atendimento text null default ''::text,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  triagem text null default ''::text,
  saudacao text null default ''::text,
  base_conhecimento text null default ''::text,
  constraint assistant_prompts_pkey primary key (id)
) TABLESPACE pg_default;

-- Create trigger to update updated_at column
create trigger update_assistant_prompts_updated_at BEFORE
update on assistant_prompts for EACH row
execute FUNCTION update_updated_at_column ();
