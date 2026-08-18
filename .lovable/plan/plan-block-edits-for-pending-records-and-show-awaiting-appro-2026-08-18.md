# Plan: Block Edits for Pending Records and Show "Awaiting Approval" Status

Non-admin edits or rejections will now be intercepted and locked until an admin approves them. Affected records will display an "Awaiting Admin Approval" badge, and action buttons will be disabled during this period.

## Proposed Changes

### 1. Core Logic Update
- **`src/hooks/useApprovalWorkflow.ts`**:
    - Add `isRecordPending(targetTable, targetId)` to check the `pending_actions` table for any records with `status = 'pending'`.
    - Expose `allPendingActions` for real-time UI updates.
- **`src/hooks/useApprovalCheck.ts`**:
    - Update `checkApproval` to also handle the `'reject'` action type.
    - Add a check to prevent submitting a new approval request if one is already pending for that record.

### 2. UI Modules Integration
Update these pages to check `isRecordPending(targetTable, record.id)` and visually lock actions:
- **`src/pages/admin/AdminStudents.tsx`**:
    - Show `Badge` "অ্যাডমিন অনুমোদনের অপেক্ষায়" for pending students.
    - Disable Edit, Delete, and Status change buttons if pending.
- **`src/pages/admin/AdminStaff.tsx`**:
    - Integrate badge and disable actions (Edit, Delete, Deactivate, Status).
- **`src/pages/admin/AdminSubjects.tsx`**:
    - Disable Edit and Delete buttons for pending subjects.
- **`src/pages/admin/AdminSalary.tsx`**:
    - Show badge for pending salary adjustments.
    - Block manual overrides if an edit is pending.

### 3. User Feedback
- Use `toast.warning` to inform users why an action is disabled (record is already locked).
- Ensure the badge is clearly visible in table rows.

## Technical Details
- The system uses the existing `pending_actions` table.
- A new `isRecordPending` helper in `useApprovalWorkflow` will query this table to find active locks.
- `refetchInterval: 5000` will be added to the pending actions query to ensure UI stays in sync with admin decisions.
- React Query will invalidate the `['all-pending-actions']` key when any approval action is submitted.
