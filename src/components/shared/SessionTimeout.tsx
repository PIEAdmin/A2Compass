import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../../services/supabase';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 min before
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export default function SessionTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(async () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    setCountdown(120);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Check remember me
    const rememberMe = localStorage.getItem('a2c_remember_me') === 'true';
    const timeout = rememberMe ? 7 * 24 * 60 * 60 * 1000 : IDLE_TIMEOUT_MS;
    const warningAt = timeout - WARNING_BEFORE_MS;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningAt);

    timerRef.current = setTimeout(logout, timeout);
  }, [logout]);

  useEffect(() => {
    resetTimer();
    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, handler, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="text-5xl mb-3">🐧💤</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Still there?</h2>
        <p className="text-gray-600 mb-4">
          You'll be signed out in <span className="font-bold text-red-500">{countdown}</span> seconds due to inactivity.
        </p>
        <div className="flex gap-3">
          <button
            onClick={resetTimer}
            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            I'm Still Here! 🙋
          </button>
          <button
            onClick={logout}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
