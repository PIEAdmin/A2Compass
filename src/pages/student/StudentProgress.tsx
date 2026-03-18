import { useAuth } from '../../hooks';

export default function StudentProgress() {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(' ')[0] || 'Explorer';

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900">🎯 My Progress</h1>
        <p className="text-gray-500 mt-1">Track how far you've come, {firstName}!</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-3">📊</p>
        <p className="text-gray-700 font-medium">Your progress will show up here as you learn!</p>
        <p className="text-gray-400 text-sm mt-2">Complete activities and watch your skills grow. Every step counts!</p>
      </div>
    </div>
  );
}
