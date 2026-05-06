import React from 'react';
import { PenguinMascot } from './PepperPenguin';

type LoadingVariant = 'walking' | 'reading' | 'packing' | 'flying' | 'default';

interface LoadingStateProps {
  message?: string;
  variant?: LoadingVariant;
  size?: number;
  className?: string;
}

const MESSAGES: Record<LoadingVariant, string> = {
  walking: 'Waddling your way...',
  reading: 'Reading up on that...',
  packing: 'Packing your backpack...',
  flying: 'Soaring to your adventure...',
  default: 'Loading your adventure...',
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  variant = 'default',
  size = 100,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 page-enter ${className}`}>
    <div className="penguin-loading mb-4">
      <PenguinMascot mood="thinking" size={size} />
    </div>
    <p className="text-gray-500 font-medium text-lg animate-pulse">
      {message || MESSAGES[variant]}
    </p>
    <div className="flex gap-1 mt-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-green-400"
          style={{
            animation: `gentle-bounce 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

export default LoadingState;
