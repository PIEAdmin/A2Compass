// Admin Dashboard — delegates to TeacherDashboard since Sandra is both admin & teacher
import TeacherDashboard from '../teacher/Dashboard';

export default function AdminDashboard() {
  return <TeacherDashboard />;
}
