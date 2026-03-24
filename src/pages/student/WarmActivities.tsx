import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks';
import {
  getWarmActivities,
  getWarmActivityProgress,
  startWarmActivity,
  completeWarmActivity,
  getBadges,
  getAllBadges,
  getPreferences,
  WarmActivity,
  WarmActivityProgress,
  StudentBadge,
  Badge,
} from '../../services/onboarding.service';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, string> = {
  exploration: 'bg-blue-50 border-blue-300 text-blue-800',
  creative_prompt: 'bg-pink-50 border-pink-300 text-pink-800',
  scavenger_hunt: 'bg-amber-50 border-amber-300 text-amber-800',
  memory_game: 'bg-green-50 border-green-300 text-green-800',
  story: 'bg-violet-50 border-violet-300 text-violet-800',
  choice_board: 'bg-purple-50 border-purple-300 text-purple-800',
};

const TYPE_ICONS: Record<string, string> = {
  exploration: '🔭',
  creative_prompt: '🎨',
  scavenger_hunt: '🔍',
  memory_game: '🧠',
  story: '📖',
  choice_board: '🗳️',
};

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  new: { label: '✨ New', cls: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: '⏳ Started', cls: 'bg-amber-100 text-amber-700' },
  completed: { label: '✅ Done', cls: 'bg-green-100 text-green-700' },
};

/* ------------------------------------------------------------------ */
/*  Memory Game Sub-component                                         */
/* ------------------------------------------------------------------ */

interface MemoryCard {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function MemoryGamePlayer({
  pairs,
  onComplete,
}: {
  pairs: string[];
  onComplete: () => void;
}) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const totalPairs = pairs.length;

  useEffect(() => {
    const deck = pairs
      .flatMap((emoji, i) => [
        { id: i * 2, emoji, flipped: false, matched: false },
        { id: i * 2 + 1, emoji, flipped: false, matched: false },
      ])
      .sort(() => Math.random() - 0.5);
    setCards(deck);
  }, [pairs]);

