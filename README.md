# বিদ্যাঙ্গন — Biddyangon

Multi-institute Education Management System. Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage) + Tailwind CSS.

This is a real, working codebase — not a mockup. Wire it to your own Supabase project and it runs.

## What's implemented

- Multi-tenant schema with row-level security (`supabase/schema.sql`) — every table is scoped to `institute_id`, enforced at the database level, not just in the UI
- Username-based login (`tmkmt-244874`, not email) via a `email_for_username` RPC
- Storage buckets for institute logos, student/staff photos, and notice PDF attachments, with tenant-scoped upload policies (`supabase/storage.sql`)
- Notice → notification fan-out: publishing a notice (with optional PDF) automatically creates a notification for every matching user in the institute, via a Postgres trigger
- Class → unlimited sections per class → class teacher assignment (`app/dashboard/classes`)
- Subject assignment: bulk "give to the whole class" or per-student individual, with a 4th/optional subject flag (`app/dashboard/classes/[classId]/subjects`)
- Central grading engine (`lib/gpa.ts`) — the **only** place grade/GPA math happens. Computes GPA both with and without the 4th subject, using the institute's own configurable grading scale.
- Marksheet: institute name + logo (top-left) + student photo (top-right), full subject table, dual GPA — on-screen (`components/Marksheet.tsx`) and as a downloadable PDF with **no Biddyangon branding on the document itself** (`lib/pdf/marksheet.ts`)
- Public result verification page (`app/verify/result/[code]`) — shows only safe, minimal info
- Institute logo upload, profile photo upload (student/teacher/every department head)
- Home-screen hero: fading photo + overlapping info card (`components/PersonHero.tsx`), used for every role

## Role coverage

Every role now has a real, working home screen and its own core workflow — not just a sidebar link to nowhere:

| Role | What's built |
|---|---|
| Super Admin | Institutes list + create (`/dashboard/institutes`), platform-wide audit log (`/dashboard/audit`) |
| Institute Head | Classes/sections/class-teacher assignment, subject assignment, institute logo, notices |
| Account | Look up a student by ID, record a payment, auto-download the receipt PDF (`/dashboard/payments`) |
| Exam Head | Create exams, verify marks per subject, publish results — publishing runs the central GPA engine for every student in the class (`/dashboard/exams`) |
| Teacher / Class Teacher | Pick an assigned subject + exam, enter written/MCQ marks, save draft or submit (`/dashboard/marks`) |
| Student | Home dashboard, marksheet + PDF, attendance calendar, fees ledger + receipts |
| Parent | Linked child's result and notices |

## What's intentionally left as a next step

This is a strong foundation, not the finished platform — see spec §122: don't fake buttons, mark unfinished things as planned. Not yet built:
- Institute Head's own Students/Teachers management pages (bulk create, per-student edit) — schema and RLS are ready, only the UI is missing
- Bulk student import (CSV)
- Admit card fee-eligibility lock
- Marks correction-request workflow (spec §29: teacher requests → exam head approves → marks reopen)
- SMS integration (needs a provider — e.g. a Bangladeshi bulk SMS API — wired via a Supabase Edge Function)
- Role-restricting the *write* side of `marks`/`results` at the RLS layer (currently any institute member can write; read access is already correctly restricted per role — see §13 in `schema.sql`). Fine for a pilot with trusted staff accounts; tighten before wider rollout.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's ready, open **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
3. Then paste `supabase/storage.sql` → Run.
4. Go to **Project Settings → API** and copy your `Project URL` and `anon public` key.

### Create your first institute + super admin (SQL Editor)

```sql
insert into institutes (name, shortcut) values ('Tamirul Millat Kamil Madrasa Tongi', 'tmkmt');

-- Create the actual login user via Authentication → Users → Add User (email + password) first,
-- then link it to a profile with that user's UUID:
insert into profiles (id, institute_id, role, username, full_name, email)
values (
  '<paste the auth user UUID here>',
  (select id from institutes where shortcut = 'tmkmt'),
  'institute_head', 'tmkmt-head', 'Institute Head', 'head@tmkmt.example'
);
```

