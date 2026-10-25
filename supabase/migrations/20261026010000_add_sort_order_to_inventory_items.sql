-- Migration: Add sort_order to inventory_items for custom ordering and serial numbering
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inventory_items_sort_order ON public.inventory_items(sort_order);

-- Initialize sort_order for hostel_boarding items
UPDATE public.inventory_items SET sort_order = 1 WHERE name_bn = 'চাউল' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 2 WHERE (name_bn = 'ডাল' OR name_bn = 'মসুর ডাল') AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 3 WHERE name_bn = 'সয়াবিন তেল' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 4 WHERE name_bn = 'সরিষার তেল' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 5 WHERE name_bn = 'আলু' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 6 WHERE name_bn = 'পেঁয়াজ' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 7 WHERE name_bn = 'রসুন' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 8 WHERE name_bn = 'আদা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 9 WHERE name_bn = 'কাঁচা মরিচ' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 10 WHERE name_bn = 'লবণ' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 11 WHERE name_bn = 'হলুদ গুঁড়া' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 12 WHERE name_bn = 'মরিচ গুঁড়া' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 13 WHERE name_bn = 'ধনিয়া গুঁড়া' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 14 WHERE name_bn = 'জিরা গুঁড়া' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 15 WHERE name_bn = 'গোটা জিরা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 16 WHERE name_bn = 'গরম মসলা (এলাচ, দারুচিনি, লবঙ্গ)' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 17 WHERE name_bn = 'তেজপাতা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 18 WHERE name_bn = 'পাঁচফোড়ন' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 19 WHERE name_bn = 'ডিম' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 20 WHERE name_bn = 'ব্রয়লার / সোনালী মুরগি' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 21 WHERE name_bn = 'গরু / খাসির মাংস' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 22 WHERE name_bn = 'মাছ (রুই / কাতলা / তেলাপিয়া)' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 23 WHERE name_bn = 'টমেটো' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 24 WHERE name_bn = 'মৌসুমি শাকসবজি' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 25 WHERE name_bn = 'মুগ ডাল' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 26 WHERE name_bn = 'ছোলা / বুট' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 27 WHERE name_bn = 'চিনি' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 28 WHERE name_bn = 'চা পাতা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 29 WHERE name_bn = 'গুঁড়া দুধ' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 30 WHERE name_bn = 'তরল দুধ' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 31 WHERE name_bn = 'আটা / ময়দা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 32 WHERE name_bn = 'সুজি' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 33 WHERE name_bn = 'সয়া বড়ি / নাগেটস' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 34 WHERE name_bn = 'ঘি' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 35 WHERE name_bn = 'কালোজিরা' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 36 WHERE name_bn = 'সিরকা / ভিনেগার' AND category = 'hostel_boarding';
UPDATE public.inventory_items SET sort_order = 37 WHERE name_bn = 'গ্যাস সিলিন্ডার' AND category = 'hostel_boarding';
