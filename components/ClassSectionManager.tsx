'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastProvider';

interface TeacherOption { id: string; full_name: string; }
interface SectionRow { id: string; name: string; class_teacher_id: string | null; class_teacher_name?: string; }
interface ClassRow { id: string; name: string; sections: SectionRow[]; }

export function ClassSectionManager({
  instituteId, sessionId, initialClasses, teachers,
}: { instituteId: string; sessionId: string; initialClasses: ClassRow[]; teachers: TeacherOption[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [classes, setClasses] = useState<ClassRow[]>(initialClasses);
  const [newClassName, setNewClassName] = useState('');
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});

  async function addClass() {
    if (!newClassName.trim()) return;
    const { data, error } = await supabase.from('classes').insert({ institute_id: instituteId, session_id: sessionId, name: newClassName }).select().single();
    if (error) { toast('Could not add class', error.message, 'error'); return; }
    setClasses((c) => [...c, { id: data.id, name: data.name, sections: [] }]);
    setNewClassName('');
    toast('Class added', `${data.name} is ready — add as many sections as you need.`, 'success');
  }

  async function addSection(classId: string) {
    const name = sectionDrafts[classId]?.trim();
    if (!name) return;
    const { data, error } = await supabase.from('sections').insert({ institute_id: instituteId, class_id: classId, name }).select().single();
    if (error) { toast('Could not add section', error.message, 'error'); return; }
    setClasses((cs) => cs.map((c) => (c.id === classId ? { ...c, sections: [...c.sections, { id: data.id, name: data.name, class_teacher_id: null }] } : c)));
    setSectionDrafts((d) => ({ ...d, [classId]: '' }));
    toast('Section added', `Section ${name} created.`, 'success');
  }

  async function assignClassTeacher(classId: string, sectionId: string, teacherId: string) {
    const { error } = await supabase.from('sections').update({ class_teacher_id: teacherId || null }).eq('id', sectionId);
    if (error) { toast('Could not assign class teacher', error.message, 'error'); return; }
    setClasses((cs) => cs.map((c) => c.id !== classId ? c : {
      ...c, sections: c.sections.map((s) => s.id === sectionId ? { ...s, class_teacher_id: teacherId } : s),
    }));
    toast('Class teacher assigned', 'Updated for this section.', 'success');
  }

  return (
    <div>
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-sm mb-3">Add a Class</h3>
        <div className="flex gap-3">
          <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. Class 9" className="flex-1 border border-line rounded-sm px-3 py-2 text-sm max-w-xs" />
          <button onClick={addClass} className="bg-indigo text-white text-sm font-semibold px-4 py-2 rounded-sm">+ Add Class</button>
        </div>
      </div>

      <div className="space-y-4">
        {classes.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg font-semibold">{c.name}</h3>
              <span className="text-xs text-slate2-light">{c.sections.length} section{c.sections.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="scroll-x border border-line rounded-DEFAULT mb-4">
              <table>
                <thead><tr><th>Section</th><th>Class Teacher</th></tr></thead>
                <tbody>
                  {c.sections.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold">Section {s.name}</td>
                      <td>
                        <select
                          defaultValue={s.class_teacher_id ?? ''}
                          onChange={(e) => assignClassTeacher(c.id, s.id, e.target.value)}
                          className="border border-line rounded-sm px-2.5 py-1.5 text-xs min-w-[180px]"
                        >
                          <option value="">— Not assigned —</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {c.sections.length === 0 && <tr><td colSpan={2} className="text-slate2-light">No sections yet — add as many as this class needs.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <input
                value={sectionDrafts[c.id] ?? ''}
                onChange={(e) => setSectionDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                placeholder="Section name, e.g. A"
                className="border border-line rounded-sm px-3 py-1.5 text-sm w-40"
              />
              <button onClick={() => addSection(c.id)} className="border border-line text-sm font-semibold px-3 py-1.5 rounded-sm hover:bg-paper">+ Add Section</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
