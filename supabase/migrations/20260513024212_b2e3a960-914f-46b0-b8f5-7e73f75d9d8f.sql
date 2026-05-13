UPDATE website_settings
SET value = value || '[
  {"id":"quran-public","path":"/quran","label_bn":"কুরআন","label_en":"Quran","icon":"","visible":true,"sort_order":9.7},
  {"id":"zakat-fitra-public","path":"/zakat-fitra","label_bn":"যাকাত ও ফিতরা","label_en":"Zakat & Fitra","icon":"","visible":true,"sort_order":9.8}
]'::jsonb,
updated_at = now()
WHERE key = 'public_menu'
  AND NOT (value @> '[{"id":"quran-public"}]'::jsonb);