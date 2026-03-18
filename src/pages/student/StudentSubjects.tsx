import { useAuth } from '../../hooks';

export default function StudentSubjects() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">📚 My Subjects</h1>
        <p className="text-gray-500 mt-1">See what you're learning, {firstName}!</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-3">📖</p>
        <p className="text-gray-700 font-medium">Your subjects will appear here after your assessment!</p>
        <p className="text-gray-400 text-sm mt-2">Once your teacher reviews your skills, you'll see all your learning areas here.</p>
      </div>
    </div>
  );
}
