// A² Compass – Week 6: Share-a-Win button + modal

import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { shareWin } from '../../services/milestones.service';

interface ShareWinButtonProps {
  studentId: string;
  studentName: string;
  parentId?: string;
  onSent?: () => void;
}

const TITLE_SUGGESTIONS = [
  '🌟 Amazing progress!',
  '🎯 New skill unlocked!',
  '🚀 Big breakthrough today!',
  '💪 Great effort!',
  '🏆 Mastery achieved!',
];

export default function ShareWinButton({
  studentId,
  studentName,
  parentId,
  onSent,
}: ShareWinButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(TITLE_SUGGESTIONS[0]);
  const [message, setMessage] = useState('');
  const [domainCode, setDomainCode] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle(TITLE_SUGGESTIONS[0]);
    setMessage('');
    setDomainCode('');
    setSent(false);
    setError(null);
  }, []);

  const handleOpen = () => {
    resetForm();
    setMessage(`${studentName} had a great moment today — `);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    setError(null);
    try {
      await shareWin(
        user.id,
        studentId,
        parentId ?? null,
        title,
        message,
        undefined,
        domainCode || undefined,
      );
      setSent(true);
      onSent?.();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 transition-colors"
      >
        🎉 Share a Win
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-5xl">🎉</span>
                <h3 className="text-xl font-bold text-gray-800">Win shared!</h3>
                <p className="text-gray-500">
                  {parentId
                    ? `${studentName}'s parent will see this celebration.`
                    : 'The milestone has been recorded.'}
                </p>
                <button
                  onClick={handleClose}
                  className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="mb-4 text-lg font-bold text-gray-800">
                  🎉 Share a Win for {studentName}
                </h2>

                {/* Title */}
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {TITLE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Message */}
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />

                {/* Domain selector */}
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Domain (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. A, B, G …"
                  value={domainCode}
                  onChange={(e) => setDomainCode(e.target.value.toUpperCase())}
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />

                {error && (
                  <p className="mb-3 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !title || !message}
                    className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : '🎉 Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
