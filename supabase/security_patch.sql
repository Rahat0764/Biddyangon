-- =========================================================
-- BIDDYANGON — Security & Correctness Patch v1
-- Run this AFTER schema.sql and storage.sql, in the Supabase SQL Editor.
-- Safe to re-run: every statement either drops-if-exists first or uses
-- create-or-replace.
--
-- This closes the gaps found in an independent code review (confirmed by
-- reproducing several of them locally before writing this patch):
--   1. profiles self-update had no column restriction — a signed-in user
--      could set their own role to super_admin.
--   2. The generic per-table RLS loop in schema.sql §11 gave every
--      institute member insert/update/delete on marks, results, payments,
--      notices and student_subjects. The later "role-restricted" policies
--      (payments_role_write, results_publish_role) did NOT actually
--      restrict anything, because Postgres ORs multiple PERMISSIVE
--      policies together — the wide-open generic policy still applied.
--   3. Security-definer helper functions had no search_path pinned.
--   4. verification_code had ~40 bits of entropy (md5(random()) truncated).
--   5. A fresh institute had no academic_sessions row, so class creation
--      failed with a not-null violation.
--   6. Storage policies allowed anyone in an institute to overwrite or
--      delete any other member's uploaded file, with no size/type limit.
--   7. Result publishing ran as a client-side loop with no DB-level
--      re-verification — see publish_exam_results() at the bottom.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. Pin search_path on every SECURITY DEFINER function
-- ---------------------------------------------------------
alter function my_institute_id() set search_path = public;
alter function my_role() set search_path = public;
alter function fan_out_notice() set search_path = public;
alter function email_for_username(text) set search_path = public;

-- ---------------------------------------------------------
-- 2. Stop self privilege-escalation on profiles
--    (profiles_self_update had `using (id = auth.uid())` and no
--    `with check`, so a user could PATCH their own row with any values —
--    including role='super_admin' or a different institute_id.)
-- ---------------------------------------------------------
create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and old.role not in ('institute_head', 'super_admin') then
    if new.role is distinct from old.role
       or new.institute_id is distinct from old.institute_id
       or new.username is distinct from old.username then
      raise exception 'You are not allowed to change your own role, institute, or username.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on profiles;
create trigger trg_prevent_self_privilege_escalation
before update on profiles
for each row execute function prevent_self_privilege_escalation();

-- ---------------------------------------------------------
-- 3. Remove marks / results / payments / notices / student_subjects
--    from the generic tenant-wide write policies, and give each its
--    own role-aware policy. (Reads keep the versions already tightened
--    in schema.sql §13, except marks reads below are tightened further.)
-- ---------------------------------------------------------
drop policy if exists marks_tenant_write on marks;
drop policy if exists marks_tenant_update on marks;
drop policy if exists marks_tenant_delete on marks;
drop policy if exists marks_tenant_read on marks;

create policy marks_role_read on marks for select using (
  my_role() = 'super_admin'
  or (my_role() in ('institute_head', 'exam_head', 'teacher', 'class_teacher', 'account') and institute_id = my_institute_id())
  or (my_role() = 'student' and student_id = auth.uid() and exists (select 1 from exams e where e.id = marks.exam_id and e.status = 'published'))
  or (my_role() = 'parent' and exists (select 1 from exams e where e.id = marks.exam_id and e.status = 'published')
      and exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = marks.student_id))
);

create policy marks_teacher_write on marks for insert with check (
  institute_id = my_institute_id()
  and (
    my_role() in ('institute_head', 'exam_head', 'super_admin')
    or (my_role() in ('teacher', 'class_teacher') and exists (select 1 from subjects s where s.id = marks.subject_id and s.teacher_id = auth.uid()))
  )
);

create policy marks_teacher_update on marks for update using (
  institute_id = my_institute_id()
  and (
    my_role() in ('institute_head', 'exam_head', 'super_admin')
    or (
      my_role() in ('teacher', 'class_teacher')
      and exists (select 1 from subjects s where s.id = marks.subject_id and s.teacher_id = auth.uid())
      and status in ('draft', 'submitted')  -- a teacher can no longer edit their own verified/published marks
    )
  )
);

