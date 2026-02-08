
-- Create orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  issue_date date NOT NULL,
  client_name text NOT NULL,
  supplier text,
  representative text,
  order_number text,
  oc text,
  product text,
  fabric_provided text DEFAULT 'NAO',
  fabric text,
  dimensions text,
  delivery_date date,
  quantity integer DEFAULT 1,
  price numeric DEFAULT 0,
  order_type text DEFAULT 'ENCOMENDA',
  payment_terms text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Orders viewable by authenticated" ON public.orders
  FOR SELECT USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can insert orders" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can update orders" ON public.orders
  FOR UPDATE USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for client lookup
CREATE INDEX idx_orders_client_id ON public.orders(client_id);
CREATE INDEX idx_orders_client_name ON public.orders(client_name);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
