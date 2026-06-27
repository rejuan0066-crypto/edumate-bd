UPDATE public.salary_records
SET base_salary = 10000,
    net_salary = net_salary - (base_salary - 10000),
    updated_at = now()
WHERE staff_id = 'ff848982-81e4-472b-bb31-a42e0adf30b0'
  AND month_year = '2026-05'
  AND status = 'pending'
  AND base_salary = 12000;