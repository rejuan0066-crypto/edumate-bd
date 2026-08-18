# Plan: Fix Exam Session Deletion Constraint Error

The user is encountering a foreign key constraint error when trying to delete an exam session: `update or delete on table "exam_sessions" violates foreign key constraint "question_papers_exam_session_id_fkey" on table "question_papers"`.

I will update the deletion logic to check for both linked results (already implemented) and linked question papers, informing the user about what will be deleted.

## User Review Required

> [!IMPORTANT]
> When deleting an exam session, should the linked question papers also be deleted automatically (like results), or should we prevent deletion if question papers exist?
>
> I will assume **automatic deletion with a warning** to match the existing behavior for results.

## Proposed Changes

### Database (PostgreSQL)
- Create a migration to update the foreign key on `question_papers(exam_session_id)` to `ON DELETE CASCADE`. This ensures that if the user confirms deletion, all dependent records are cleaned up correctly by the database.

### Admin UI
- **AdminExamSessions.tsx**:
    - Update `deleteMutation` to fetch the count of question papers linked to the session.
    - Update the confirmation dialog description to include the number of linked question papers that will be deleted.

## Technical Details

### SQL Migration
```sql
ALTER TABLE public.question_papers
DROP CONSTRAINT IF EXISTS question_papers_exam_session_id_fkey,
ADD CONSTRAINT question_papers_exam_session_id_fkey 
FOREIGN KEY (exam_session_id) 
REFERENCES public.exam_sessions(id) 
ON DELETE CASCADE;
```

### UI Logic (AdminExamSessions.tsx)
- Add a new query or update existing one to fetch `questionPaperCounts`.
- Update `deleteMutation`'s `isConfirmed` block to use both `resultCount` and `questionPaperCount` in the warning message.
