# Plan - Enhanced User Creation & Password Security

Improve the user account creation process by ensuring email verification (when enabled) and enforcing strict, English-only password policies across the application.

## User Interface Changes

### 1. User Management Page
- Modify account creation form to reflect that email verification will be required if the global setting is active.
- Ensure consistent password validation feedback in both user creation and profile editing sections.

### 2. Global Password Input
- Update `sanitizePasswordInput` to strictly block all non-ASCII characters (including Bengali digits and letters) in password fields across the site.
- Enhance `PasswordStrengthMeter` and related hooks to enforce variation (lowercase, uppercase, numbers, symbols) and English-only inputs.

### 3. Settings Page
- Fix the placeholder text in the Email Service section that incorrectly shows internal command instructions.

## Technical Details

### 1. Backend (Edge Function: `manage-users`)
- Update the `create` action to honor the project's email verification requirement.
- Set `email_confirm: false` (requiring verification) instead of `true` (auto-confirm) when creating new accounts, allowing the backend to handle verification emails if configured.

### 2. Frontend Validation
- Update `src/lib/passwordInput.ts` to ensure strict ASCII-only filtering.
- Update `src/hooks/usePasswordPolicy.ts` to include a validation rule for "English characters only" to provide clear feedback when a user tries to type Bengali characters.
- Synchronize validation logic between `AdminUserManagement.tsx` and the `manage-users` edge function.

### 3. Security Hardening
- Ensure `enforcePasswordPolicy` in `supabase/functions/_shared/password.ts` matches the frontend's strict requirements.
- Maintain the existing audit trail for all password-related events.
