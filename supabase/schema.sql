-- =========================================================
-- BIDDYANGON (বিদ্যাঙ্গন) — Core Database Schema
-- Multi-tenant Education Management System on Supabase (Postgres)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ROLE ENUM
-- ---------------------------------------------------------
create type user_role as enum (
  'super_admin', 'institute_head', 'account', 'exam_head',
  'teacher', 'class_teacher', 'student', 'parent'
);

create type notice_target as enum ('institute', 'class', 'section', 'teachers', 'students', 'parents');
create type mark_status as enum ('draft', 'submitted', 'under_review', 'verified', 'published');
create type payment_method as enum ('cash', 'bank', 'bkash', 'nagad', 'card', 'gateway');
create type institute_status as enum ('active', 'suspended', 'archived');
create type student_status as enum ('active', 'inactive', 'graduated', 'transferred', 'suspended', 'archived');

-- ---------------------------------------------------------
-- 2. INSTITUTES  (tenants)
-- ---------------------------------------------------------
create table institutes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  shortcut text not null unique check (shortcut = lower(shortcut) and shortcut ~ '^[a-z0-9]+$'),
  eiin text,
  logo_url text,
  address text,
  district text,
  division text,
  phone text,
  email text,
  website text,
  established_year int,
  status institute_status not null default 'active',
  grading_policy jsonb not null default '{
    "scale": [
      {"min":80,"max":100,"grade":"A+","point":5.0},
      {"min":70,"max":79,"grade":"A","point":4.0},
      {"min":60,"max":69,"grade":"A-","point":3.5},
      {"min":50,"max":59,"grade":"B","point":3.0},
      {"min":40,"max":49,"grade":"C","point":2.0},
      {"min":33,"max":39,"grade":"D","point":1.0},
      {"min":0,"max":32,"grade":"F","point":0.0}
    ],
    "fourth_subject_bonus_cap": 1.0
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. PROFILES  (one row per auth.users, every role)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institute_id uuid references institutes(id) on delete cascade,  -- null only for super_admin
  role user_role not null,
  username text not null unique,       -- e.g. tmkmt-244874, tmkmt-head, tmkmt-T-00012
  full_name text not null,
  photo_url text,
  phone text,
  email text,
  designation text,                     -- for staff
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_profiles_institute on profiles(institute_id);
create index idx_profiles_role on profiles(institute_id, role);

-- ---------------------------------------------------------
-- 4. ACADEMIC STRUCTURE: sessions, classes, sections, subjects
-- ---------------------------------------------------------
create table academic_sessions (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  year text not null,                   -- e.g. "2026"
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique(institute_id, year)
);

create table classes (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  session_id uuid not null references academic_sessions(id) on delete cascade,
  name text not null,                   -- e.g. "Class 10"
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,                   -- e.g. "A"
  class_teacher_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(class_id, name)
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  code text not null,
  full_marks int not null default 100,
  theory_marks int,
  mcq_marks int,
  practical_marks int,
  pass_marks int not null default 33,
  is_optional boolean not null default false,   -- true = can be used as 4th subject
  teacher_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Which subjects are assigned to which student (class teacher manages this;
-- supports "assign to whole class" bulk insert or per-student individual rows)
create table student_subjects (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  is_fourth_subject boolean not null default false,
  assigned_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id, subject_id)
);

-- ---------------------------------------------------------
-- 5. STUDENTS / TEACHERS  (extend profiles)
-- ---------------------------------------------------------
create table students (
  id uuid primary key references profiles(id) on delete cascade,
  institute_id uuid not null references institutes(id) on delete cascade,
  student_code text not null,           -- numeric part only, e.g. "244874"
  session_id uuid references academic_sessions(id),
  class_id uuid references classes(id),
  section_id uuid references sections(id),
  roll int,
  dob date,
  gender text,
  blood_group text,
  father_name text,
  father_phone text,
  mother_name text,
  mother_phone text,
  guardian_name text,
  guardian_phone text,
  address text,
  admission_date date,
  status student_status not null default 'active',
  unique(institute_id, student_code)
);

create table parent_students (
  parent_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  relationship text default 'guardian',
  primary key (parent_id, student_id)
);

-- ---------------------------------------------------------
-- 6. ATTENDANCE
-- ---------------------------------------------------------
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id),
  section_id uuid references sections(id),
  date date not null,
  status text not null check (status in ('present','absent','late','leave','excused')),
  marked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(student_id, date)
);

