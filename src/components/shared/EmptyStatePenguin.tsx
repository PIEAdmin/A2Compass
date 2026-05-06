import React from 'react';
import { PenguinMascot, type PenguinMood } from './PepperPenguin';

type EmptyContext =
  | 'flight-plan'
  | 'achievements'
  | 'library'
  | 'messages'
  | 'rewards'
  | 'search'
  | 'error'
  | 'generic';

interface EmptyStatePenguinProps {
  context?: EmptyContext;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EMPTY_CONFIGS: Record<EmptyContext, { mood: PenguinMood; speech: string; title: string; message: string; icon: string }> = {
  'flight-plan': {
    mood: 'idle',
    speech: 'Check back tomorrow!',
    title: 'All clear for today!',
    message: 'No skills for today? Take a breather, explorer! 🌲',
    icon: '📖',
  },
  achievements: {
    mood: 'waving',
    speech: "Let's earn some!",
    title: 'No badges yet!',
    message: 'Complete activities to earn your first badge! You got this! ⭐',
    icon: '🏆',
  },
  library: {
    mood: 'thinking',
    speech: 'Hmm, where are they?',
    title: 'Library is quiet',
    message: 'No books yet. Check back soon for new adventures! 📚',
    icon: '🔍',
  },
  messages: {
    mood: 'waving',
    speech: 'Say hello!',
    title: 'No new messages',
    message: 'Send a note to your teacher! They love hearing from you! ✉️',
    icon: '💌',
  },
  rewards: {
    mood: 'idle',
    speech: 'Earn Spark Points!',
    title: 'Reward Shop',
    message: 'Complete activities to earn Spark Points and unlock cool stuff! ✨',
    icon: '🪙',
  },
  search: {
    mood: 'thinking',
    speech: 'Not finding that...',
    title: 'No results found',
    message: 'Try a different search term! 🔎',
    icon: '🔍',
  },
  error: {
    mood: 'thinking',
    speech: 'Oops!',
    title: 'Something went wrong',
    message: "Don't worry — try again and we'll get it sorted! 🔧",
    icon: '⚠️',
  },
  generic: {
    mood: 'idle',
    speech: 'Nothing here yet!',
    title: 'Nothing to show',
    message: 'Check back later for new content! 🌟',
    icon: '📋',
  },
};

export const EmptyStatePenguin: React.FC<EmptyStatePenguinProps> = ({
  context = 'generic',
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  const config = EMPTY_CONFIGS[context];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 page-enter ${className}`}>
      <div className="mb-4 float-animation">
        <PenguinMascot mood={config.mood} size={120} speech={config.speech} />
      </div>

      <div className="text-center mt-4 max-w-sm">
        <h3 className="text-xl font-bold text-gray-700 mb-2">
          {title || config.title}
        </h3>
        <p className="text-gray-500 text-base leading-relaxed">
          {message || config.message}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 tier-btn-primary btn-animated btn-pulse px-8 py-3 text-lg font-bold rounded-xl"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyStatePenguin;
