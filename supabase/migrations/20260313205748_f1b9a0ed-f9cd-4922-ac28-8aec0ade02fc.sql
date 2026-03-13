ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.activities
ADD CONSTRAINT activities_status_check
CHECK (
  status = ANY (
    ARRAY['pendente'::text, 'em_andamento'::text, 'concluida'::text, 'cancelada'::text, 'realizada'::text, 'agendada'::text]
  )
);