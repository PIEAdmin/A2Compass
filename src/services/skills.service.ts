import { supabase } from '../lib/supabase';
import type { SkillNode, PlaylistItem } from '../types/skills';

// Fetch all skill nodes
export async function getSkillNodes(): Promise<SkillNode[]> {
  const { data, error } = await supabase
    .from('skill_nodes')
    .select('*')
    .order('domain_id, grade_level, code');

  if (error) throw error;
  return data || [];
}

// Fetch skill nodes for a specific student's playlist
export async function getStudentPlaylist(studentId: string): Promise<PlaylistItem[]> {
  const { data, error } = await supabase
    .from('student_playlist')
    .select(`
      *,
      skill:skill_nodes(*)
    `)
    .eq('student_id', studentId)
    .order('position');

  if (error) throw error;
  return data || [];
}

// Complete a playlist item with score
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
      attempts: supabase.rpc ? undefined : 1, // increment handled below
      last_attempted_at: new Date().toISOString(),
    })
    .eq('id', playlistItemId);

  if (error) throw error;

  // Increment attempts
  await supabase.rpc('increment_playlist_attempts', { item_id: playlistItemId });
}

// Fetch a content_library activity for a given skill_node_id
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

// Fetch a specific content_library item by ID
export async function getActivityById(activityId: string) {
  const { data, error } = await supabase
    .from('content_library')
    .select('*')
    .eq('id', activityId)
    .single();

  if (error) throw error;
  return data;
}
