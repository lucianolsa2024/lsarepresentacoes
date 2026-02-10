ALTER TABLE public.activities DROP CONSTRAINT activities_type_check;

ALTER TABLE public.activities ADD CONSTRAINT activities_type_check 
CHECK (type = ANY (ARRAY['followup'::text, 'ligacao'::text, 'email'::text, 'visita'::text, 'reuniao'::text, 'tarefa'::text, 'treinamento'::text, 'assistencia'::text, 'relacionamento'::text, 'checklist_loja'::text, 'outros'::text]));