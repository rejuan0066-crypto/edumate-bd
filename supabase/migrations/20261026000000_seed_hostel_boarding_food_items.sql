-- Migration: Seed standard cooking food items for Hostel & Boarding Dining Stock
-- Safely inserts 36 essential cooking ingredients without creating duplicates

INSERT INTO public.inventory_items (
  name_bn,
  name_en,
  category,
  current_stock,
  unit,
  buying_price,
  min_stock_level,
  notes,
  is_active
)
SELECT v.name_bn, v.name_en, 'hostel_boarding', 0, v.unit, 0, v.min_stock_level, 'হোস্টেল রান্না ও বোর্ডিং খাদ্য সামগ্রী', true
FROM (
  VALUES
    ('সয়াবিন তেল', 'Soybean Oil', 'লিটার', 15),
    ('সরিষার তেল', 'Mustard Oil', 'লিটার', 5),
    ('আলু', 'Potato', 'কেজি', 25),
    ('পেঁয়াজ', 'Onion', 'কেজি', 15),
    ('রসুন', 'Garlic', 'কেজি', 5),
    ('আদা', 'Ginger', 'কেজি', 5),
    ('লবণ', 'Salt', 'কেজি', 10),
    ('হলুদ গুঁড়া', 'Turmeric Powder', 'কেজি', 5),
    ('মরিচ গুঁড়া', 'Chili Powder', 'কেজি', 5),
    ('ধনিয়া গুঁড়া', 'Coriander Powder', 'কেজি', 5),
    ('জিরা গুঁড়া', 'Cumin Powder', 'কেজি', 3),
    ('গোটা জিরা', 'Whole Cumin', 'প্যাকেট', 3),
    ('গরম মসলা (এলাচ, দারুচিনি, লবঙ্গ)', 'Garam Masala', 'প্যাকেট', 5),
    ('তেজপাতা', 'Bay Leaves', 'প্যাকেট', 5),
    ('চিনি', 'Sugar', 'কেজি', 10),
    ('চা পাতা', 'Tea Leaves', 'কেজি', 5),
    ('ডিম', 'Eggs', 'পিস', 50),
    ('ব্রয়লার / সোনালী মুরগি', 'Chicken', 'কেজি', 20),
    ('গরু / খাসির মাংস', 'Beef / Mutton', 'কেজি', 15),
    ('মাছ (রুই / কাতলা / তেলাপিয়া)', 'Fish', 'কেজি', 15),
    ('কাঁচা মরিচ', 'Green Chili', 'কেজি', 5),
    ('শুকনা মরিচ', 'Dry Red Chili', 'কেজি', 3),
    ('মুগ ডাল', 'Moong Dal', 'কেজি', 10),
    ('ছোলা / বুট', 'Chickpeas', 'কেজি', 10),
    ('আটা / ময়দা', 'Flour / Atta', 'কেজি', 20),
    ('সুজি', 'Semolina (Suji)', 'কেজি', 5),
    ('গুঁড়া দুধ', 'Milk Powder', 'কেজি', 5),
    ('তরল দুধ', 'Liquid Milk', 'লিটার', 10),
    ('কালোজিরা', 'Black Cumin', 'প্যাকেট', 2),
    ('সিরকা / ভিনেগার', 'Vinegar', 'বোতল', 2),
    ('ঘি', 'Ghee', 'কেজি', 2),
    ('পাঁচফোড়ন', 'Panch Phoron', 'প্যাকেট', 2),
    ('টমেটো', 'Tomato', 'কেজি', 10),
    ('মৌসুমি শাকসবজি', 'Seasonal Vegetables', 'কেজি', 20),
    ('সয়া বড়ি / নাগেটস', 'Soya Chunks', 'কেজি', 5),
    ('গ্যাস সিলিন্ডার', 'LP Gas Cylinder', 'পিস', 2)
) AS v(name_bn, name_en, unit, min_stock_level)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_items i 
  WHERE LOWER(TRIM(i.name_bn)) = LOWER(TRIM(v.name_bn))
    AND i.category = 'hostel_boarding'
);
