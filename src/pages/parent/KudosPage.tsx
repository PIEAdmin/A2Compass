import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { studentService } from '../../services/students';
import { LoadingSpinner } from '../../components/common';
import KudosTrends from '../../components/parent/KudosTrends';
import type { StudentProfile } from '../../types';

export default function KudosPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const students = await studentService.getStudentsByParent(user.id);
        setChildren(students);
      } catch (err) {
        console.error('Failed to load children:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🌟 Kudos & Recognition</h1>
        <p className="text-gray-500 mt-1">See what your children are being recognized for!</p>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🌟</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No children enrolled yet</h3>
          <p className="text-gray-500 text-sm">Kudos will appear here once your children are enrolled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map(child => {
            const profile = child.profile || child.profiles;
            const name = profile ? `${(profile as any).first_name} ${(profile as any).last_name}` : 'Student';
            return (
              <KudosTrends
                key={child.id}
                studentProfileId={child.id}
                studentName={name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
