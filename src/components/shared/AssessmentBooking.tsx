import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks';
import {
  bookAssessment,
  getBookings,
  AssessmentBooking as AssessmentBookingType,
} from './onboarding.service';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AssessmentBookingProps {
  /** Override the student ID (for parents selecting a child). Falls back to current user. */
  studentId?: string;
  /** Optional child name for display. */
  studentName?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AssessmentBooking({ studentId, studentName }: AssessmentBookingProps) {
  const { user } = useAuth();
  const resolvedStudentId = studentId || user?.id || '';
  const parentId = user?.id || '';

  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [bookings, setBookings] = useState<AssessmentBookingType[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  /* -------------------------------------------------------------- */
  /*  Load bookings                                                  */
  /* -------------------------------------------------------------- */

  const loadBookings = useCallback(async () => {
    if (!resolvedStudentId) return;
    try {
      const data = await getBookings(resolvedStudentId);
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [resolvedStudentId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /* -------------------------------------------------------------- */
  /*  Submit                                                         */
  /* -------------------------------------------------------------- */

  const handleSubmit = async () => {
    if (!resolvedStudentId || !parentId || !date || !timeSlot) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await bookAssessment(resolvedStudentId, parentId, date, timeSlot, notes || undefined);
      setSuccess(true);
      setDate('');
      setTimeSlot('');
      setNotes('');
      await loadBookings();
    } catch (err) {
      setError('Could not book the assessment. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Booking Form Card */}
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-bold text-indigo-800">
          Book an Assessment 📅
          {studentName && (
            <span className="ml-1 text-base font-normal text-gray-500">for {studentName}</span>
          )}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Pick a date and time, and Sandra will reach out to confirm.
        </p>

        {/* Alerts */}
        {success && (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-center text-green-700 text-sm">
            ✅ Assessment booked! We'll confirm soon.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-center text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4">
          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-gray-800 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Preferred Time</label>
            <div className="flex flex-col gap-2">
              {TIME_SLOTS.map((slot) => (
                <label
                  key={slot.value}
                  className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 transition-all ${
                    timeSlot === slot.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="timeSlot"
                    value={slot.value}
                    checked={timeSlot === slot.value}
                    onChange={() => setTimeSlot(slot.value)}
                    className="sr-only"
                  />
                  <span className="font-medium">{slot.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Anything Sandra should know?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., learning preferences, concerns, questions..."
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 p-3 text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:outline-none resize-none transition"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!date || !timeSlot || submitting}
            className="h-14 w-full rounded-2xl bg-indigo-600 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {submitting ? 'Booking…' : 'Book Assessment 📅'}
          </button>
        </div>
      </div>

      {/* Existing Bookings */}
      <div className="mt-8">
        <h3 className="mb-3 text-lg font-bold text-gray-800">Existing Bookings</h3>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
            No bookings yet.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
            return (
              <div
                key={b.id}
                className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {new Date(b.requested_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{b.requested_time_slot}</p>
                  {b.notes && <p className="mt-1 text-xs text-gray-400">📝 {b.notes}</p>}
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
  );
}
