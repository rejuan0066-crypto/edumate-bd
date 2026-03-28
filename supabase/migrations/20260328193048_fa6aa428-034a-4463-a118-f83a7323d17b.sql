
ALTER TABLE public.custom_forms 
  ADD COLUMN publish_to text NOT NULL DEFAULT 'none',
  ADD COLUMN parent_menu text DEFAULT NULL,
  ADD COLUMN menu_slug text DEFAULT NULL;
