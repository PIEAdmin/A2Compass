import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import {
  bookAssessment,
  getBookings,
  AssessmentBooking,
} from './onboarding.service';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PANELS = [
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Welcome to Your Family Hub!',
    body: 'This is your command center for supporting your child\'s learning journey. See their progress, celebrate wins, and stay connected with their growth.',
  },
  {
    emoji: '📈',
    title: 'Growth Timeline',
    body: "Watch your child's journey unfold with milestones, badges, and progress updates. Every step forward is worth celebrating!",
  },
  {
    emoji: '💝',
    title: 'How You Can Help',
    body: '',
    tips: [
      '🏅 Ask about their badges — it makes them proud!',
      '🎉 Celebrate small wins together',
      '📅 Book their assessment when they\'re ready',
      '💬 Talk about what they\'re learning',
    ],
  },
];

const TIME_SLOTS = [
  { label: '☀️ Morning (9 AM – 12 PM)', value: 'morning' },
  { label: '🌤️ Afternoon (12 – 3 PM)', value: 'afternoon' },
  { label: '🌅 Evening (3 – 6 PM)', value: 'evening' },
];

const STATUS_MAP: Record<string, { label: string; emoji: string; cls: string }> = {
  pending: { label: 'Pending', emoji: '🟡', cls: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', emoji: '🟢', cls: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', emoji: '✅', cls: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Cancelled', emoji: '🔴', cls: 'bg-red-100 text-red-800' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ParentOrientation() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [panelIndex, setPanelIndex] = useState(0);
  const [showBooking, setShowBooking] = useState(false);

  // Booking form
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Existing bookings
  const [bookings, setBookings] = useState<AssessmentBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  /* -------------------------------------------------------------- */
  /*  Load existing bookings                                         */
  /* -------------------------------------------------------------- */

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setLoadingBookings(true);
    try {
      const data = await getBookings(user.id);
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (showBooking) loadBookings();
  }, [showBooking, loadBookings]);

  /* -------------------------------------------------------------- */
  /*  Submit booking                                                 */
  /* -------------------------------------------------------------- */

  const handleSubmit = async () => {
    if (!user?.id || !date || !timeSlot) return;
    setSubmitting(true);
    setBookingError(null);
    try {
      await bookAssessment(user.id, user.id, date, timeSlot, notes || undefined);
      setBookingSuccess(true);
      setDate('');
      setTimeSlot('');
      setNotes('');
      await loadBookings();
    } catch (err) {
      setBookingError('Could not book the assessment. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Tour panels                                                    */
  /* -------------------------------------------------------------- */

  if (!showBooking) {
    const panel = PANELS[panelIndex];
    const isLast = panelIndex === PANELS.length - 1;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
          {/* Progress */}
          <div className="mb-4 flex items-center justify-center gap-2">
            {PANELS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === panelIndex ? 'w-8 bg-emerald-600' : 'w-2.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            <span className="text-6xl">{panel.emoji}</span>
            <h2 className="text-2xl font-bold text-emerald-800">{panel.title}</h2>

            {panel.body && <p className="text-gray-600 leading-relaxed">{panel.body}</p>}

            {panel.tips && (
              <ul className="w-full space-y-3 text-left">
                {panel.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="rounded-xl bg-emerald-50 px-4 py-3 text-gray-700"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => {
                if (isLast) setShowBooking(true);
                else setPanelIndex((p) => p + 1);
              }}
              className="mt-4 h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
            >
              {isLast ? "Let's Book the Assessment! 📅" : 'Next →'}
            </button>

            {panelIndex > 0 && (
              <button
                onClick={() => setPanelIndex((p) => p - 1)}
                className="text-sm text-emerald-500 hover:text-emerald-700"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Booking form                                                   */
  /* -------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-4 pt-12">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <h2 className="text-center text-2xl font-bold text-emerald-800">
            Book an Assessment 📅
          </h2>
          <p className="mt-2 text-center text-gray-500">
            Ready to book your child's learning assessment? Pick a date and time that works for you.
          </p>

          {bookingSuccess && (
            <div className="mt-4 rounded-xl bg-green-50 p-4 text-center text-green-700">
              ✅ Assessment booked successfully! Sandra will confirm soon.
            </div>
          )}

          {bookingError && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-center text-red-600">
              {bookingError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-5">
            {/* Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preferred Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-gray-800 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Preferred Time
              </label>
              <div className="flex flex-col gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.value}
                    onClick={() => setTimeSlot(slot.value)}
                    className={`h-12 rounded-xl border-2 text-left px-4 font-medium transition-all ${
                      timeSlot === slot.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Anything Sandra should know? (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., my child is shy at first, prefers mornings..."
                rows={3}
                className="w-full rounded-xl border-2 border-gray-200 p-3 text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!date || !timeSlot || submitting}
              className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {submitting ? 'Booking…' : 'Book Assessment 📅'}
            </button>
          </div>
        </div>

        {/* Existing bookings */}
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-bold text-gray-800">Your Bookings</h3>

          {loadingBookings && (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-6 w-6 rounded-full border-3 border-emerald-300 border-t-emerald-600" />
            </div>
          )}

          {!loadingBookings && bookings.length === 0 && (
            <p className="text-sm text-gray-400">No bookings yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {bookings.map((b) => {
              const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {new Date(b.requested_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{b.requested_time_slot}</p>
                    {b.notes && (
                      <p className="mt-1 text-xs text-gray-400">📝 {b.notes}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>
                    {st.emoji} {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
