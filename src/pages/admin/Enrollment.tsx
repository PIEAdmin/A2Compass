import EnrollmentManager from '../../components/admin/EnrollmentManager';
import { Header } from '../../components/layout';

export default function Enrollment() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="📋 Enrollment Management" subtitle="Manage student enrollments and programs" />
      <div className="p-6">
        <EnrollmentManager />
      </div>
    </div>
  );
}
