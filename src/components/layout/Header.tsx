import React, { useEffect, useState } from 'react';
import { SoundToggle } from '../shared/SoundToggle';
import { SparkPointsDisplay } from '../shared/SparkPointsDisplay';
import { supabase } from '../../services/supabase';

interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setRole(profile?.role || null);

      if (profile?.role === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (sp) setStudentProfileId(sp.id);
      }
    })();
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-compass-navy">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Spark Points for students */}
          {role === 'student' && studentProfileId && (
            <SparkPointsDisplay studentProfileId={studentProfileId} size="md" />
          )}
          {/* Sound toggle for students */}
          {role === 'student' && <SoundToggle showLabel={false} />}
          {children}
        </div>
      </div>
    </header>
  )
}
