'use server';
// All privileged account-creation work lives here, behind 'use server' —
// Next.js guarantees this file (and its import of lib/supabase/admin.ts,
// which holds the service-role key) never reaches the browser bundle.
// Every action re-checks the CALLER's identity with the normal
// cookie-based client before touching the admin client, so this can't be
// invoked by someone who isn't actually signed in as the role it claims.

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient, generateTempPassword } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

interface ActionResult { success: boolean; message: string; tempPassword?: string; username?: string; }

async function requireCaller(allowedRoles: string[]) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data: profile } = await supabase.from('profiles').select('role, institute_id').eq('id', user.id).single();
  if (!profile || !allowedRoles.includes(profile.role)) throw new Error('Not authorized for this action');
  return profile;
}

/** Super Admin creates an Institute Head — replaces the old "go run this SQL by hand" step. */
export async function createInstituteHead(instituteId: string, fullName: string, phone: string): Promise<ActionResult> {
  try {
    await requireCaller(['super_admin']);
    const admin = createAdminClient();

    const { data: institute } = await admin.from('institutes').select('shortcut').eq('id', instituteId).single();
    if (!institute) return { success: false, message: 'Institute not found.' };

    const username = `${institute.shortcut}-head`;
    const email = `${username}@${institute.shortcut}.biddyangon.local`;
    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true,
    });
    if (authError || !authUser.user) return { success: false, message: authError?.message ?? 'Could not create the login account.' };

    const { error: profileError } = await admin.from('profiles').insert({
      id: authUser.user.id, institute_id: instituteId, role: 'institute_head',
      username, full_name: fullName, email, phone, must_change_password: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id); // roll back the orphaned auth user
      return { success: false, message: profileError.message };
    }

    await admin.from('audit_logs').insert({
      institute_id: instituteId, action: `Created Institute Head account ${username}`, entity: 'profiles', entity_id: authUser.user.id,
    });

    revalidatePath('/dashboard/institutes');
    return { success: true, message: 'Institute Head account created.', username, tempPassword };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

