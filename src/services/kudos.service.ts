import { supabase } from './supabase';

export interface Kudos {
  id: string;
  student_id: string;
  student_name?: string;
  category: string;
  message: string;
  given_by: string;
  given_by_name?: string;
  spark_bonus: number;
  created_at: string;
}

const KUDOS_CATEGORIES = [
  { id: 'great_effort', label: 'Great Effort', emoji: '💪', sparks: 25 },
  { id: 'helping_others', label: 'Helping Others', emoji: '🤝', sparks: 20 },
  { id: 'creative_thinking', label: 'Creative Thinking', emoji: '💡', sparks: 25 },
  { id: 'persistence', label: 'Persistence', emoji: '🏔️', sparks: 30 },
  { id: 'improvement', label: 'Big Improvement', emoji: '📈', sparks: 35 },
  { id: 'perfect_score', label: 'Perfect Score', emoji: '⭐', sparks: 50 },
  { id: 'kindness', label: 'Acts of Kindness', emoji: '💛', sparks: 20 },
  { id: 'leadership', label: 'Leadership', emoji: '👑', sparks: 25 },
  { id: 'focus', label: 'Great Focus', emoji: '🎯', sparks: 20 },
  { id: 'teamwork', label: 'Teamwork', emoji: '🐧', sparks: 20 },
  { id: 'curiosity', label: 'Curiosity', emoji: '🔍', sparks: 15 },
  { id: 'custom', label: 'Custom Kudos', emoji: '🌟', sparks: 10 },
];

export { KUDOS_CATEGORIES };

export const kudosService = {
  /** Give kudos to a student (admin/teacher action) */
  async giveKudos(
    studentProfileId: string,
    category: string,
    message: string,
    givenById: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cat = KUDOS_CATEGORIES.find(c => c.id === category);
      const sparkBonus = cat?.sparks ?? 10;

      // Insert kudos as activity_log entry
      const { error: logErr } = await supabase.from('activity_log').insert({
        student_id: studentProfileId,
        activity_type: 'kudos',
        activity_name: `Kudos: ${cat?.label || category}`,
        details: {
          category,
          message,
          given_by: givenById,
          emoji: cat?.emoji || '🌟',
          spark_bonus: sparkBonus,
        },
        metadata: {
          category,
          message,
          given_by: givenById,
          spark_bonus: sparkBonus,
        },
      });
      if (logErr) throw logErr;

      // Award spark points
      const { error: spErr } = await supabase.from('spark_points').insert({
        student_profile_id: studentProfileId,
        amount: sparkBonus,
        reason: 'kudos',
        details: { category, message },
      });
      if (spErr) console.error('Spark point award failed:', spErr);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /** Get kudos for a student (ordered by newest first) */
  async getStudentKudos(studentProfileId: string, limit = 50): Promise<Kudos[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, student_id, activity_name, details, metadata, created_at')
      .eq('student_id', studentProfileId)
      .eq('activity_type', 'kudos')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      category: row.details?.category || row.metadata?.category || 'custom',
      message: row.details?.message || row.metadata?.message || '',
      given_by: row.details?.given_by || row.metadata?.given_by || '',
      spark_bonus: row.details?.spark_bonus || row.metadata?.spark_bonus || 0,
      created_at: row.created_at,
    }));
  },

  /** Get all kudos (for admin view), most recent first */
  async getAllKudos(limit = 100): Promise<Kudos[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, student_id, activity_name, details, metadata, created_at')
      .eq('activity_type', 'kudos')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      category: row.details?.category || row.metadata?.category || 'custom',
      message: row.details?.message || row.metadata?.message || '',
      given_by: row.details?.given_by || row.metadata?.given_by || '',
      spark_bonus: row.details?.spark_bonus || row.metadata?.spark_bonus || 0,
      created_at: row.created_at,
    }));
  },

  /** Get kudos trend data for a student (grouped by week) */
  async getKudosTrends(studentProfileId: string): Promise<{ week: string; count: number; categories: Record<string, number> }[]> {
    const kudos = await this.getStudentKudos(studentProfileId, 200);
    const weekMap: Record<string, { count: number; categories: Record<string, number> }> = {};

    for (const k of kudos) {
      const d = new Date(k.created_at);
      // Get Monday of that week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];

      if (!weekMap[weekKey]) weekMap[weekKey] = { count: 0, categories: {} };
      weekMap[weekKey].count++;
      weekMap[weekKey].categories[k.category] = (weekMap[weekKey].categories[k.category] || 0) + 1;
    }

    return Object.entries(weekMap)
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week.localeCompare(a.week));
  },
};
