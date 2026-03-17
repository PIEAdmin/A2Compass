import { supabase } from './supabase';
import type { Lesson, Activity, ContentLibraryItem, CurriculumUnit, StudentAssignment, StudentSubmission, DiscussionPost, LessonFormData, ActivityFormData, AssignActivityData } from '../types/content';

export async function getLessons(teacherId: string, filters?: { subject_id?: string; status?: string; search?: string }) {
  let query = supabase.from('lessons').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug)').eq('teacher_id', teacherId).order('updated_at', { ascending: false });
  if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data as Lesson[];
}

export async function getLesson(id: string) {
  const { data, error } = await supabase.from('lessons').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug), activities(*)').eq('id', id).single();
  if (error) throw error;
  return data as Lesson;
}

export async function createLesson(teacherId: string, data: LessonFormData) {
  const { data: lesson, error } = await supabase.from('lessons').insert({ ...data, teacher_id: teacherId }).select().single();
  if (error) throw error;
  return lesson as Lesson;
}

export async function updateLesson(id: string, data: Partial<LessonFormData>) {
  const { data: lesson, error } = await supabase.from('lessons').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return lesson as Lesson;
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function getActivities(teacherId: string, filters?: { subject_id?: string; format_id?: string; status?: string; search?: string; lesson_id?: string }) {
  let query = supabase.from('activities').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug), learning_format:learning_formats(name, slug, icon)').eq('teacher_id', teacherId).order('updated_at', { ascending: false });
  if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
  if (filters?.format_id) query = query.eq('learning_format_id', filters.format_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.lesson_id) query = query.eq('lesson_id', filters.lesson_id);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data as Activity[];
}

export async function getActivity(id: string) {
  const { data, error } = await supabase.from('activities').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug), learning_format:learning_formats(name, slug, icon)').eq('id', id).single();
  if (error) throw error;
  return data as Activity;
}

export async function createActivity(teacherId: string, data: ActivityFormData, lessonId?: string) {
  const { data: activity, error } = await supabase.from('activities').insert({ ...data, teacher_id: teacherId, lesson_id: lessonId || null }).select().single();
  if (error) throw error;
  return activity as Activity;
}

export async function updateActivity(id: string, data: Partial<ActivityFormData>) {
  const { data: activity, error } = await supabase.from('activities').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return activity as Activity;
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function getLibraryItems(teacherId: string, filters?: { subject_id?: string; format_id?: string; search?: string; tags?: string[] }) {
  let query = supabase.from('content_library').select('*, subject:subjects(name, icon, color), learning_format:learning_formats(name, slug, icon)').eq('teacher_id', teacherId).order('usage_count', { ascending: false });
  if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
  if (filters?.format_id) query = query.eq('learning_format_id', filters.format_id);
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
  if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);
  const { data, error } = await query;
  if (error) throw error;
  return data as ContentLibraryItem[];
}

export async function saveToLibrary(teacherId: string, activity: Activity) {
  const { data, error } = await supabase.from('content_library').insert({
    teacher_id: teacherId, activity_id: activity.id, title: activity.title, description: activity.description,
    subject_id: activity.subject_id, learning_format_id: activity.learning_format_id, tags: activity.tags,
    content_snapshot: { config: activity.config, content: activity.content, attachments: activity.attachments, difficulty_level: activity.difficulty_level, estimated_minutes: activity.estimated_minutes }
  }).select().single();
  if (error) throw error;
  return data as ContentLibraryItem;
}

export async function createFromLibrary(teacherId: string, libraryItem: ContentLibraryItem) {
  const snapshot = libraryItem.content_snapshot as Record<string, any>;
  const { data, error } = await supabase.from('activities').insert({
    teacher_id: teacherId, title: `${libraryItem.title} (copy)`, description: libraryItem.description,
    subject_id: libraryItem.subject_id, learning_format_id: libraryItem.learning_format_id,
    config: snapshot.config || {}, content: snapshot.content || {}, attachments: snapshot.attachments || [],
    difficulty_level: snapshot.difficulty_level || 'medium', estimated_minutes: snapshot.estimated_minutes || 30,
    tags: libraryItem.tags, status: 'draft'
  }).select().single();
  if (error) throw error;
  await supabase.from('content_library').update({ usage_count: (libraryItem.usage_count || 0) + 1 }).eq('id', libraryItem.id);
  return data as Activity;
}

export async function getCurriculumUnits(teacherId: string, filters?: { subject_id?: string; status?: string }) {
  let query = supabase.from('curriculum_units').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug)').eq('teacher_id', teacherId).order('sort_order');
  if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data as CurriculumUnit[];
}

