# RLS Security Verification Checklist

**Last reviewed:** 2026-05-01
**Automated suite:** `supabase/tests/rls_security_checks.sql`

Run the SQL suite before every release and after any migration touching RLS, storage, or realtime:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/rls_security_checks.sql | tee /tmp/rls.log
! grep -E "FAIL|VIOLATION" /tmp/rls.log
```

The script exits 0 on success; CI must fail if any line contains `FAIL` or `VIOLATION`.

---

## 1. Applicant PII — `admission_test_attempts`

| # | Check | How to verify | Expected |
|---|---|---|---|
| 1.1 | No `anon`/PUBLIC SELECT policy on base table | Suite check 1a | PASS |
| 1.2 | `admission_test_attempts_public` view exists with `security_invoker=on` | Suite check 1b | PASS |
| 1.3 | Public view excludes `applicant_phone`, `applicant_email`, `applicant_address`, `applicant_guardian`, `applicant_nid_birth`, `ip_address`, `user_agent` | Suite check 1c | PASS, `leaked_columns = none` |
| 1.4 | `submit_admission_test_attempt(...)` exists and is `SECURITY DEFINER` | Suite check 1d | PASS |
| 1.5 | RPC returns only the new attempt `id` (not full row) | Read RPC body | Single `uuid` returned |
| 1.6 | Frontend `AdmissionTestTake.tsx` uses the RPC, not `from('admission_test_attempts').insert(...)` | `rg "admission_test_attempts" src/pages/AdmissionTestTake.tsx` | Only RPC reference |
| 1.7 | Frontend `AdmissionTestMerit.tsx` queries the public view | `rg "admission_test_attempts" src/pages/AdmissionTestMerit.tsx` | Only `_public` reference |

---

## 2. Salary records — `salary_records`

| # | Check | How to verify | Expected |
|---|---|---|---|
| 2.1 | RLS enabled | Suite check 2a | PASS |
| 2.2 | No `USING (true)` SELECT policy | Suite check 2b | PASS, `none` |
| 2.3 | Self-only policy: `staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())` | Suite check 2c | PASS |
| 2.4 | Manager view requires `admin` / `super_admin` / `has_menu_permission('/admin/salary','view')` | Inspect `Salary managers can view all salary records` policy | Policy body matches |
| 2.5 | INSERT requires `has_menu_permission('/admin/salary','add')` | Inspect | Matches |
| 2.6 | UPDATE requires `has_menu_permission('/admin/salary','edit')` | Inspect | Matches |
| 2.7 | DELETE requires `has_menu_permission('/admin/salary','delete')` | Inspect | Matches |
| 2.8 | NOT in `supabase_realtime` publication | Suite check 2d | PASS |
| 2.9 | `salary-pdf` edge function performs server-side admin/permission check (not just JWT validity) | Read `supabase/functions/salary-pdf/index.ts` | `has_role`/`has_menu_permission` call present |
| 2.10 | `/admin/salary` route wrapped in `<ModuleGuard menuPath="/admin/salary">` | `rg "menuPath=\"/admin/salary\"" src/App.tsx` | Match found |
| 2.11 | Sensitive amount columns AES-256 encrypted (pgcrypto shadow columns) | `\d salary_records` shows `*_enc` columns | Present |

**Manual impersonation test (recommended quarterly):**
```sql
-- As a non-admin staff member:
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<teacher-user-id>';
SELECT count(*) FROM public.salary_records;       -- must equal own records only
SELECT count(*) FROM public.salary_records WHERE staff_id <> '<own-staff-id>';  -- must be 0
RESET ROLE;
```

---

## 3. Storage access

| # | Check | How to verify | Expected |
|---|---|---|---|
| 3.1 | `receipts` bucket is `public = false` | Suite check 3a | PASS |
| 3.2 | `staff-letters` bucket is `public = false` | Suite check 3a | PASS |
| 3.3 | No `anon` / PUBLIC SELECT policy on `storage.objects` for `receipts`, `staff-letters`, `committee-attachments` | Suite check 3b | PASS |
| 3.4 | Authenticated SELECT on `receipts` requires staff/admin role or owner match | Inspect `pg_policies` for `storage.objects` | Role-gated |
| 3.5 | All uploads go through `validate-file-upload` edge function (magic-byte check) | `rg "validate-file-upload" src` | Used at every upload site |
| 3.6 | `institution-logos` bucket public — **intentional** (branding) | Suite check 3a does not include it | Acceptable |

**Manual anon test:**
```bash
# Should 404/403, not list objects
curl -i "$SUPABASE_URL/storage/v1/object/list/receipts" \
     -H "apikey: $SUPABASE_ANON_KEY"
