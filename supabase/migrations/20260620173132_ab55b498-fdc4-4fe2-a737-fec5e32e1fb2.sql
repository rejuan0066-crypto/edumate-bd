-- Allow issuing a book by free-text name (not in the catalog)
ALTER TABLE public.library_issuances ALTER COLUMN book_id DROP NOT NULL;
ALTER TABLE public.library_issuances ADD COLUMN IF NOT EXISTS custom_book_title text;