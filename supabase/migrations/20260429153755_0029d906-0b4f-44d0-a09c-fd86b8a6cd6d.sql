ALTER TABLE public.profiles DISABLE TRIGGER trg_sync_profile_to_staff;
ALTER TABLE public.staff DISABLE TRIGGER trg_sync_staff_to_profile;

UPDATE public.profiles p
SET full_name = COALESCE(NULLIF(TRIM(s.name_bn), ''), NULLIF(TRIM(s.name_en), ''), p.full_name),
    phone = COALESCE(NULLIF(TRIM(s.phone), ''), p.phone),
    avatar_url = COALESCE(NULLIF(TRIM(s.photo_url), ''), p.avatar_url),
    updated_at = now()
FROM public.staff s
WHERE s.user_id = p.id AND s.deleted_at IS NULL;

ALTER TABLE public.profiles ENABLE TRIGGER trg_sync_profile_to_staff;
ALTER TABLE public.staff ENABLE TRIGGER trg_sync_staff_to_profile;