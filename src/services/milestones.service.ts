// A² Compass – Week 6: Milestones & Parent Story Engine service

import { supabase } from './supabase';
import type {
  MilestoneNotification,
  Certificate,
  ProgressSnapshot,
  SoftSkillRating,
} from '../types/milestones';

/* ─── Milestones ─────────────────────────────────────────────── */

export async function getMilestones(
  studentId: string,
  limit = 20,
): Promise<MilestoneNotification[]> {
  const { data, error } = await supabase.rpc('get_student_milestones', {
    p_student_id: studentId,
    p_limit: limit,
  });

  if (error) {
    console.error('getMilestones error:', error);
    throw error;
  }
  return (data ?? []) as MilestoneNotification[];
}

export async function createMilestone(
  data: Partial<MilestoneNotification>,
): Promise<MilestoneNotification> {
  const { data: row, error } = await supabase
    .from('milestone_notifications')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('createMilestone error:', error);
    throw error;
  }
  return row as MilestoneNotification;
}

export async function markMilestoneRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('milestone_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('markMilestoneRead error:', error);
    throw error;
  }
}

export async function shareWin(
  teacherId: string,
  studentId: string,
  parentId: string | null,
  title: string,
  message: string,
  skillCode?: string,
  domainCode?: string,
): Promise<MilestoneNotification> {
  return createMilestone({
    teacher_id: teacherId,
    student_id: studentId,
    parent_id: parentId,
    milestone_type: 'custom',
    title,
    message,
    skill_code: skillCode ?? null,
    domain_code: domainCode ?? null,
    metadata: { source: 'teacher_share_win' },
    shared_at: new Date().toISOString(),
  });
}

/* ─── Certificates ───────────────────────────────────────────── */

export async function getCertificates(
  studentId: string,
): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) {
    console.error('getCertificates error:', error);
    throw error;
  }
  return (data ?? []) as Certificate[];
}

export async function createCertificate(
  data: Partial<Certificate>,
): Promise<Certificate> {
  const { data: row, error } = await supabase
    .from('certificates')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('createCertificate error:', error);
    throw error;
  }
  return row as Certificate;
}

/* ─── Soft Skill Ratings ─────────────────────────────────────── */

export async function getSoftSkillRatings(
  studentId: string,
): Promise<SoftSkillRating[]> {
  const { data, error } = await supabase
    .from('soft_skill_ratings')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getSoftSkillRatings error:', error);
    throw error;
  }
  return (data ?? []) as SoftSkillRating[];
}

export async function upsertSoftSkillRating(
  data: Partial<SoftSkillRating>,
): Promise<SoftSkillRating> {
  const { data: row, error } = await supabase
    .from('soft_skill_ratings')
    .upsert(data, {
      onConflict: 'student_id,rating_period',
    })
    .select()
    .single();

  if (error) {
    console.error('upsertSoftSkillRating error:', error);
    throw error;
  }
  return row as SoftSkillRating;
}

/* ─── Progress Snapshots ─────────────────────────────────────── */

export async function createProgressSnapshot(
  data: Partial<ProgressSnapshot>,
): Promise<ProgressSnapshot> {
  const { data: row, error } = await supabase
    .from('progress_snapshots')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('createProgressSnapshot error:', error);
    throw error;
  }
  return row as ProgressSnapshot;
}

export async function getProgressSnapshots(
  studentId: string,
): Promise<ProgressSnapshot[]> {
  const { data, error } = await supabase
    .from('progress_snapshots')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getProgressSnapshots error:', error);
    throw error;
  }
  return (data ?? []) as ProgressSnapshot[];
}

export async function getSnapshotByToken(
  token: string,
): Promise<ProgressSnapshot | null> {
  const { data, error } = await supabase
    .from('progress_snapshots')
    .select('*')
    .eq('share_token', token)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    console.error('getSnapshotByToken error:', error);
    throw error;
  }
  return data as ProgressSnapshot;
}
