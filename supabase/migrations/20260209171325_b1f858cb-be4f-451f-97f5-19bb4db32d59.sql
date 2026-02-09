
-- Create sales opportunities table for Kanban funnel
CREATE TABLE public.sales_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  funnel_type TEXT NOT NULL DEFAULT 'lojista' CHECK (funnel_type IN ('lojista', 'corporativo')),
  stage TEXT NOT NULL DEFAULT 'prospeccao',
  value NUMERIC DEFAULT 0,
  expected_close_date DATE,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  lost_reason TEXT,
  won_at TIMESTAMP WITH TIME ZONE,
  lost_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Opportunities viewable by authenticated"
  ON public.sales_opportunities FOR SELECT
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can insert opportunities"
  ON public.sales_opportunities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can update opportunities"
  ON public.sales_opportunities FOR UPDATE
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can delete opportunities"
  ON public.sales_opportunities FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_sales_opportunities_updated_at
  BEFORE UPDATE ON public.sales_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
