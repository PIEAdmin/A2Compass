import { useState, useCallback, useRef, useEffect } from 'react';

interface ReadAloudProps {
  text: string;
  children: React.ReactNode;
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  autoRead?: boolean;
  highlightOnRead?: boolean;
  showIcon?: boolean;
}

const speak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!text || !('speechSynthesis' in window)) { resolve(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0;
      utterance.rate = 0.82;
      utterance.pitch = 1.15;
      const voices = synth.getVoices();
      const preferred = voices.find(v =>
        /samantha|google.*female|google.*us|karen|moira|fiona/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
      // Chrome stuck-state fix
      setTimeout(() => { if (synth.speaking && synth.paused) synth.resume(); }, 5000);
    }, 80);
  });
};

export { speak as speakText };

export function ReadAloud({
  text,
  children,
  className = '',
  iconSize = 'md',
  autoRead = false,
  highlightOnRead = true,
  showIcon = true,
}: ReadAloudProps) {
  const [isReading, setIsReading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (autoRead && text) {
      handleRead();
    }
  }, [autoRead, text]);

  const handleRead = useCallback(async () => {
    if (isReading) return;
    setIsReading(true);
    await speak(text);
    if (mountedRef.current) setIsReading(false);
  }, [text, isReading]);

  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  const iconClass = sizes[iconSize];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${highlightOnRead && isReading ? 'bg-yellow-100 rounded-lg px-1 -mx-1' : ''} ${className}`}
    >
      {children}
      {showIcon && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleRead(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleRead(); }}
          className={`inline-flex items-center justify-center rounded-full
            ${isReading ? 'text-indigo-600 animate-pulse' : 'text-gray-400 hover:text-indigo-500'}
            transition-colors p-0.5 flex-shrink-0`}
          aria-label={`Read aloud: ${text}`}
          title="Tap to hear"
          type="button"
        >
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * ReadAloudBlock: wraps block-level elements (instructions, feedback)
 */
export function ReadAloudBlock({
  text,
  children,
  autoRead = false,
  className = '',
}: {
  text: string;
  children: React.ReactNode;
  autoRead?: boolean;
  className?: string;
}) {
  const [isReading, setIsReading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (autoRead && text) {
      (async () => {
        setIsReading(true);
        await speak(text);
        if (mountedRef.current) setIsReading(false);
      })();
    }
  }, [autoRead, text]);

  return (
    <div className={`relative group ${isReading ? 'ring-2 ring-yellow-300 rounded-xl' : ''} ${className}`}>
      {children}
      <button
        onClick={async () => {
          setIsReading(true);
          await speak(text);
          if (mountedRef.current) setIsReading(false);
        }}
        className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-md border border-gray-200
          opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
          hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
        aria-label="Read aloud"
        title="Tap to hear"
        type="button"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
        </svg>
      </button>
    </div>
  );
}
