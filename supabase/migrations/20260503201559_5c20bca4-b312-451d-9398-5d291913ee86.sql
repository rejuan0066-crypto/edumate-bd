DO $$
DECLARE
  v_correct uuid;
  v_wrong uuid;
BEGIN
  SELECT id INTO v_correct FROM public.designations WHERE name_bn = 'কোষাধ্যক্ষ' LIMIT 1;
  SELECT id INTO v_wrong   FROM public.designations WHERE name_bn = 'কোষাধ্যক' LIMIT 1;

  IF v_wrong IS NOT NULL AND v_correct IS NOT NULL THEN
    BEGIN
      UPDATE public.staff SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN
      UPDATE public.administrative_officers SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    BEGIN
      UPDATE public.committee_members SET designation = v_correct::text WHERE designation = v_wrong::text;
    EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
    DELETE FROM public.designations WHERE id = v_wrong;
  ELSIF v_wrong IS NOT NULL AND v_correct IS NULL THEN
    UPDATE public.designations SET name_bn = 'কোষাধ্যক্ষ' WHERE id = v_wrong;
  END IF;
END $$;

UPDATE public.designations SET name_bn = REPLACE(name_bn, 'কোষাধ্যক', 'কোষাধ্যক্ষ')
  WHERE name_bn LIKE '%কোষাধ্যক%' AND name_bn NOT LIKE '%কোষাধ্যক্ষ%';