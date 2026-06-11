import { useNavigate } from 'react-router-dom';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({ title = 'Coming Soon', description = 'This feature is being built and will be available shortly.' }: ComingSoonProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">{description}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
          ← Go Back
        </button>
      </div>
    </div>
  );
}
