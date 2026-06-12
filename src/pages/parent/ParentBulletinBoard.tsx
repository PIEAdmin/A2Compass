import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks';
import { studentService } from '../../services/students';
import BulletinBoard from '../../components/shared/BulletinBoard';

export default function ParentBulletinBoard() {
  const { user } = useAuth();
  const [studentProfileId, setStudentProfileId] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const students = await studentService.getStudentsByParent(user.id);
      if (students.length > 0) setStudentProfileId(students[0].id);
    })();
  }, [user]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📋 Bulletin Board</h1>
        <p className="text-gray-500 mt-1">
          Stay up to date with birthdays, holidays, and school year progress.
        </p>
      </div>
      <BulletinBoard role="parent" studentProfileId={studentProfileId} />
    </div>
  );
}
