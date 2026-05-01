import { supabase } from './supabase';
import type {
  SkillDomain,
  SkillNode,
  SkillPrerequisite,
  SkillProfileEntry,
  DomainSkillGroup,
  PlaylistConfig,
  PlaylistItem,
  GeneratedPlaylistItem,
  DayMode,
} from '../types/skills';

// --- Skill Graph (read-only reference data) ---

export async function getSkillDomains(): Promise<SkillDomain[]> {
  const { data, error } = await supabase
    .from('skill_domains')
    .select('*')
    .order('display_order');
  if (error) throw error;
  return data as SkillDomain[];
}

export async function getSkillNodes(domainId?: string): Promise<SkillNode[]> {
  let query = supabase
    .from('skill_nodes')
    .select('*, domain:skill_domains(*)')
    .order('display_order');
  if (domainId) query = query.eq('domain_id', domainId);
  const { data, error } = await query;
  if (error) throw error;
  return data as SkillNode[];
}

export async function getSkillPrerequisites(skillId: string): Promise<SkillPrerequisite[]> {
  const { data, error } = await supabase
    .from('skill_prerequisites')
    .select('*')
    .eq('skill_id', skillId);
  if (error) throw error;
  return data as SkillPrerequisite[];
}

export async function getSkillDependents(skillId: string): Promise<SkillPrerequisite[]> {
  const { data, error } = await supabase
    .from('skill_prerequisites')
    .select('*')
    .eq('prerequisite_id', skillId);
  if (error) throw error;
  return data as SkillPrerequisite[];
}

// --- Student Skill Profiles ---

export async function initializeStudentSkills(studentId: string): Promise<number> {
  const { data, error } = await supabase.rpc('initialize_student_skills', {
    p_student_id: studentId,
  });
  if (error) throw error;
  return data as number;
}

export async function getStudentSkillProfile(studentId: string): Promise<SkillProfileEntry[]> {
  const { data, error } = await supabase.rpc('get_student_skill_profile', {
    p_student_id: studentId,
  });
  if (error) throw error;
  return data as SkillProfileEntry[];
}

export async function getStudentSkillSummary(studentId: string): Promise<DomainSkillGroup[]> {
  const profile = await getStudentSkillProfile(studentId);
  const domains = await getSkillDomains();

  const domainMap = new Map<string, SkillProfileEntry[]>();
  for (const entry of profile) {
    const key = entry.domain_code;
    if (!domainMap.has(key)) domainMap.set(key, []);
    domainMap.get(key)!.push(entry);
  }

  return domains.map((domain) => {
    const skills = domainMap.get(domain.code) || [];
    const masteredCount = skills.filter((s) => s.status === 'mastered').length;
    const totalCount = skills.length;
    return {
      domain,
      skills,
      masteredCount,
      totalCount,
      percentComplete: totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0,
    };
  });
}

export async function updateSkillScore(
  studentId: string,
  skillCode: string,
  score: number
): Promise<Record<string, any>> {
  const { data, error } = await supabase.rpc('update_skill_score', {
    p_student_id: studentId,
    p_skill_code: skillCode,
    p_score: score,
  });
  if (error) throw error;
  return data as Record<string, any>;
}

// --- Playlist ---

export async function getPlaylistConfig(studentId: string): Promise<PlaylistConfig> {
  const { data, error } = await supabase
    .from('playlist_configs')
    .select('*')
    .eq('student_id', studentId)
    .single();
  if (error) throw error;
  return data as PlaylistConfig;
}

export async function updatePlaylistConfig(
  studentId: string,
  updates: Partial<PlaylistConfig>
): Promise<PlaylistConfig> {
  const { data, error } = await supabase
    .from('playlist_configs')
    .update(updates)
    .eq('student_id', studentId)
    .select()
    .single();
  if (error) throw error;
  return data as PlaylistConfig;
}

export async function generatePlaylist(
  studentId: string,
  date?: string
): Promise<GeneratedPlaylistItem[]> {
  const playlistDate = date || new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.rpc('generate_playlist', {
    p_student_id: studentId,
    p_date: playlistDate,
  });
  if (error) throw error;
  return data as GeneratedPlaylistItem[];
}

export async function getPlaylistItems(
  studentId: string,
  date?: string
): Promise<PlaylistItem[]> {
  const playlistDate = date || new Date().toISOString().split('T')[0];
  let query = supabase
    .from('playlist_items')
    .select('*, skill:skill_nodes(*, domain:skill_domains(*))')
    .eq('student_id', studentId)
    .eq('playlist_date', playlistDate)
    .order('display_order');
  const { data, error } = await query;
  if (error) throw error;
  return data as PlaylistItem[];
}

export async function completePlaylistItem(
  itemId: string,
  score: number
): Promise<Record<string, any>> {
  const { data, error } = await supabase.rpc('complete_playlist_item', {
    p_item_id: itemId,
    p_score: score,
  });
  if (error) throw error;
  return data as Record<string, any>;
}

export async function skipPlaylistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_items')
    .update({ status: 'skipped' })
    .eq('id', itemId);
  if (error) throw error;
}

export async function startPlaylistItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_items')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
}

// --- Content Library ---

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

// --- Teacher Overrides ---

export async function teacherOverrideSkill(
  studentId: string,
  skillCode: string,
  newStatus: string,
  teacherId: string,
  note?: string
): Promise<Record<string, any>> {
  const { data, error } = await supabase.rpc('teacher_override_skill', {
    p_student_id: studentId,
    p_skill_code: skillCode,
    p_new_status: newStatus,
    p_teacher_id: teacherId,
    p_note: note || null,
  });
  if (error) throw error;
  return data as Record<string, any>;
}

export async function updateFocusSkills(
  studentId: string,
  focusSkillIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from('playlist_configs')
    .update({ focus_skill_ids: focusSkillIds })
    .eq('student_id', studentId);
  if (error) throw error;
}

export async function setDayMode(studentId: string, mode: DayMode): Promise<void> {
  const { error } = await supabase
    .from('playlist_configs')
    .update({ day_mode: mode })
    .eq('student_id', studentId);
  if (error) throw error;
}

export async function setDailySkillCap(studentId: string, cap: number): Promise<void> {
  const { error } = await supabase
    .from('playlist_configs')
    .update({ daily_skill_cap: cap })
    .eq('student_id', studentId);
  if (error) throw error;
}