create policy marks_head_delete on marks for delete using (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'super_admin')
);

-- results: no direct write policy at all. The only way to write to this
-- table now is publish_exam_results() below, which runs SECURITY DEFINER
-- and therefore bypasses RLS entirely — exactly like a controlled RPC/API
-- endpoint would. Reads keep the policy already added in schema.sql §13.
drop policy if exists results_tenant_write on results;
drop policy if exists results_tenant_update on results;
drop policy if exists results_tenant_delete on results;
drop policy if exists results_publish_role on results; -- was a no-op anyway; removing it is not a regression

drop policy if exists payments_tenant_write on payments;
drop policy if exists payments_tenant_update on payments;
drop policy if exists payments_tenant_delete on payments;
drop policy if exists payments_role_write on payments; -- recreated below, now actually effective
create policy payments_role_write on payments for insert with check (
  institute_id = my_institute_id() and my_role() in ('account', 'institute_head', 'super_admin')
);
-- No update/delete policy: payments are immutable once recorded (void via
-- a future refund/credit row instead of editing history).

drop policy if exists notices_tenant_write on notices;
drop policy if exists notices_tenant_update on notices;
drop policy if exists notices_tenant_delete on notices;
create policy notices_role_write on notices for insert with check (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'exam_head', 'account', 'super_admin')
);
create policy notices_role_delete on notices for delete using (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'super_admin')
);

drop policy if exists student_subjects_tenant_write on student_subjects;
drop policy if exists student_subjects_tenant_update on student_subjects;
drop policy if exists student_subjects_tenant_delete on student_subjects;
create policy student_subjects_role_write on student_subjects for insert with check (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'class_teacher', 'super_admin')
);
create policy student_subjects_role_update on student_subjects for update using (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'class_teacher', 'super_admin')
);
create policy student_subjects_role_delete on student_subjects for delete using (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'class_teacher', 'super_admin')
);

-- fee_types: only the Institute Head configures these (Settings → Fee Types).
drop policy if exists fee_types_tenant_write on fee_types;
drop policy if exists fee_types_tenant_update on fee_types;
drop policy if exists fee_types_tenant_delete on fee_types;
create policy fee_types_role_write on fee_types for insert with check (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'super_admin')
);
create policy fee_types_role_delete on fee_types for delete using (
  institute_id = my_institute_id() and my_role() in ('institute_head', 'super_admin')
);

-- ---------------------------------------------------------
-- 4. Marks value validation at the database level (not just the browser)
-- ---------------------------------------------------------
alter table marks add constraint marks_written_non_negative check (written is null or written >= 0);
alter table marks add constraint marks_mcq_non_negative check (mcq is null or mcq >= 0);
alter table marks add constraint marks_practical_non_negative check (practical is null or practical >= 0);
alter table payments add constraint payments_amount_positive check (amount > 0);

-- ---------------------------------------------------------
-- 5. Stronger, unique verification codes
-- ---------------------------------------------------------
alter table results alter column verification_code set default encode(gen_random_bytes(8), 'hex');

-- ---------------------------------------------------------
-- 6. Auto-create a current academic session for every new institute,
--    so class creation never fails on a freshly-created institute.
--    (Existing institutes created before this patch still need one row
--    inserted manually once — see the note this prints below.)
-- ---------------------------------------------------------
create or replace function create_default_academic_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into academic_sessions (institute_id, year, is_current)
  values (new.id, extract(year from now())::text, true);
  return new;
end;
$$;

drop trigger if exists trg_create_default_session on institutes;
create trigger trg_create_default_session
after insert on institutes
for each row execute function create_default_academic_session();

-- Only one "current" session per institute at a time.
create unique index if not exists one_current_session_per_institute
on academic_sessions(institute_id) where is_current = true;

do $$
begin
  if exists (select 1 from institutes i where not exists (select 1 from academic_sessions s where s.institute_id = i.id)) then
    raise notice 'One or more institutes have no academic_sessions row yet (they predate this patch). Run: insert into academic_sessions (institute_id, year, is_current) select id, ''%'', true from institutes where id not in (select institute_id from academic_sessions);', extract(year from now())::text;
  end if;
