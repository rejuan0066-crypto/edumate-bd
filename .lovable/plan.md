# Plan: Premium Result Sheet Print/PDF Layout Enhancement

Enhance the Result Sheet (Tabulation Sheet) export to match a professional A4 landscape layout with school branding, specific table styling, and multi-column signatures.

## User Review Required

> [!IMPORTANT]
> - The layout will be forced to **A4 Landscape** for all users to ensure consistency.
> - Mobile users will also see this fixed A4 layout in the print/PDF preview instead of a responsive stacked view.

## Proposed Changes

### 1. Page Layout & Orientation
- **Forced A4 Landscape**: Update `@page` CSS to `size: A4 landscape`.
- **Paper Container Styling**: Add a clean border and padding to the printable sheet to simulate a real paper document.
- **Scaling Logic**: Ensure columns (Name, Roll, Subjects) scale to fit exactly 100% of the A4 width.

### 2. Header & Branding
- **Logo Placement**: Position the institution logo on the top-left.
- **Centered Title**: "আল-আরাবিয়া ছোবহানিয়া হাফিজিয়া মাদ্রাসা" (Al-Arabia Sobhania Hafizia Madrasa) centered at the top.
- **Metadata**: Add school address/contact and center the exam term name.

### 3. Table Styling
- **Header Aesthetics**: Apply a **Dark Green** background with **White** text for the table header (`<thead>`).
- **Borders**: Implement crisp vertical and horizontal borders using `border-gray-400`.
- **Opaque Backgrounds**: Ensure student identifiers and marks have proper backgrounds (no transparency leaking through).

### 4. Footer Signatures
- **4-Column Section**: Add four distinct signature lines:
  1. শ্রেণি শিক্ষক (Class Teacher)
  2. পরীক্ষা নিয়ন্ত্রক (Exam Controller)
  3. শিক্ষা সচিব (Education Secretary)
  4. মুহতামিম / অধ্যক্ষ (Principal)
- **Signature Dividers**: Add horizontal line dividers above each title.

### 5. Mobile & Desktop Consistency
- **Print Hidden Elements**: Hide search panels, navigation, and sidebar buttons using `print:hidden`.
- **PWA/Mobile Adapter**: Ensure the PDF generator respects the landscape layout.

## Technical Details
- Modify `src/lib/resultExport.ts` to update the `getResultSheetHtml` function.
- Update CSS injected into the print frame to enforce orientation and table styles.
- Adjust `IndividualMarksheet.tsx` if necessary to maintain consistency across different report types.
