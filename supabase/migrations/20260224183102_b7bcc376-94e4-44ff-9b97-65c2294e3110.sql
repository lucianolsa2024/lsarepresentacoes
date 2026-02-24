
-- Add service_types multi-select column to service_orders
ALTER TABLE public.service_orders
ADD COLUMN service_types text[] NOT NULL DEFAULT '{}'::text[];