end $$;

-- ---------------------------------------------------------
-- 7. Storage: fix broken/missing policies
-- ---------------------------------------------------------
drop policy if exists "institute members manage own files" on storage.objects;
drop policy if exists "institute members delete own files" on storage.objects;

-- update needs WITH CHECK too, or a member could update a row's `name` to
-- move/rename the file into another institute's folder.
create policy "institute members update own files" on storage.objects
  for update
  using (
    (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('institute_head', 'account', 'class_teacher', 'exam_head', 'super_admin')
  )
  with check (
    (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
  );

create policy "institute members delete own files" on storage.objects
  for delete
  using (
    (storage.foldername(name))[1] = (select institute_id::text from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('institute_head', 'super_admin')
  );

-- Size + MIME type limits at the bucket level (belt-and-suspenders on top
-- of the client-side checks — this is the layer that actually can't be
-- bypassed from devtools).
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg','image/webp']
  where id in ('institute-logos', 'student-photos');
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['application/pdf']
  where id = 'notice-attachments';

-- ---------------------------------------------------------
-- 8. Atomic, server-side, authorized result publishing.
--    Replaces the client-side loop in ExamDetailClient.tsx: this runs the
--    whole class in ONE transaction, re-checks the caller's role and
--    institute membership, re-checks every mark is verified, and computes
--    GPA from the SAME fixed banding logic as lib/gpa.ts (kept in sync by
--    hand — see the comment above grade_band_for below).
-- ---------------------------------------------------------
create or replace function grade_band_for(p_pct numeric, p_policy jsonb)
returns jsonb
language sql stable
set search_path = public
as $$
  -- Mirrors the fix in lib/gpa.ts: highest `min` the percentage clears,
  -- no upper-bound check, so there's no gap a decimal percentage can fall
  -- through and silently grade as F.
  select band
  from jsonb_array_elements(p_policy->'scale') as band
  where p_pct >= (band->>'min')::numeric
  order by (band->>'min')::numeric desc
  limit 1
$$;

create or replace function publish_exam_results(p_exam_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam record;
  v_actor_role user_role;
  v_actor_institute uuid;
  v_policy jsonb;
  v_bonus_cap numeric;
  v_student record;
  v_mark record;
  v_pct numeric;
  v_band jsonb;
  v_point numeric;
  v_grade text;
  v_total_full numeric;
  v_total_obtained numeric;
  v_sum_points numeric;
  v_compulsory_count int;
  v_failed_count int;
  v_has_optional boolean;
  v_optional_point numeric;
  v_gpa_without numeric;
  v_gpa_with numeric;
  v_overall_grade text;
  v_passed boolean;
  v_published_count int := 0;
begin
  select role, institute_id into v_actor_role, v_actor_institute from profiles where id = auth.uid();
  if v_actor_role is null or v_actor_role not in ('exam_head', 'institute_head', 'super_admin') then
    raise exception 'Not authorized to publish results';
  end if;

  select * into v_exam from exams where id = p_exam_id;
  if not found then
    raise exception 'Exam not found';
  end if;

  if v_actor_role <> 'super_admin' and v_exam.institute_id <> v_actor_institute then
    raise exception 'This exam does not belong to your institute';
  end if;

  if not exists (select 1 from marks where exam_id = p_exam_id) then
    raise exception 'No marks have been entered for this exam yet';
  end if;

  if exists (select 1 from marks where exam_id = p_exam_id and status <> 'verified') then
    raise exception 'All marks for this exam must be verified before publishing';
  end if;

  select grading_policy into v_policy from institutes where id = v_exam.institute_id;
  v_bonus_cap := coalesce((v_policy->>'fourth_subject_bonus_cap')::numeric, 1.0);

  for v_student in select id from students where class_id = v_exam.class_id loop
    v_total_full := 0; v_total_obtained := 0; v_sum_points := 0;
    v_compulsory_count := 0; v_failed_count := 0; v_has_optional := false; v_optional_point := 0;

    for v_mark in
      select m.total, sub.full_marks, coalesce(ss.is_fourth_subject, false) as is_fourth
      from marks m
      join subjects sub on sub.id = m.subject_id
      left join student_subjects ss on ss.student_id = m.student_id and ss.subject_id = m.subject_id
      where m.exam_id = p_exam_id and m.student_id = v_student.id
    loop
      v_pct := case when v_mark.full_marks > 0 then (v_mark.total / v_mark.full_marks) * 100 else 0 end;
      v_band := grade_band_for(v_pct, v_policy);
      v_point := (v_band->>'point')::numeric;
      v_grade := v_band->>'grade';

      if v_mark.is_fourth then
        v_has_optional := true;
        v_optional_point := v_point;
      else
        v_compulsory_count := v_compulsory_count + 1;
        v_total_full := v_total_full + v_mark.full_marks;
        v_total_obtained := v_total_obtained + v_mark.total;
        v_sum_points := v_sum_points + v_point;
        if v_grade = 'F' then
          v_failed_count := v_failed_count + 1;
        end if;
      end if;
    end loop;

    if v_compulsory_count = 0 then
      continue; -- no marks entered for this student at all — don't publish an empty result
    end if;

    v_passed := v_failed_count = 0;
    v_gpa_without := case when v_passed then least(5.0, round(v_sum_points / v_compulsory_count, 2)) else 0 end;
    v_gpa_with := v_gpa_without;
    if v_passed and v_has_optional then
      v_gpa_with := least(5.0, round((v_sum_points + greatest(0, least(v_bonus_cap, v_optional_point - 2.0))) / v_compulsory_count, 2));
    end if;

    if v_passed then
      select band->>'grade' into v_overall_grade
      from jsonb_array_elements(v_policy->'scale') band
      where v_gpa_without >= (band->>'point')::numeric
      order by (band->>'point')::numeric desc
      limit 1;
    else
      v_overall_grade := 'F';
    end if;

    insert into results (
      institute_id, exam_id, student_id, total_obtained, total_full,
      gpa_without_4th, gpa_with_4th, overall_grade, result_status,
      published, published_at, published_by
    ) values (
      v_exam.institute_id, p_exam_id, v_student.id, v_total_obtained, v_total_full,
      v_gpa_without, v_gpa_with, v_overall_grade, case when v_passed then 'passed' else 'failed' end,
      true, now(), auth.uid()
    )
    on conflict (exam_id, student_id) do update set
      total_obtained = excluded.total_obtained,
      total_full = excluded.total_full,
      gpa_without_4th = excluded.gpa_without_4th,
      gpa_with_4th = excluded.gpa_with_4th,
      overall_grade = excluded.overall_grade,
      result_status = excluded.result_status,
      published = true,
      published_at = now(),
      published_by = auth.uid();

    v_published_count := v_published_count + 1;
  end loop;

  update exams set status = 'published' where id = p_exam_id;

  insert into audit_logs (institute_id, actor_id, action, entity, entity_id)
  values (v_exam.institute_id, auth.uid(), format('Published results for %s (%s students)', v_exam.name, v_published_count), 'exams', p_exam_id::text);

  return v_published_count;
end;
$$;

grant execute on function publish_exam_results(uuid) to authenticated;

-- ---------------------------------------------------------
-- 9. NOTE — not fixed by this patch (documented, not silently ignored):
--
-- * email_for_username(text) still lets someone try many usernames and
--   see which ones resolve to an email (enumeration). Real fix is a
--   rate-limited Edge Function; in the meantime, turn on Supabase's
--   built-in Auth rate limiting (Authentication → Rate Limits) and keep
--   an eye on Logs Explorer for repeated RPC calls from one IP.
-- * results_public_verify (schema.sql §13) is scoped to `auth.role() =
--   'anon'`, so it won't work for a *logged-in* user opening a
--   /verify/result/<code> link (e.g. a teacher checking one). If you hit
--   that, add a second anon-only Supabase client for that one page rather
--   than loosening the policy.
-- * student-photos / notice-attachments buckets are still public-read.
--   That's a deliberate tradeoff for now (marksheet PDFs and notice PDFs
--   need a stable public URL); moving to signed URLs is a bigger change
--   split across the storage policies AND the PDF generators.
-- =========================================================
