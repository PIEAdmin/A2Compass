import React from 'react';
import { useSound } from '../../hooks/useSound';

interface SoundToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ className = '', showLabel = true }) => {
  const { enabled, toggle, play } = useSound();

  const handleToggle = () => {
    toggle();
    if (!enabled) {
      // Will be enabled after toggle, play a click to confirm
      setTimeout(() => play('click'), 50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 
        ${enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} 
        btn-animated ${className}`}
      title={enabled ? 'Sound On' : 'Sound Off'}
      aria-label={enabled ? 'Turn sound off' : 'Turn sound on'}
    >
      <span className="text-xl">{enabled ? '🔊' : '🔇'}</span>
      {showLabel && (
        <span className="text-sm font-medium">
          {enabled ? 'Sound On' : 'Sound Off'}
        </span>
      )}
    </button>
  );
};

export default SoundToggle;
