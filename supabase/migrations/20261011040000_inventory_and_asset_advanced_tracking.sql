-- Migration: Enhance Inventory Items, Logs, and Fixed Assets for Advanced Tracking

-- 1. inventory_items enhancements
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS total_purchased NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_consumed NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'consumable';

-- Populate existing items initial purchased amount if 0
UPDATE public.inventory_items 
  SET total_purchased = current_stock 
  WHERE total_purchased = 0 AND current_stock > 0;

-- 2. inventory_logs enhancements
ALTER TABLE public.inventory_logs 
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient TEXT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;

-- 3. fixed_assets enhancements
ALTER TABLE public.fixed_assets 
  ADD COLUMN IF NOT EXISTS damaged_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_id UUID;

-- Update damaged quantity for existing damaged assets
UPDATE public.fixed_assets 
  SET damaged_quantity = COALESCE(quantity, 1) 
  WHERE status IN ('damaged', 'disposed') AND damaged_quantity = 0;

-- 4. RLS Policy updates to ensure admin and staff can manage items and assets
DO $$
BEGIN
  -- inventory_items
  DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory_items;
  DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory_items;
  CREATE POLICY "Staff can manage inventory" ON public.inventory_items
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );

  -- fixed_assets
  DROP POLICY IF EXISTS "Admins can manage assets" ON public.fixed_assets;
  DROP POLICY IF EXISTS "Staff can manage assets" ON public.fixed_assets;
  CREATE POLICY "Staff can manage assets" ON public.fixed_assets
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );

  -- inventory_logs
  DROP POLICY IF EXISTS "Admins can manage inventory logs" ON public.inventory_logs;
  DROP POLICY IF EXISTS "Staff can manage inventory logs" ON public.inventory_logs;
  CREATE POLICY "Staff can manage inventory logs" ON public.inventory_logs
    FOR ALL TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR true
    );
END $$;
