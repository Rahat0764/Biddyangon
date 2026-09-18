// =========================================================
// Central grading engine (spec §116: "The GPA engine must be
// implemented as a dedicated service/module. There must be one
// central grading engine.")
//
// Every place that shows a grade or a GPA — teacher's marks entry,
// the exam department, the student dashboard, the marksheet, the
// PDF export, reports — must call THIS module. Never recompute
// grades inline in a component.
// =========================================================

import type { GradingPolicy, MarkRow } from './types';

export interface SubjectResult {
  subjectId: string;
  name: string;
  code: string;
  fullMarks: number;
  obtained: number;
  grade: string;
  point: number;
  isFourthSubject: boolean;
}

export interface ComputedResult {
  subjects: SubjectResult[];
  totalObtained: number;   // compulsory subjects only
  totalFull: number;       // compulsory subjects only
  gpaWithout4th: number;
  gpaWith4th: number;
  overallGrade: string;
  passed: boolean;
  failedSubjects: string[];
}

/** Look up grade + grade point for a percentage-scaled mark against the institute's policy. */
export function gradeFor(obtained: number, fullMarks: number, policy: GradingPolicy) {
  const pct = fullMarks > 0 ? (obtained / fullMarks) * 100 : 0;
  const band = policy.scale.find((b) => pct >= b.min && pct <= b.max) ?? policy.scale[policy.scale.length - 1];
  return { grade: band.grade, point: band.point, pct };
}

/**
 * Compute a student's full result for one exam from their raw marks.
 * `marks` should include every subject assigned to the student, including
 * at most one subject flagged is_fourth_subject (the optional/4th subject).
 */
export function computeResult(marks: MarkRow[], policy: GradingPolicy): ComputedResult {
  const subjects: SubjectResult[] = marks.map((m) => {
    const { grade, point } = gradeFor(m.total, m.subject.full_marks, policy);
    return {
      subjectId: m.subject.id,
      name: m.subject.name,
      code: m.subject.code,
      fullMarks: m.subject.full_marks,
      obtained: m.total,
      grade,
      point,
      isFourthSubject: m.is_fourth_subject,
    };
  });

  const compulsory = subjects.filter((s) => !s.isFourthSubject);
  const optional = subjects.find((s) => s.isFourthSubject);

  const totalObtained = compulsory.reduce((a, s) => a + s.obtained, 0);
  const totalFull = compulsory.reduce((a, s) => a + s.fullMarks, 0);

  const failedSubjects = compulsory.filter((s) => s.grade === 'F').map((s) => s.name);
  const passed = failedSubjects.length === 0;

  const sumPoints = compulsory.reduce((a, s) => a + s.point, 0);
  const gpaWithout4th = passed && compulsory.length > 0 ? round2(sumPoints / compulsory.length) : 0;

  let gpaWith4th = gpaWithout4th;
  if (passed && optional && compulsory.length > 0) {
    const bonus = Math.max(0, Math.min(policy.fourth_subject_bonus_cap, optional.point - 2.0));
    gpaWith4th = round2((sumPoints + bonus) / compulsory.length);
  }

  const overallGrade = passed
    ? policy.scale.find((b) => b.point === Math.floor(gpaWithout4th * 2) / 2)?.grade ?? topGradeFor(gpaWithout4th, policy)
    : 'F';

  return {
    subjects,
    totalObtained,
    totalFull,
    gpaWithout4th,
    gpaWith4th,
    overallGrade,
    passed,
    failedSubjects,
  };
}

function topGradeFor(gpa: number, policy: GradingPolicy) {
  const sorted = [...policy.scale].sort((a, b) => b.point - a.point);
  return sorted.find((b) => gpa >= b.point)?.grade ?? 'F';
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
