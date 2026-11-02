# Edumate-BD UI/UX Design System & Anti-Slop Guidelines
> Inspired by: **Awesome DESIGN.md**, **Impeccable (59 Anti-Slop Rules)**, **Taste Skill**, and **Vercel Web Interface Guidelines**.

This document outlines the strict visual, interaction, and accessibility rules for the `edumate-bd` project (React + Tailwind CSS). All AI agents and developers modifying frontend code must follow these rules.

---

## 1. Anti-Slop Rules (Impeccable & Taste Skill)
* **No Generic Cluttered Layouts:** Avoid wall-of-text cards and bloated box shadows. Use generous whitespace (`p-6` to `p-8`, `gap-6` to `gap-8`).
* **Micro-interactions:** Every interactive element (buttons, cards, links, tabs) must feature smooth transitions:
  `transition-all duration-200 ease-in-out`
  Hover states should be subtle (e.g. `hover:bg-primary/90`, `hover:border-primary/40`, `hover:-translate-y-0.5`).
* **Borders over Heavy Drop-Shadows:** Prefer hairline borders (`border border-border/60` or `border-neutral-200/80` / `dark:border-neutral-800/80`) paired with subtle elevation (`shadow-xs` or `shadow-sm`) over dated heavy shadows.
* **Rounded Corners:** Keep rounded corners consistent across elements (`rounded-xl` for cards/dialogs, `rounded-lg` for inputs/buttons, `rounded-full` for badges/avatars).

---

## 2. Typography & Visual Hierarchy
* **Hierarchy:** Clear distinction between titles, subtitles, and body text:
  * Page Title: `text-3xl md:text-4xl font-bold tracking-tight text-foreground`
  * Section Header: `text-xl md:text-2xl font-semibold tracking-tight text-foreground`
  * Subtitle / Description: `text-sm md:text-base text-muted-foreground leading-relaxed`
  * Small captions/badges: `text-xs font-medium tracking-wide uppercase`
* **Legibility:** Maintain balanced line heights (`leading-relaxed` for paragraphs) and avoid long unbroken text blocks (max width `max-w-prose` or `max-w-3xl`).

---

## 3. Color Harmony & Accessibility (Vercel Guidelines)
* **Contrast Compliance:** All text colors must pass WCAG AA (minimum 4.5:1 for body, 3:1 for large headers).
* **Color Usage:**
  * Use semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `text-muted-foreground`, `border-border`).
  * Accent colors (primary brand color) should be used intentionally for CTAs, active states, and key highlights—never over-saturate backgrounds.
* **Dark Mode Support:** Ensure all modified components look intentional and seamless in both light and dark modes. Avoid pure `#000000` backgrounds in dark mode unless AMOLED mode is explicitly intended; prefer rich zinc/slate dark hues.

---

## 4. Mobile & Touch Responsiveness
* Touch targets for buttons and interactive controls must be at least `44px` by `44px` (`h-10` to `h-11` with `px-4`).
* Always test and adapt grids: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
* Overflow containers must have smooth scrolling (`overflow-x-auto` with clean scrollbar or touch scroll).

---

## 5. Forms & Inputs Polish
* Inputs must have clear focus rings: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
* Validation errors must be accessible: displayed below the input with red/destructive text, descriptive copy, and proper aria-live / helper labels.
* Action buttons inside forms must show loading spinners/disabled states during submission to prevent double-clicks.