Repeat for teachers/students/etc. — a small admin screen to automate this (spec §82: bulk user creation) is a good next feature to build.

## 2. Configure environment variables

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from step 1.

## 3. Run locally

```
npm install
npm run dev
```

Visit `http://localhost:3000/login` and sign in with the username/password you created above.

## 4. Push to GitHub

```
git init
git add .
git commit -m "Initial Biddyangon scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/biddyangon.git
git push -u origin main
```

## 5. Deploy on Vercel

1. [vercel.com](https://vercel.com) → New Project → import your GitHub repo.
2. Add the same two environment variables from `.env.local` in the Vercel project settings.
3. Deploy. Every push to `main` redeploys automatically.

## Notes on the multi-tenant design

- `institute_id` is never trusted from the client — every RLS policy re-derives it server-side from `profiles.institute_id` for the logged-in user (see `my_institute_id()` in `schema.sql`).
- A `super_admin` profile has `institute_id = null` and bypasses tenant scoping (see the `my_role() = 'super_admin'` clauses).
- File paths in every storage bucket start with `{institute_id}/...`, and storage policies check that prefix matches the uploader's own institute — so one institute's files can never overwrite another's.

---

## Security & correctness patch (read this before going live)

An independent code review turned up real bugs — some of them confirmed by
actually reproducing them (not just theoretical). `supabase/security_patch.sql`
fixes the database-level ones; the matching application code was patched in
the same pass. Run the SQL patch once, whether your project is brand new or
already running:

```
schema.sql → storage.sql → security_patch.sql
```

### Confirmed and fixed

| # | Bug | Where | Fix |
|---|---|---|---|
| 1 | A signed-in user could PATCH their own `profiles` row and set `role: 'super_admin'` — `profiles_self_update` had no `WITH CHECK` | `schema.sql` | Trigger blocks changing your own `role`/`institute_id`/`username` unless you're already an admin |
| 2 | The "role-restricted" write policies (`payments_role_write`, `results_publish_role`) did nothing — Postgres ORs multiple PERMISSIVE policies, so the generic per-table loop still let any institute member write to `marks`/`results`/`payments`/`notices`/`student_subjects` | `schema.sql` §11 | Those five tables pulled out of the generic loop; each gets its own role-aware policy |
| 3 | GPA silently graded as F: bands were `{80–100, 70–79, …}` with gaps between them, so a decimal percentage like 79.5% (159/200) matched no band and fell through to the last one, which is F. Reproduced and confirmed. | `lib/gpa.ts` | Bands now matched by "highest `min` you clear," sorted descending — no gaps |
| 4 | GPA could exceed 5.00 (all A+ subjects + a 4th-subject bonus computed to 5.10) | `lib/gpa.ts` | Both GPA figures capped at `Math.min(5, …)` |
| 5 | `overallGrade` almost never matched anything — it compared a GPA to exact band points via `Math.floor(gpa*2)/2`, which rarely lands on {5, 4, 3.5, 3, 2, 1, 0} exactly | `lib/gpa.ts` | Replaced with the (already-existing, actually-correct) `topGradeFor()` |
| 6 | `numberToWords(500.5)` produced `"Five Hundred undefined"` — a decimal remainder recursed into an array index that doesn't exist. Reproduced and confirmed. | `lib/pdf/receipt.ts` | Amount is rounded to whole taka before conversion |
| 7 | Result publishing ran as a client-side loop (multiple sequential requests per student, no transaction, no server-side re-check of "are all marks actually verified," GPA computed from data the browser controls) | `ExamDetailClient.tsx` | Replaced with one call to `publish_exam_results()`, a single Postgres function that does the whole class atomically, re-checks the caller's role/institute and that every mark is verified, and computes GPA server-side |
| 8 | Marks Entry showed **every** student in the class for **every** subject, including an optional/4th subject a student never took — saving created a phantom `0` mark for them, which then failed them for a subject they weren't enrolled in | `MarksEntryClient.tsx` | Now only loads students with an actual `student_subjects` row for that subject |
| 9 | Re-saving a subject's marks after the Exam Department verified it silently reset the status back to draft, undoing the verification | `MarksEntryClient.tsx` | Verified/published rows are now skipped on save |
| 10 | `written`/`mcq` split was hardcoded 70/30 regardless of the subject, and there was no `practical` input even though the schema (and Biology/ICT-type subjects) need one | `MarksEntryClient.tsx` | Uses the subject's own `theory_marks`/`mcq_marks`/`practical_marks`; a Practical column appears when a subject has one |
| 11 | Institute logo/photo PDFs broke for any non-JPEG image — the format was hardcoded `'JPEG'` even though the UI suggests PNG | `lib/pdf/marksheet.ts`, `receipt.ts` | Format is now detected from the actual data URL |
| 12 | Attendance dates computed via `toISOString().slice(0,10)`, which shifts a Bangladesh (UTC+6) local date back by one day for part of every 24 hours; the `‹ ›` month buttons had no click handler at all | `AttendanceCalendar.tsx`, `attendance/page.tsx` | Local-date formatting (`lib/date.ts`) instead of UTC conversion; buttons are real links driven by a `?month=` query param |
| 13 | The attendance pie chart rendered nothing when one status was 100% of the month (a 360° arc starts and ends at the same point) | `AttendanceCalendar.tsx` | End angle is capped just under 360° for a lone full-circle slice |
| 14 | `/dashboard/students` and `/dashboard/teachers` were linked in the sidebar with no page behind them (404) | Sidebar | Built as real (read-only for now) list pages |
| 15 | `/dashboard/attendance` existed but was never linked in the student sidebar | Sidebar | Added |
| 16 | Security-definer functions (`my_role`, `my_institute_id`, `fan_out_notice`, `email_for_username`) had no `search_path` pinned | `schema.sql` | Pinned to `public` in `security_patch.sql` |
| 17 | `verification_code` had ~40 bits of entropy (`md5(random())` truncated to 10 hex chars) | `schema.sql` | Widened to 64 bits via `gen_random_bytes(8)` |
| 18 | A freshly created institute had no `academic_sessions` row, so creating a class failed with a not-null violation | `schema.sql` | Trigger auto-creates a "current year" session when an institute is created |
| 19 | Storage `update` policy had no `WITH CHECK`, so a file could be renamed into another institute's folder; no file size/MIME limits at all | `storage.sql` | `WITH CHECK` added; 2 MB/PNG-JPEG-WebP limit on photos+logos, 5 MB/PDF on notices, enforced at the bucket level |
| 20 | The zip delivered to you in an earlier message contained a stray literal folder named `{supabase,app,components,lib` — a leftover from a bad shell brace-expansion when it was packaged | packaging only | Removed; this zip's contents were re-verified after packaging |

### Confirmed but *not* fixed in this pass (still open — tracked honestly, not swept under the rug)

- **Username enumeration**: `email_for_username` lets someone try usernames and see which resolve. Real fix is a rate-limited Edge Function. For now: turn on Supabase's built-in Auth rate limiting (Authentication → Rate Limits) and watch Logs Explorer.
- **Public verify page + logged-in users**: `/verify/result/[code]` only works when *nobody* is signed in in that browser (the RLS policy is scoped to `auth.role() = 'anon'`). A signed-in user opening the link sees "Not Found." Needs a separate anon-only Supabase client for that one page.
- **student-photos / notice-attachments stay public-read.** Deliberate tradeoff (marksheet/notice PDFs need a stable URL); moving to signed URLs touches both the storage policies and the PDF generators — bigger change than this pass.
- Students/Teachers pages are read-only lists — creating an account (Auth user + profile row) still goes through the Supabase dashboard, per the "next step" list below.
- Next.js is pinned at 14.2.13, which predates the fix for CVE-2025-29927 (a middleware-bypass bug). Every protected page also calls `getUser()` itself in `layout.tsx`, which limits the blast radius, but upgrading to ≥14.2.25 is still recommended before wider rollout.
- No pagination yet on notices/payments/audit log lists (`.limit(15)`/`.limit(100)`) — fine for a pilot, will matter at scale.

## What's intentionally left as a next step (unchanged from before, still accurate)

- Bulk student/teacher creation UI (CSV import) — accounts are still created via the Supabase dashboard
- Admit card fee-eligibility lock
- Marks correction-request workflow (teacher requests → exam head approves → marks reopen)
- SMS integration (needs a Bangladeshi bulk SMS provider, wired via a Supabase Edge Function)
- Notification bell UI (the `notifications` table and fan-out trigger work; there's no inbox screen yet)

---

## What's new in this pass (dynamic / practical / premium)

On top of the security & correctness patch above, this pass added real functionality in the three areas requested — more dynamic, more practical to actually run a school with, and more premium-feeling:

**Practical**
- **Bulk Student Import** (`/dashboard/students/import`) — upload a CSV, preview it, and create every account in one go. Uses a new server-side admin client (`lib/supabase/admin.ts`, `app/actions/users.ts`) that finally puts `SUPABASE_SERVICE_ROLE_KEY` to work — safely, server-only, behind a role check, never exposed to the browser.
- **Institute Head account creation from the UI** (Super Admin → Institutes → "+ Head Account") and **Teacher account creation from the UI** (Institute Head → Teachers → "+ Add Teacher") — the old workflow of hand-writing SQL to link an Auth user to a profile is gone for these two cases.
- **Forced password change on first login** — `must_change_password` existed in the schema but nothing enforced it; there's now a dedicated page and the dashboard shell redirects there until it's done.
- **Suspended institutes are actually locked out now** — Super Admin's "Suspend" button previously flipped a status flag that nothing checked; the dashboard layout now blocks access for everyone but Super Admin when an institute is suspended.
- **Fee Types and Grading Policy settings UI** (`/dashboard/settings/fees`, `/settings/grading`) — both used to require raw SQL.

**Dynamic**
- **Real notification bell** — the `notifications` table and fan-out trigger existed but had no UI; there's now a working dropdown with unread counts and mark-as-read (polling every 60s, not push-realtime — see "not fixed" list below).
- **Real global search** — the topbar search box was a non-functional placeholder; it now does a debounced search across students and teachers and links to the right page.
- **Page transitions and hover/focus polish** — see `app/globals.css`.

**Premium**
- **lucide-react icon set** replacing emoji icons in the sidebar, topbar, search and notification bell — the highest-visibility surfaces. Some emoji remain on buttons deeper in the app (⬇ download, 📣 publish, etc.) — not a full sweep, noted honestly rather than claimed as done.
- **Sidebar now uses real `<Link>` navigation** instead of `onClick` + `router.push` on a `<div>` (keyboard-accessible, proper semantics).
- **`error.tsx` / `loading.tsx`** added for the dashboard segment.

### Still not done (honestly listed, not swept under the rug)

- No realtime push — the notification bell polls, it doesn't subscribe to Supabase Realtime. Genuine live updates (e.g. a payment appearing on the Account dashboard the instant it's recorded elsewhere) aren't built.
- Marks correction-request workflow (teacher requests → exam head approves → marks reopen) — still not built; this needs its own small state machine and I didn't want to ship a half-correct version of something that touches published results.
- Command palette / Cmd+K, institute-level theming, mobile bottom-tab navigation, print-optimized CSS for the marksheet/receipt, dark mode — none of these are built.
- Icon replacement is partial (see above) — most inline action-button emoji weren't swept.
- A full onboarding *wizard* wasn't built — what exists is the Head-account-creation shortcut described above, which removes the worst manual-SQL step but doesn't walk someone through session/class/subject setup step by step.

See `DEPLOY_BN.md` for the full deployment walkthrough in Bengali (Supabase project creation, every API key and exactly where to find it, GitHub, Vercel, and the one remaining manual step — bootstrapping the very first Super Admin).
