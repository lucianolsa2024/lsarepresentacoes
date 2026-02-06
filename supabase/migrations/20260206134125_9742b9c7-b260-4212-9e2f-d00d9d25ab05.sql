
-- Create activity_checklist_items table for fixed checklist items per activity type
CREATE TABLE public.activity_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies (same access as activities - open for authenticated users)
CREATE POLICY "Authenticated users can view checklist items"
  ON public.activity_checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert checklist items"
  ON public.activity_checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update checklist items"
  ON public.activity_checklist_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete checklist items"
  ON public.activity_checklist_items FOR DELETE
  TO authenticated
  USING (true);

-- Index for faster queries by activity
CREATE INDEX idx_checklist_activity_id ON public.activity_checklist_items(activity_id);