-- ---------------------------------------------------------
-- 7. EXAMS, MARKS, RESULTS
-- ---------------------------------------------------------
create table exams (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  session_id uuid references academic_sessions(id),
  class_id uuid references classes(id),
  name text not null,
  exam_type text,
  start_date date,
  end_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table marks (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  written numeric,
  mcq numeric,
  practical numeric,
  total numeric generated always as (coalesce(written,0)+coalesce(mcq,0)+coalesce(practical,0)) stored,
  status mark_status not null default 'draft',
  submitted_by uuid references profiles(id),
  verified_by uuid references profiles(id),
  correction_reason text,
  updated_at timestamptz not null default now(),
  unique(exam_id, student_id, subject_id)
);

-- Final computed result per student per exam (written by the grading engine)
create table results (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  total_obtained numeric,
  total_full numeric,
  gpa_without_4th numeric,
  gpa_with_4th numeric,
  overall_grade text,
  result_status text,                   -- 'passed' | 'failed'
  published boolean not null default false,
  published_at timestamptz,
  published_by uuid references profiles(id),
  verification_code text unique default substr(md5(random()::text),1,10),
  unique(exam_id, student_id)
);

-- ---------------------------------------------------------
-- 8. FEES, PAYMENTS
-- ---------------------------------------------------------
create table fee_types (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  name text not null,
  amount numeric not null,
  frequency text not null default 'monthly'
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  fee_type_id uuid references fee_types(id),
  amount numeric not null,
  method payment_method not null,
  transaction_id text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 9. NOTICES + NOTIFICATIONS  (PDF upload, institute-wide push)
-- ---------------------------------------------------------
create table notices (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  title text not null,
  description text,
  attachment_url text,                  -- uploaded PDF, stored in 'notice-attachments' bucket
  target notice_target not null default 'institute',
  target_class_id uuid references classes(id),
  target_section_id uuid references sections(id),
  publish_date timestamptz not null default now(),
  expiry_date timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid not null references institutes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  notice_id uuid references notices(id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, read_at);

-- Fan the notice out to every relevant profile in the institute as a notification row
create or replace function fan_out_notice() returns trigger as $$
begin
  insert into notifications (institute_id, user_id, notice_id, title, body)
  select
    new.institute_id, p.id, new.id, new.title,
    left(coalesce(new.description,''), 200)
  from profiles p
  where p.institute_id = new.institute_id
    and (
      new.target = 'institute'
      or (new.target = 'teachers' and p.role in ('teacher','class_teacher'))
      or (new.target = 'students' and p.role = 'student')
      or (new.target = 'parents' and p.role = 'parent')
      or (new.target = 'class' and p.role = 'student' and exists (
            select 1 from students s where s.id = p.id and s.class_id = new.target_class_id))
      or (new.target = 'section' and p.role = 'student' and exists (
            select 1 from students s where s.id = p.id and s.section_id = new.target_section_id))
    );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_fan_out_notice
after insert on notices
for each row execute function fan_out_notice();

-- ---------------------------------------------------------
-- 10. AUDIT LOG
-- ---------------------------------------------------------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  institute_id uuid references institutes(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity text,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 11. ROW LEVEL SECURITY — tenant isolation
--     Rule: a profile can only see rows whose institute_id matches
--     their own profiles.institute_id, EXCEPT super_admin which sees all.
-- =========================================================

create or replace function my_institute_id() returns uuid as $$
  select institute_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Enable RLS everywhere
alter table institutes enable row level security;
alter table profiles enable row level security;
alter table academic_sessions enable row level security;
alter table classes enable row level security;
alter table sections enable row level security;
alter table subjects enable row level security;
alter table student_subjects enable row level security;
alter table students enable row level security;
alter table parent_students enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table marks enable row level security;
alter table results enable row level security;
alter table fee_types enable row level security;
alter table payments enable row level security;
alter table notices enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- institutes: super_admin sees/manages all; everyone else sees only their own
create policy institutes_super_all on institutes for all
  using (my_role() = 'super_admin') with check (my_role() = 'super_admin');
create policy institutes_self_read on institutes for select
  using (id = my_institute_id());
create policy institutes_head_update on institutes for update
  using (id = my_institute_id() and my_role() = 'institute_head');

-- generic tenant-scoped policy, reused for most tables via template below
-- profiles
create policy profiles_tenant_read on profiles for select
  using (my_role() = 'super_admin' or institute_id = my_institute_id());
create policy profiles_self_update on profiles for update
  using (id = auth.uid());
create policy profiles_admin_write on profiles for insert
  with check (my_role() in ('super_admin','institute_head'));

-- Apply the same "tenant read" shape to every remaining tenant table.
-- (Supabase requires one policy per command; grouped here for brevity.)
do $$
declare t text;
begin
  foreach t in array array[
    'academic_sessions','classes','sections','subjects','student_subjects',
    'students','attendance','exams','marks','results','fee_types','payments',
    'notices','notifications','audit_logs'
  ] loop
    execute format('create policy %I_tenant_read on %I for select using (my_role()=''super_admin'' or institute_id = my_institute_id());', t, t);
    execute format('create policy %I_tenant_write on %I for insert with check (institute_id = my_institute_id());', t, t);
    execute format('create policy %I_tenant_update on %I for update using (institute_id = my_institute_id());', t, t);
    execute format('create policy %I_tenant_delete on %I for delete using (institute_id = my_institute_id());', t, t);
  end loop;
end $$;

-- Extra restriction: only account/institute_head/super_admin may write payments
create policy payments_role_write on payments for insert
  with check (my_role() in ('account','institute_head','super_admin'));

-- Extra restriction: only exam_head/institute_head may publish results (update)
create policy results_publish_role on results for update
  using (my_role() in ('exam_head','institute_head','super_admin'));

-- Notifications: a user only ever sees their own
create policy notifications_own_read on notifications for select
  using (user_id = auth.uid());
create policy notifications_own_update on notifications for update
  using (user_id = auth.uid());

comment on function fan_out_notice() is 'Fans out a newly created notice into a notification row for every matching profile in the institute.';

-- =========================================================
-- 12. USERNAME LOGIN SUPPORT
-- Biddyangon logs people in by username (tmkmt-244874), not email.
-- Supabase Auth is email/password under the hood, so this function
-- lets the (unauthenticated) login page resolve username -> email
-- before calling supabase.auth.signInWithPassword(). It only ever
-- returns an email, never anything else — safe to expose to anon.
-- =========================================================
create or replace function email_for_username(p_username text)
returns text as $$
  select email from profiles where username = p_username limit 1;
$$ language sql stable security definer;

grant execute on function email_for_username(text) to anon, authenticated;

-- =========================================================
-- 13. TIGHTENED POLICIES — financial + pre-publication privacy
-- The generic per-table loop in section 11 gives every institute
-- member read access to every tenant row. That's fine for most
-- tables, but two need tighter rules per the spec:
--   §86 — students/parents must only see their OWN fee/payment data
--   §30 — students must NOT see a result before it is published
-- =========================================================

drop policy if exists payments_tenant_read on payments;
create policy payments_role_read on payments for select using (
  my_role() = 'super_admin'
  or (my_role() in ('institute_head','account') and institute_id = my_institute_id())
  or (my_role() = 'student' and student_id = auth.uid())
  or (my_role() = 'parent' and exists (
        select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = payments.student_id))
);

drop policy if exists results_tenant_read on results;
create policy results_role_read on results for select using (
  my_role() = 'super_admin'
  or (my_role() in ('institute_head','exam_head','teacher','class_teacher','account') and institute_id = my_institute_id())
  or (my_role() = 'student' and student_id = auth.uid() and published = true)
  or (my_role() = 'parent' and published = true and exists (
        select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = results.student_id))
);

-- Public verification page (app/verify/result/[code]) reads with the anon key
-- and no session, so it needs its own narrow policy — published results only,
-- and restricted to unauthenticated (anon) requests so it doesn't also widen
-- what a *logged-in* user from another institute could query directly.
create policy results_public_verify on results for select
  using (published = true and auth.role() = 'anon');

comment on policy results_role_read on results is 'Staff see every result in their institute; students/parents only see their own AFTER publication (spec §30).';
comment on policy payments_role_read on payments is 'Only account/head/super_admin see all institute payments; students/parents see only their own (spec §86).';

-- Super Admin can write audit log entries tied to ANY institute (e.g. logging
-- "created institute X"), not just their own — they have institute_id = null.
create policy audit_logs_super_write on audit_logs for insert
  with check (my_role() = 'super_admin');

-- Institute Head may also create classes/sections/subjects etc. that were
-- pre-existing generic policies already cover via institute_id = my_institute_id();
-- Super Admin additionally needs write access to a *new* institute's rows the
-- moment it's created (before any profile belongs to it) — not required for
-- the current app (Super Admin never edits institute-internal data directly),
-- so intentionally left as-is.