```

---

## 4. Removal of "Always True" policies

| # | Check | How to verify | Expected |
|---|---|---|---|
| 4.1 | Aggregate sweep — no `USING (true)` SELECT/ALL policies on sensitive tables | Suite check 4 | PASS, `violation_count = 0` |
| 4.2 | Per-table detail listing | Suite section 4 detailed query | No `VIOLATION` rows |

**Watched tables:** `donors`, `budgets`, `scholarships`, `scholarship_awards`, `meetings`, `meeting_participants`, `committee_attachments`, `smtp_config`, `salary_records`, `admission_test_attempts`, `staff`, `students`, `payments`, `user_roles`, `app_settings`, `vapid_keys`, `rate_limit_config`.

To extend the watch list, add a row to the `watched(tbl) AS (VALUES …)` CTE in `rls_security_checks.sql` section 4.

---

## 5. Anon surface area

| # | Check | How to verify | Expected |
|---|---|---|---|
| 5.1 | `anon` has no policies on `admission_test_attempts`, `salary_records`, `donors`, `smtp_config`, `staff` (read), `payments`, `user_roles`, `vapid_keys` | Suite check 5a | PASS |
| 5.2 | `anon` INSERT on `staff` is restricted to `status = 'pending'` (recruitment form) | Inspect `staff` INSERT policy | `WITH CHECK (status = 'pending')` |
| 5.3 | `anon` INSERT on `complaints` allowed (intentional public form), but SELECT denied | Inspect `complaints` policies | INSERT-only for anon |
| 5.4 | Public lookup tables use views, not base tables: `students_public`, `staff_directory`, `administrative_officers_public`, `committee_staff_ids`, `admission_test_attempts_public` | Confirm each view exists with `security_invoker=on` | All present |

---

## 6. Global RLS hygiene

| # | Check | How to verify | Expected |
|---|---|---|---|
| 6.1 | RLS enabled on every `public.*` table | Suite check 6 | PASS |
| 6.2 | Supabase linter shows no critical findings | `supabase--linter` tool | 0 errors |
| 6.3 | Security scanner shows no `EXPOSED_SENSITIVE_DATA` errors | `security--get_scan_results` | 0 errors |
| 6.4 | `supabase_realtime` publication contains only: `notifications`, `messages`, `live_classes`, `live_class_participants`, `live_class_messages` | `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'` | Exact list |

---

## 7. Currently known violations (must fix before next release)

> The automated suite will fail on these until each is remediated.
> Last suite run: 2026-05-01 — 10 `USING (true)` violations found.

- [ ] **`donors`** — drop `Anyone can view donors USING (true)`; replace with admin/staff-gated SELECT.
- [ ] **`smtp_config`** — drop `Authenticated users can read smtp_config USING (true)`; restrict SELECT to `admin`/`super_admin`.
- [ ] **`payments`** — drop `Anyone can view payments USING (true)` (financial PII leak); restrict to admin/`/admin/payments` permission and the paying user.
- [ ] **`staff`** — drop `Anyone can view staff USING (true)`; replace with role/permission-gated read. Keep the existing INSERT-only policy for `anon` (recruitment form, status='pending').
- [ ] **`app_settings`** — drop `app_settings public read USING (true)` if it exposes secrets; if only non-sensitive settings (timezone, branding) are needed publicly, move them to a dedicated `app_settings_public` view.
- [ ] **`budgets`** — drop `Authenticated users can view budgets USING (true)`; the `Permission-gated budgets manage` policy already covers SELECT via the `view` permission.
- [ ] **`scholarships`** — drop `Authenticated users can view scholarships USING (true)`.
- [ ] **`scholarship_awards`** — drop `Authenticated users can view scholarship awards USING (true)`.
- [ ] **`meetings`** — drop `Authenticated users can view meetings USING (true)`; add gated SELECT (admin/super_admin/menu permission/participant).
- [ ] **`meeting_participants`** — drop `Authenticated users can view meeting participants USING (true)`; restrict to admins or self (`user_id = auth.uid()`).
- [ ] **`committee_attachments`** — replace `committee_attachments_select_all USING (deleted_at IS NULL)` with role/permission-gated read.
- [ ] **`students`** — review `Public can view minimal student info` for `anon`. RLS allows anon to SELECT all rows that pass `(status='active' AND deleted_at IS NULL)`; combined with the column-level `GRANT SELECT (...)` to `anon` this is intended to expose only safe columns. **Verify** that `REVOKE SELECT ON public.students FROM anon` was applied first; otherwise PostgREST `anon` queries return ALL columns. Prefer pointing public reads at the `students_public` view and removing the anon policy entirely.
- [ ] **`salary-pdf` edge function** — add `has_role('admin')` / `has_role('super_admin')` / `has_menu_permission('/admin/salary','view')` check after JWT decode.
- [ ] **`Contact.tsx`** — sanitize `settings.contact_map_embed` with DOMPurify or replace with allowlisted iframe.

When each is fixed, tick the box and re-run the suite.
