import { supabase } from './supabase';
import type { SkillNode, PlaylistItem } from '../types/skills';

// ─── Skill Nodes ─────────────────────────────────────────────────────────────

export async function getSkillNodes(): Promise<SkillNode[]> {
  const { data, error } = await supabase
    .from('skill_nodes')
    .select('*')
    .order('domain_id, grade_level, code');

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

  // Group by domain
  const domainMap: Record<string, {
    domain: { id: string; name: string; icon: string };
    skills: typeof data;
    mastered: number;
    total: number;
  }> = {};

  for (const item of data || []) {
    const domain = item.skill?.domain;
    if (!domain) continue;
    if (!domainMap[domain.id]) {
      domainMap[domain.id] = {
        domain,
        skills: [],
        mastered: 0,
        total: 0,
      };
    }
    domainMap[domain.id].skills.push(item);
    domainMap[domain.id].total++;
    if (item.status === 'mastered') domainMap[domain.id].mastered++;
  }

  return Object.values(domainMap);
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
  const { data, error } = await supabase
    .from('student_profiles')
    .select('daily_skill_cap, day_mode, focus_skill_ids')
    .eq('id', studentId)
    .single();

  if (error) throw error;
  return {
    dailySkillCap: data?.daily_skill_cap ?? 5,
    dayMode: data?.day_mode ?? 'standard',
    focusSkillIds: data?.focus_skill_ids ?? [],
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
    .eq('id', studentId);

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