  const handleFlip = (id: number) => {
    if (selected.length >= 2) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const updated = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    setCards(updated);

    const newSelected = [...selected, id];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected.map((sid) => updated.find((c) => c.id === sid)!);
      if (a.emoji === b.emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)),
          );
          const newCount = matchCount + 1;
          setMatchCount(newCount);
          if (newCount === totalPairs) {
            setTimeout(onComplete, 600);
          }
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c,
            ),
          );
        }, 800);
      }
      setTimeout(() => setSelected([]), 900);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500">
        Matches: {matchCount}/{totalPairs}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl transition-all duration-300 ${
              card.flipped || card.matched
                ? 'bg-white border-2 border-green-300'
                : 'bg-indigo-200 hover:bg-indigo-300'
            } ${card.matched ? 'opacity-50' : ''}`}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Player                                                    */
/* ------------------------------------------------------------------ */

function ActivityPlayer({
  activity,
  onComplete,
}: {
  activity: WarmActivity;
  onComplete: (data: Record<string, unknown>) => void;
}) {
  const [textInput, setTextInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const content = activity.content || {};

  switch (activity.activity_type) {
    case 'exploration':
      return (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex h-40 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            🖼️ Image Placeholder
          </div>
          <div className="flex items-start gap-2">
            <p className="text-gray-700">{(content as Record<string, string>).fun_fact || 'Did you know? Every day is a new adventure!'}</p>
            <button className="flex-shrink-0 text-xl" title="Listen">🔊</button>
          </div>
          <p className="font-medium text-gray-800">
            {(content as Record<string, string>).question || 'What do you think about this?'}
          </p>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Tell us what you think..."
            rows={3}
            className="rounded-xl border-2 border-gray-200 p-3 text-gray-800 focus:border-indigo-400 focus:outline-none resize-none"
          />
          <button
            onClick={() => onComplete({ answer: textInput })}
            disabled={!textInput.trim()}
            className="h-12 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Tell Us! 🗣️
          </button>
        </div>
      );

    case 'creative_prompt':
      return (
        <div className="flex flex-col gap-4 p-4">
          <p className="text-lg font-medium text-gray-800">
            {(content as Record<string, string>).prompt || 'Create something amazing!'}
          </p>
          <div className="flex gap-2">
            {['🎨 Draw/Upload', '🎤 Record', '✍️ Write'].map((tool) => (
              <button
                key={tool}
                className="flex-1 rounded-xl bg-pink-50 py-3 text-sm font-medium text-pink-700 hover:bg-pink-100 transition"
              >
                {tool}
              </button>
            ))}
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Write your creation here..."
            rows={4}
            className="rounded-xl border-2 border-gray-200 p-3 text-gray-800 focus:border-pink-400 focus:outline-none resize-none"
          />
          <button
            onClick={() => onComplete({ creation: textInput })}
            disabled={!textInput.trim()}
            className="h-12 rounded-xl bg-pink-600 font-semibold text-white hover:bg-pink-700 disabled:opacity-50 transition"
          >
            Submit Creation! 🎉
          </button>
        </div>
      );

    case 'scavenger_hunt':
      return (
        <div className="flex flex-col items-center gap-4 p-4 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-lg font-medium text-gray-800">
            {(content as Record<string, string>).hint || 'Look around you… can you find something special?'}
          </p>
          <button
            onClick={() => onComplete({ found: true })}
            className="h-14 w-full rounded-xl bg-amber-500 text-lg font-semibold text-white hover:bg-amber-600 transition active:scale-95"
          >
            I Found It! 🎯
          </button>
        </div>
      );

    case 'memory_game': {
      const gamePairs = ((content as Record<string, string[]>).pairs || ['🐶', '🐱', '🐭', '🐰']) as string[];
      return (
        <div className="p-4">
          <MemoryGamePlayer pairs={gamePairs} onComplete={() => onComplete({ completed: true })} />
        </div>
      );
    }

    case 'choice_board': {
      const choices = ((content as Record<string, Array<{ label: string; description: string }>>).choices || [
        { label: 'Option A', description: 'First choice' },
        { label: 'Option B', description: 'Second choice' },
        { label: 'Option C', description: 'Third choice' },
      ]) as Array<{ label: string; description: string }>;

      return (
        <div className="flex flex-col gap-4 p-4">
          <p className="text-center font-medium text-gray-800">Pick one!</p>
          <div className="flex flex-col gap-3">
            {choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => setSelectedChoice(i)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  selectedChoice === i
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <p className="font-semibold text-gray-800">{choice.label}</p>
                <p className="text-sm text-gray-500">{choice.description}</p>
              </button>
            ))}
          </div>
          {selectedChoice !== null && (
            <button
              onClick={() => onComplete({ choice: selectedChoice })}
              className="h-12 rounded-xl bg-purple-600 font-semibold text-white hover:bg-purple-700 transition"
            >
              That's My Pick! ✨
            </button>
          )}
        </div>
      );
    }

    case 'story':
      return (
        <div className="flex flex-col gap-4 p-4">
          <p className="text-lg text-gray-700 leading-relaxed">
            {(content as Record<string, string>).story_text || 'Once upon a time…'}
          </p>
          <button
            onClick={() => onComplete({ read: true })}
            className="h-12 rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-700 transition"
          >
            Finished Reading! 📚
          </button>
        </div>
      );

    default:
      return <p className="p-4 text-gray-500">Activity type not supported yet.</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WarmActivities() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<WarmActivity[]>([]);
  const [progress, setProgress] = useState<WarmActivityProgress[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<StudentBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  /* -------------------------------------------------------------- */
  /*  Load data                                                      */
  /* -------------------------------------------------------------- */

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const prefs = await getPreferences(user.id);
      const userInterests = prefs?.interests ?? [];
      setInterests(userInterests);

      const [acts, prog, earned, badges] = await Promise.all([
        getWarmActivities(userInterests),
        getWarmActivityProgress(user.id),
        getBadges(user.id),
        getAllBadges(),
      ]);

      setActivities(acts);
      setProgress(prog);
      setEarnedBadges(earned);
      setAllBadges(badges);
    } catch (err) {
      console.error(err);
      setError('Could not load your adventures. Please try again!');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* -------------------------------------------------------------- */
  /*  Derived state                                                  */
  /* -------------------------------------------------------------- */

  const progressMap = useMemo(() => {
    const map = new Map<string, WarmActivityProgress>();
    progress.forEach((p) => map.set(p.activity_id, p));
    return map;
  }, [progress]);

  const totalStars = useMemo(
    () => progress.reduce((sum, p) => sum + (p.stars_earned || 0), 0),
    [progress],
  );

  const completedCount = useMemo(
    () => progress.filter((p) => p.status === 'completed').length,
    [progress],
  );

  const sortedActivities = useMemo(() => {
    // Interest-matched first, then universal
    const matched = activities.filter(
      (a) => a.interests && a.interests.length > 0 && a.interests.some((i) => interests.includes(i)),
    );
    const universal = activities.filter(
      (a) => !a.interests || a.interests.length === 0 || !a.interests.some((i) => interests.includes(i)),
    );
    return [...matched, ...universal];
  }, [activities, interests]);

  const earnedBadgeIds = useMemo(() => new Set(earnedBadges.map((b) => b.badge_id)), [earnedBadges]);

  /* -------------------------------------------------------------- */
  /*  Handlers                                                       */
  /* -------------------------------------------------------------- */

  const handleStart = async (activityId: string) => {
    if (!user?.id) return;
    try {
      await startWarmActivity(user.id, activityId);
      setExpandedId(activityId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (activityId: string, data: Record<string, unknown>) => {
    if (!user?.id) return;
    try {
      await completeWarmActivity(user.id, activityId, data);
      setExpandedId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  /* -------------------------------------------------------------- */
  /*  Loading / Error                                                */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg text-red-600">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); loadData(); }}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Parent view                                                    */
  /* -------------------------------------------------------------- */

  if (isParent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-indigo-800">Explorer Progress 🌟</h1>
          <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-lg text-gray-700">
              Your child is exploring! They've tried{' '}
              <span className="font-bold text-indigo-600">{progress.length}</span> activities and
              earned <span className="font-bold text-amber-600">{earnedBadges.length}</span> badges.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-2xl font-bold text-blue-700">{activities.length}</p>
                <p className="text-sm text-blue-500">Available</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-2xl font-bold text-amber-700">{completedCount}</p>
                <p className="text-sm text-amber-500">Completed</p>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">{totalStars} ⭐</p>
                <p className="text-sm text-green-500">Stars</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Student view                                                   */
  /* -------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold">Your Adventures 🚀</h1>
        <div className="mt-2 flex gap-4 text-sm">
          <span>🏅 {earnedBadges.length} badges</span>
          <span>⭐ {totalStars} stars</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Badges row */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-gray-800">Badges</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {allBadges.length === 0 && (
              <p className="text-sm text-gray-400">No badges available yet.</p>
            )}
            {allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex flex-shrink-0 flex-col items-center gap-1 rounded-xl p-3 ${
                    earned ? 'bg-amber-50' : 'bg-gray-100 opacity-40'
                  }`}
                  title={badge.description}
                >
                  <span className="text-3xl">{badge.icon || '🏅'}</span>
                  <span className="max-w-[80px] truncate text-xs font-medium text-gray-700">
                    {badge.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity grid */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-gray-800">Activities</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedActivities.map((activity) => {
              const prog = progressMap.get(activity.id);
              const status = prog?.status ?? 'new';
              const statusInfo = STATUS_BADGES[status] || STATUS_BADGES.new;
              const colorCls = TYPE_COLORS[activity.activity_type] || TYPE_COLORS.exploration;
              const icon = TYPE_ICONS[activity.activity_type] || '📌';
              const isExpanded = expandedId === activity.id;
              const isCompleted = status === 'completed';

              return (
                <div
                  key={activity.id}
                  className={`relative rounded-2xl border-2 transition-all ${colorCls} ${
                    isCompleted ? 'opacity-75' : ''
                  }`}
                >
                  {isCompleted && (
                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-sm shadow">
                      ✅
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (isCompleted) return;
                      if (isExpanded) {
                        setExpandedId(null);
                      } else {
                        if (status === 'new') handleStart(activity.id);
                        else setExpandedId(activity.id);
                      }
                    }}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold">{activity.title}</h3>
                        <p className="mt-1 text-sm opacity-80">{activity.description}</p>
                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${statusInfo.cls}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && !isCompleted && (
                    <div className="border-t">
                      <ActivityPlayer
                        activity={activity}
                        onComplete={(data) => handleComplete(activity.id, data)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sortedActivities.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-5xl">🌈</span>
              <p className="text-gray-500">No adventures available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
