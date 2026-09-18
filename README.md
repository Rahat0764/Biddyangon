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
