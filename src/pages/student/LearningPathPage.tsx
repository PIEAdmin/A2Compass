import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { supabase } from '../../services/supabase';
import LearningPathMap from '../../components/shared/LearningPathMap';

interface SkillRow {
  id: string;
  name: string;
  code: string;
  domain_id: string;
  domain_name?: string;
  mastery_level: number;
  order_index: number;
}

export default function LearningPathPage() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('Student');

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      try {
        // Get student name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user!.id)
          .single();
        if (profile?.full_name) setStudentName(profile.full_name.split(' ')[0]);

        // Get student_profile id
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id, grade_level')
          .eq('user_id', user!.id)
          .single();
        if (!sp) return;

        // Get skill nodes for this grade
        const { data: nodes } = await supabase
          .from('skill_nodes')
          .select('id, name, code, domain_id, sort_order, skill_domains(name)')
          .order('sort_order', { ascending: true })
          .limit(50);

        // Get student mastery data
        const { data: mastery } = await supabase
          .from('student_skill_profiles')
          .select('skill_node_id, current_score')
          .eq('student_profile_id', sp.id);

        const masteryMap = new Map(
          (mastery || []).map(m => [m.skill_node_id, m.current_score || 0])
        );

        const mappedSkills = (nodes || []).map((n: any, idx: number) => {
          const score = masteryMap.get(n.id) || 0;
          let status: 'mastered' | 'in_progress' | 'locked' | 'ready' = 'locked';
          if (score >= 85) status = 'mastered';
          else if (score > 0) status = 'in_progress';
          else if (idx === 0 || (masteryMap.get((nodes || [])[idx - 1]?.id) || 0) > 0) status = 'ready';

          return {
            id: n.id,
            name: n.name,
            code: n.code,
            domainName: n.skill_domains?.name || 'General',
            masteryLevel: score,
            status,
            order: n.sort_order || idx,
          };
        });

        setSkills(mappedSkills);
      } catch (err) {
        console.error('Failed to load learning path:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="text-indigo-600 mt-3 text-sm font-medium">Loading your learning path...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <LearningPathMap
        skills={skills}
        studentName={studentName}
      />
    </div>
  );
}
