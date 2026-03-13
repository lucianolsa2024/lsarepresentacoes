
-- Add new columns for CRM/Tarefa split
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS activity_category text NOT NULL DEFAULT 'tarefa',
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS next_contact_date date,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);

-- Categorize existing activities: CRM types map to 'crm', rest to 'tarefa'
UPDATE public.activities 
SET activity_category = 'crm' 
WHERE type IN ('followup', 'ligacao', 'email', 'visita', 'reuniao', 'relacionamento');

-- Update existing 'tarefa' type activities to keep as 'tarefa' category (already default)