/** Institute Head (or Super Admin) creates a single Teacher account. */
export async function createTeacher(fullName: string, designation: string, phone: string): Promise<ActionResult> {
  try {
    const caller = await requireCaller(['institute_head', 'super_admin']);
    if (!caller.institute_id) return { success: false, message: 'Super Admin has no institute context — use this from an Institute Head account.' };
    const admin = createAdminClient();

    const { data: institute } = await admin.from('institutes').select('shortcut').eq('id', caller.institute_id).single();
    if (!institute) return { success: false, message: 'Institute not found.' };

    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('institute_id', caller.institute_id).in('role', ['teacher', 'class_teacher']);
    const serial = String((count ?? 0) + 1).padStart(5, '0');
    const username = `${institute.shortcut}-T-${serial}`;
    const email = `${username}@${institute.shortcut}.biddyangon.local`;
    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
    if (authError || !authUser.user) return { success: false, message: authError?.message ?? 'Could not create the login account.' };

    const { error: profileError } = await admin.from('profiles').insert({
      id: authUser.user.id, institute_id: caller.institute_id, role: 'teacher',
      username, full_name: fullName, email, phone, designation, must_change_password: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, message: profileError.message };
    }

    await admin.from('audit_logs').insert({
      institute_id: caller.institute_id, action: `Created Teacher account ${username} (${fullName})`, entity: 'profiles', entity_id: authUser.user.id,
    });

    revalidatePath('/dashboard/teachers');
    return { success: true, message: 'Teacher account created.', username, tempPassword };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

export interface StudentCsvRow {
  studentId: string; name: string; dob: string; gender: string; className: string; section: string;
  roll: string; fatherName: string; fatherPhone: string; motherName: string; motherPhone: string; bloodGroup: string;
}
export interface BulkImportRowResult { studentId: string; success: boolean; message: string; username?: string; tempPassword?: string; }

/** Institute Head bulk-creates students from a parsed CSV. Runs server-side, one row at a time,
 *  each wrapped so one bad row doesn't stop the rest — the caller gets a full per-row report. */
export async function bulkCreateStudents(rows: StudentCsvRow[]): Promise<BulkImportRowResult[]> {
  const caller = await requireCaller(['institute_head', 'super_admin']);
  if (!caller.institute_id) return rows.map((r) => ({ studentId: r.studentId, success: false, message: 'No institute context.' }));

  const admin = createAdminClient();
  const { data: institute } = await admin.from('institutes').select('shortcut').eq('id', caller.institute_id).single();
  if (!institute) return rows.map((r) => ({ studentId: r.studentId, success: false, message: 'Institute not found.' }));

  const { data: session } = await admin.from('academic_sessions').select('id').eq('institute_id', caller.institute_id).eq('is_current', true).maybeSingle();

  const results: BulkImportRowResult[] = [];

  for (const row of rows) {
    try {
      if (!row.studentId?.trim() || !row.name?.trim()) {
        results.push({ studentId: row.studentId, success: false, message: 'Student ID and Name are required.' });
        continue;
      }

      const { data: dupe } = await admin.from('students').select('id').eq('institute_id', caller.institute_id).eq('student_code', row.studentId.trim()).maybeSingle();
      if (dupe) {
        results.push({ studentId: row.studentId, success: false, message: 'A student with this ID already exists.' });
        continue;
      }

      let classId: string | null = null, sectionId: string | null = null;
      if (row.className?.trim()) {
        const { data: cls } = await admin.from('classes').select('id').eq('institute_id', caller.institute_id).eq('name', row.className.trim()).maybeSingle();
        classId = cls?.id ?? null;
        if (classId && row.section?.trim()) {
          const { data: sec } = await admin.from('sections').select('id').eq('class_id', classId).eq('name', row.section.trim()).maybeSingle();
          sectionId = sec?.id ?? null;
        }
      }

      const username = `${institute.shortcut}-${row.studentId.trim()}`;
      const email = `${username}@${institute.shortcut}.biddyangon.local`;
      const tempPassword = generateTempPassword();

      const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
      if (authError || !authUser.user) {
        results.push({ studentId: row.studentId, success: false, message: authError?.message ?? 'Could not create login account.' });
        continue;
      }

      const { error: profileError } = await admin.from('profiles').insert({
        id: authUser.user.id, institute_id: caller.institute_id, role: 'student',
        username, full_name: row.name.trim(), email, must_change_password: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        results.push({ studentId: row.studentId, success: false, message: profileError.message });
        continue;
      }

      const { error: studentError } = await admin.from('students').insert({
        id: authUser.user.id, institute_id: caller.institute_id, student_code: row.studentId.trim(),
        session_id: session?.id ?? null, class_id: classId, section_id: sectionId,
        roll: row.roll ? Number(row.roll) : null, dob: row.dob || null, gender: row.gender || null,
        blood_group: row.bloodGroup || null, father_name: row.fatherName || null, father_phone: row.fatherPhone || null,
        mother_name: row.motherName || null, mother_phone: row.motherPhone || null,
        guardian_phone: row.fatherPhone || row.motherPhone || null, status: 'active',
      });
      if (studentError) {
        await admin.from('profiles').delete().eq('id', authUser.user.id);
        await admin.auth.admin.deleteUser(authUser.user.id);
        results.push({ studentId: row.studentId, success: false, message: studentError.message });
        continue;
      }

      results.push({ studentId: row.studentId, success: true, message: 'Created', username, tempPassword });
    } catch (e: any) {
      results.push({ studentId: row.studentId, success: false, message: e.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  await admin.from('audit_logs').insert({
    institute_id: caller.institute_id,
    action: `Bulk-imported ${successCount}/${rows.length} students`,
    entity: 'students',
  });

  revalidatePath('/dashboard/students');
  return results;
}
