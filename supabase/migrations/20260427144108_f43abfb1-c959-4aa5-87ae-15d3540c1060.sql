ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check CHECK (
  type = ANY (ARRAY[
    'followup'::text,
    'ligacao'::text,
    'whatsapp'::text,
    'email'::text,
    'visita'::text,
    'reuniao'::text,
    'proposta_enviada'::text,
    'tarefa'::text,
    'treinamento'::text,
    'assistencia'::text,
    'relacionamento'::text,
    'checklist_loja'::text,
    'outro_crm'::text,
    'outros'::text
  ])
);

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check CHECK (
  status = ANY (ARRAY[
    'pendente'::text,
    'em_andamento'::text,
    'concluida'::text,
    'cancelada'::text,
    'realizada'::text,
    'agendada'::text
  ])
);