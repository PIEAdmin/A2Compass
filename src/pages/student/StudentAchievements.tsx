import { useAuth } from '../../hooks';

export default function StudentAchievements() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">🏆 Achievements</h1>
        <p className="text-gray-500 mt-1">Your badges and awards, {firstName}!</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-3">⭐</p>
        <p className="text-gray-700 font-medium">Your achievements will appear here!</p>
        <p className="text-gray-400 text-sm mt-2">Earn badges as you master new skills. Your first badge is waiting!</p>
      </div>
    </div>
  );
}
