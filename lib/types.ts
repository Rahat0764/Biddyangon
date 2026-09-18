export type UserRole =
  | 'super_admin' | 'institute_head' | 'account' | 'exam_head'
  | 'teacher' | 'class_teacher' | 'student' | 'parent';

export interface Institute {
  id: string;
  name: string;
  shortcut: string;
  logo_url: string | null;
  address: string | null;
  status: 'active' | 'suspended' | 'archived';
  grading_policy: GradingPolicy;
}

export interface GradingPolicy {
  scale: { min: number; max: number; grade: string; point: number }[];
  fourth_subject_bonus_cap: number;
}

export interface Profile {
  id: string;
  institute_id: string | null;
  role: UserRole;
  username: string;
  full_name: string;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  designation: string | null;
}

export interface Student {
  id: string;
  institute_id: string;
  student_code: string;
  class_id: string | null;
  section_id: string | null;
  roll: number | null;
  dob: string | null;
  blood_group: string | null;
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  guardian_phone: string | null;
  status: string;
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string;
  full_marks: number;
  is_optional: boolean;
}

export interface MarkRow {
  subject: SubjectRow;
  written: number | null;
  mcq: number | null;
  practical: number | null;
  total: number;
  is_fourth_subject: boolean;
}