export async function getCurriculumUnit(id: string) {
  const { data, error } = await supabase.from('curriculum_units').select('*, subject:subjects(name, icon, color), tier:tiers(name, slug), items:curriculum_unit_items(*, lesson:lessons(*), activity:activities(*))').eq('id', id).single();
  if (error) throw error;
  return data as CurriculumUnit;
}

export async function createCurriculumUnit(teacherId: string, data: { title: string; description?: string; subject_id?: string; tier_id?: string }) {
  const { data: unit, error } = await supabase.from('curriculum_units').insert({ ...data, teacher_id: teacherId }).select().single();
  if (error) throw error;
  return unit as CurriculumUnit;
}

export async function assignActivity(data: AssignActivityData, teacherId: string) {
  const assignments = data.student_ids.map((studentId, i) => ({
    student_id: studentId, activity_id: data.activity_id, assigned_by: teacherId,
    assigned_date: data.assigned_date, due_date: data.due_date || null, display_order: data.display_order ?? i
  }));
  const { data: result, error } = await supabase.from('student_assignments').insert(assignments).select();
  if (error) throw error;
  return result as StudentAssignment[];
}

export async function getStudentAssignments(studentId: string, date?: string) {
  let query = supabase.from('student_assignments').select('*, activity:activities(*, subject:subjects(name, icon, color), learning_format:learning_formats(name, slug, icon))').eq('student_id', studentId).order('display_order');
  if (date) query = query.eq('assigned_date', date);
  const { data, error } = await query;
  if (error) throw error;
  return data as StudentAssignment[];
}

export async function getTeacherAssignments(teacherId: string, filters?: { student_id?: string; status?: string; date?: string }) {
  let query = supabase.from('student_assignments').select('*, activity:activities(title, subject:subjects(name, icon, color), learning_format:learning_formats(name, slug, icon)), student:student_profiles(user_id, grade_level, profiles:profiles(first_name, last_name))').eq('assigned_by', teacherId).order('assigned_date', { ascending: false });
  if (filters?.student_id) query = query.eq('student_id', filters.student_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.date) query = query.eq('assigned_date', filters.date);
  const { data, error } = await query;
  if (error) throw error;
  return data as StudentAssignment[];
}

export async function gradeAssignment(id: string, score: number, maxScore: number, feedback: string) {
  const percentage = (score / maxScore) * 100;
  const { data, error } = await supabase.from('student_assignments').update({
    score, max_score: maxScore, percentage, mastery_met: percentage >= 85,
    feedback, feedback_at: new Date().toISOString(), status: 'graded', completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).eq('id', id).select().single();
  if (error) throw error;
  return data as StudentAssignment;
}

export async function createSubmission(assignmentId: string, studentId: string, data: Partial<StudentSubmission>) {
  const { data: submission, error } = await supabase.from('student_submissions').insert({ ...data, assignment_id: assignmentId, student_id: studentId }).select().single();
  if (error) throw error;
  await supabase.from('student_assignments').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', assignmentId);
  return submission as StudentSubmission;
}

export async function getSubmissions(assignmentId: string) {
  const { data, error } = await supabase.from('student_submissions').select('*').eq('assignment_id', assignmentId).order('version', { ascending: false });
  if (error) throw error;
  return data as StudentSubmission[];
}

export async function getDiscussionPosts(activityId: string) {
  const { data, error } = await supabase.from('discussion_posts').select('*, author:profiles(first_name, last_name, avatar_url)').eq('activity_id', activityId).is('parent_post_id', null).order('created_at', { ascending: true });
  if (error) throw error;
  if (data?.length) {
    const postIds = data.map(p => p.id);
    const { data: replies } = await supabase.from('discussion_posts').select('*, author:profiles(first_name, last_name, avatar_url)').in('parent_post_id', postIds).order('created_at');
    return data.map(post => ({ ...post, replies: (replies || []).filter(r => r.parent_post_id === post.id) })) as DiscussionPost[];
  }
  return data as DiscussionPost[];
}

export async function createDiscussionPost(activityId: string, authorId: string, content: string, parentId?: string) {
  const { data, error } = await supabase.from('discussion_posts').insert({ activity_id: activityId, author_id: authorId, content, parent_post_id: parentId || null }).select('*, author:profiles(first_name, last_name, avatar_url)').single();
  if (error) throw error;
  return data as DiscussionPost;
}

export async function getLearningFormats() {
  const { data, error } = await supabase.from('learning_formats').select('*').eq('is_active', true).order('display_order');
  if (error) throw error;
  return data;
}

export async function getSubjects() {
  const { data, error } = await supabase.from('subjects').select('*').eq('is_active', true).order('display_order');
  if (error) throw error;
  return data;
}

export async function getTiers() {
  const { data, error } = await supabase.from('tiers').select('*').order('grade_range_start');
  if (error) throw error;
  return data;
}
