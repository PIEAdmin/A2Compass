import { supabase } from './supabase';
import type { SkillNode, PlaylistItem } from '../types/skills';

// ─── Skill Nodes ─────────────────────────────────────────────────────────────

export async function getSkillNodes(): Promise<SkillNode[]> {
  const { data, error } = await supabase
    .from('skill_nodes')
    .select('*')
    .order('domain_id')
    .order('grade_level_approx')
    .order('code');

  if (error) throw error;
  return data || [];
}

// ─── Skill Domains ───────────────────────────────────────────────────────────

export async function getSkillDomains() {
  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

// ─── Student Skill Summary ───────────────────────────────────────────────────

export async function getStudentSkillSummary(studentId: string) {
  const { data, error } = await supabase
    .from('student_playlist')
    .select(`
      *,
      skill:skill_nodes(*, domain:skill_domains(*))
    `)
    .eq('student_id', studentId)
    .order('position');

  if (error) throw error;

  // Group by domain and transform to match DomainSkillGroup shape
  const domainMap: Record<string, {
    domain: { id: string; code: string; name: string; category: string };
    skills: {
      skill_code: string;
      skill_name: string;
      status: string;
      current_score: number;
      mastered_at: string | null;
      domain_name: string;
      domain_code: string;
    }[];
    masteredCount: number;
    totalCount: number;
  }> = {};

  for (const item of data || []) {
    const domain = item.skill?.domain;
    if (!domain) continue;
    if (!domainMap[domain.id]) {
      domainMap[domain.id] = {
        domain: {
          id: domain.id,
          code: domain.code || '',
          name: domain.name || '',
          category: domain.category || 'literacy',
        },
        skills: [],
        masteredCount: 0,
        totalCount: 0,
      };
    }
    const group = domainMap[domain.id];
    group.skills.push({
      skill_code: item.skill?.code || '',
      skill_name: item.skill?.name || '',
      status: item.status || 'not_started',
      current_score: item.current_score || 0,
      mastered_at: item.status === 'mastered' ? (item.last_attempted_at || item.updated_at) : null,
      domain_name: domain.name || '',
      domain_code: domain.code || '',
    });
    group.totalCount++;
    if (item.status === 'mastered') group.masteredCount++;
  }

  return Object.values(domainMap).map((g) => ({
    ...g,
    percentComplete: g.totalCount > 0 ? Math.round((g.masteredCount / g.totalCount) * 100) : 0,
  }));
}

// ─── Playlist ────────────────────────────────────────────────────────────────

export async function getPlaylistItems(studentId: string, status?: string): Promise<PlaylistItem[]> {
  let query = supabase
    .from('student_playlist')
    .select(`
      *,
      skill:skill_nodes(*)
    `)
    .eq('student_id', studentId);

  if (status) query = query.eq('status', status);
  query = query.order('position');

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getStudentPlaylist(studentId: string): Promise<PlaylistItem[]> {
  return getPlaylistItems(studentId);
}

export async function completePlaylistItem(
  playlistItemId: string,
  score: number,
  totalQuestions: number
): Promise<void> {
  const percent = Math.round((score / totalQuestions) * 100);
  const mastered = percent >= 85;

  const { error } = await supabase
    .from('student_playlist')
    .update({
      status: mastered ? 'mastered' : 'in_progress',
      current_score: percent,
      last_attempted_at: new Date().toISOString(),
    })
    .eq('id', playlistItemId);

  if (error) throw error;

  // Increment attempts
  await supabase.rpc('increment_playlist_attempts', { item_id: playlistItemId });
}

export async function skipPlaylistItem(playlistItemId: string): Promise<void> {
  const { error } = await supabase
    .from('student_playlist')
    .update({ status: 'skipped', last_attempted_at: new Date().toISOString() })
    .eq('id', playlistItemId);

  if (error) throw error;
}

export async function startPlaylistItem(playlistItemId: string): Promise<void> {
  const { error } = await supabase
    .from('student_playlist')
    .update({ status: 'in_progress', last_attempted_at: new Date().toISOString() })
    .eq('id', playlistItemId);

  if (error) throw error;
}

// ─── Playlist Config ─────────────────────────────────────────────────────────

export async function getPlaylistConfig(studentId: string) {
  // student_profiles uses row UUID, but we receive auth UUID
  // Query by user_id instead of id
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  // These columns may not exist yet on student_profiles — use safe defaults
  return {
    dailySkillCap: (data as any)?.daily_skill_cap ?? 5,
    dayMode: (data as any)?.day_mode ?? 'standard',
    focusSkillIds: (data as any)?.focus_skill_ids ?? [],
  };
}

export async function updatePlaylistConfig(
  studentId: string,
  config: { dailySkillCap?: number; dayMode?: string; focusSkillIds?: string[] }
) {
  const updates: Record<string, unknown> = {};
  if (config.dailySkillCap !== undefined) updates.daily_skill_cap = config.dailySkillCap;
  if (config.dayMode !== undefined) updates.day_mode = config.dayMode;
  if (config.focusSkillIds !== undefined) updates.focus_skill_ids = config.focusSkillIds;

  const { error } = await supabase
    .from('student_profiles')
    .update(updates)
    .eq('user_id', studentId);

  if (error) throw error;
}

export async function setDayMode(studentId: string, mode: string) {
  return updatePlaylistConfig(studentId, { dayMode: mode });
}

export async function setDailySkillCap(studentId: string, cap: number) {
  return updatePlaylistConfig(studentId, { dailySkillCap: cap });
}

export async function updateFocusSkills(studentId: string, skillIds: string[]) {
  return updatePlaylistConfig(studentId, { focusSkillIds: skillIds });
}

// ─── Teacher Overrides ───────────────────────────────────────────────────────

export async function teacherOverrideSkill(
  studentId: string,
  skillNodeId: string,
  newStatus: string,
  teacherId: string
) {
  // Update the playlist item status
  const { error } = await supabase
    .from('student_playlist')
    .update({
      status: newStatus,
      teacher_override: true,
      override_by: teacherId,
      override_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('skill_node_id', skillNodeId);

  if (error) throw error;
}

export async function generatePlaylist(studentId: string) {
  // Call the RPC function to regenerate the student's playlist
  const { data, error } = await supabase.rpc('generate_student_playlist', {
    p_student_id: studentId,
  });

  if (error) throw error;
  return data;
}

// ─── Content Library ─────────────────────────────────────────────────────────

export async function getActivityForSkill(skillNodeId: string) {
  const { data, error } = await supabase
    .from('content_library')
    .select('*')
    .eq('skill_node_id', skillNodeId)
    .eq('status', 'published')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getActivityById(activityId: string) {
  const { data, error } = await supabase
    .from('content_library')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) throw error;
  return data;
}
