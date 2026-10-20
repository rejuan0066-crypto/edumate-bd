-- Standardize staff_categories name_bn to professional Department (বিভাগ) names
-- Eliminates confusion between designations (e.g. কর্মকর্তা, কর্মচারী) and department names (বিভাগ)

UPDATE public.staff_categories
SET name_bn = 'প্রশাসন বিভাগ'
WHERE key = 'administrative' AND (name_bn IS NULL OR name_bn IN ('প্রশাসনিক কর্মকর্তা', 'প্রশাসনিক'));

UPDATE public.staff_categories
SET name_bn = 'শিক্ষা বিভাগ'
WHERE key = 'teacher' AND (name_bn IS NULL OR name_bn IN ('শিক্ষক'));

UPDATE public.staff_categories
SET name_bn = 'অফিস বিভাগ'
WHERE key = 'support' AND (name_bn IS NULL OR name_bn IN ('অফিস কর্মচারী', 'সাপোর্ট স্টাফ'));

UPDATE public.staff_categories
SET name_bn = 'সাধারণ / সহায়ক বিভাগ'
WHERE key = 'general' AND (name_bn IS NULL OR name_bn IN ('সহায়ক কর্মী', 'সহায়ক কর্মী'));

UPDATE public.staff_categories
SET name_bn = 'রান্না বিভাগ'
WHERE key IN ('chef', 'cook') AND (name_bn IS NULL OR name_bn IN ('বাবুর্চি', 'কুক'));
