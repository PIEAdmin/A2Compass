import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { usePlaylist } from '../../hooks/useSkills';
import { supabase } from '../../services/supabase';
import {
  PepperPenguin,
  FloatingStars,
  ConfettiBurst,
} from '../../components/shared/Illustrations';
import { ReadAloud } from '../../components/shared/ReadAloud';

/* ═══════════════════════════════════════════════════════════
   🌲  A² COMPASS — STUDENT DASHBOARD (My Subjects)
   Kid-friendly, tier-themed, gamified dashboard
   ═══════════════════════════════════════════════════════════ */

// ───── Tier Themes ─────
type TierKey = 'explorers' | 'scholars' | 'collegium';

interface TierTheme {
  name: string;
  icon: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  bgPattern: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  headerBg: string;
}

const TIER_THEMES: Record<TierKey, TierTheme> = {
  explorers: {
    name: "Explorers' Camp",
    icon: '🌲',
    primary: '#2E7D32',
    secondary: '#F57C00',
    accent: '#FFEB3B',
    bg: '#FFF8E7',
    bgPattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232E7D32' fill-opacity='0.04'%3E%3Cpath d='M30 10 L25 25 L35 25 Z'/%3E%3Ccircle cx='15' cy='45' r='3'/%3E%3Ccircle cx='45' cy='40' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    gradientFrom: '#2E7D32',
    gradientVia: '#43A047',
    gradientTo: '#66BB6A',
    headerBg: 'linear-gradient(135deg, #2E7D32 0%, #43A047 50%, #66BB6A 100%)',
  },
  scholars: {
    name: "Scholars' Guild",
    icon: '📚',
    primary: '#1A237E',
    secondary: '#7B1FA2',
    accent: '#FFD700',
    bg: '#F3E5F5',
    bgPattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A237E' fill-opacity='0.04'%3E%3Crect x='20' y='15' width='12' height='16' rx='2'/%3E%3Crect x='35' y='30' width='10' height='14' rx='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    gradientFrom: '#1A237E',
    gradientVia: '#283593',
    gradientTo: '#3F51B5',
    headerBg: 'linear-gradient(135deg, #1A237E 0%, #283593 50%, #5C6BC0 100%)',
  },
  collegium: {
    name: 'The Collegium',
    icon: '🧭',
    primary: '#0D47A1',
    secondary: '#880E4F',
    accent: '#FFD700',
    bg: '#F5F5F5',
    bgPattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230D47A1' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3Cline x1='30' y1='20' x2='30' y2='40' stroke='%230D47A1' stroke-width='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    gradientFrom: '#0D47A1',
    gradientVia: '#1565C0',
    gradientTo: '#1976D2',
    headerBg: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)',
  },
};

function getTierFromGrade(grade: number | null): TierKey {
  if (!grade || grade <= 6) return 'explorers';
  if (grade <= 9) return 'scholars';
  return 'collegium';
}

// ───── Level System ─────
interface Level {
  level: number;
  title: string;
  emoji: string;
  pointsNeeded: number;
}

const LEVELS: Level[] = [
  { level: 1, title: 'Explorer', emoji: '🌱', pointsNeeded: 0 },
  { level: 2, title: 'Adventurer', emoji: '🎒', pointsNeeded: 500 },
  { level: 3, title: 'Navigator', emoji: '🧭', pointsNeeded: 1500 },
  { level: 4, title: 'Pioneer', emoji: '🚀', pointsNeeded: 3000 },
  { level: 5, title: 'Master Explorer', emoji: '👑', pointsNeeded: 5000 },
];

function getLevel(points: number): Level & { progress: number; nextLevel: Level | null } {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.pointsNeeded) current = l;
    else break;
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  const progress = next
    ? ((points - current.pointsNeeded) / (next.pointsNeeded - current.pointsNeeded)) * 100
    : 100;
  return { ...current, progress: Math.min(100, Math.max(0, progress)), nextLevel: next };
}

// ───── Helpers ─────
function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function getStreakEmoji(streak: number): string {
  if (streak >= 3) return '🔥';
  if (streak >= 1) return '🕯️';
  return '💤';
}

function getStreakSize(streak: number): string {
  if (streak >= 7) return 'text-3xl animate-pulse';
  if (streak >= 3) return 'text-2xl';
  return 'text-xl';
}

const pepperGreetings = [
  "Let's explore today!",
  "Ready for an adventure?",
  "You're going to do great!",
  "Let's learn something new!",
  "Today is YOUR day!",
  "Let's fly!",
  "Every day is a discovery!",
];

function randomGreeting() {
  return pepperGreetings[Math.floor(Math.random() * pepperGreetings.length)];
}


// ───── Age-Appropriate Timing ─────
interface AgeTimingBlock {
  emoji: string;
  label: string;
  duration: string;
  type: 'activity' | 'break' | 'recess';
}

function getAgeTiming(grade: number | null): { totalTime: string; taskTime: string; blocks: AgeTimingBlock[] } {
  const g = grade ?? 0;
  if (g <= 0) {
    // Pre-K / Kindergarten: 30-60 min total, 5-10 min tasks
    return {
      totalTime: '30–60 min',
      taskTime: '5–10 min each',
      blocks: [
        { emoji: '📖', label: 'Reading Fun', duration: '10 min', type: 'activity' },
        { emoji: '🎨', label: 'Creative Break', duration: '5 min', type: 'break' },
        { emoji: '🔢', label: 'Number Play', duration: '10 min', type: 'activity' },
        { emoji: '🏃', label: 'Move & Play!', duration: '5 min', type: 'recess' },
        { emoji: '🎵', label: 'Letters & Sounds', duration: '10 min', type: 'activity' },
      ],
    };
  }
  if (g <= 2) {
    // 1st-2nd: 60-90 min total, 10-15 min tasks
    return {
      totalTime: '60–90 min',
      taskTime: '10–15 min each',
      blocks: [
        { emoji: '📖', label: 'Reading', duration: '15 min', type: 'activity' },
        { emoji: '☕', label: 'Snack Break', duration: '5 min', type: 'break' },
        { emoji: '🧮', label: 'Math', duration: '15 min', type: 'activity' },
        { emoji: '🏃', label: 'Move & Play!', duration: '10 min', type: 'recess' },
        { emoji: '✏️', label: 'Writing', duration: '15 min', type: 'activity' },
        { emoji: '🎨', label: 'Fun Time', duration: '10 min', type: 'break' },
        { emoji: '🌍', label: 'Explore', duration: '15 min', type: 'activity' },
      ],
    };
  }
  if (g <= 4) {
    // 3rd-4th: 2-3 hrs, 15-20 min tasks
    return {
      totalTime: '2–3 hours',
      taskTime: '15–20 min each',
      blocks: [
        { emoji: '📖', label: 'Reading', duration: '20 min', type: 'activity' },
        { emoji: '🧮', label: 'Math', duration: '20 min', type: 'activity' },
        { emoji: '🏃', label: 'Movement Break', duration: '15 min', type: 'recess' },
        { emoji: '✏️', label: 'Writing', duration: '20 min', type: 'activity' },
        { emoji: '☕', label: 'Snack Break', duration: '10 min', type: 'break' },
        { emoji: '🔬', label: 'Science / Social', duration: '20 min', type: 'activity' },
        { emoji: '🎨', label: 'Creative Time', duration: '15 min', type: 'break' },
      ],
    };
  }
  // 5th-6th: 3-4 hrs, 20-30 min tasks
  return {
    totalTime: '3–4 hours',
    taskTime: '20–30 min each',
    blocks: [
      { emoji: '📖', label: 'Reading / ELA', duration: '30 min', type: 'activity' },
      { emoji: '🧮', label: 'Math', duration: '30 min', type: 'activity' },
      { emoji: '🏃', label: 'Movement Break', duration: '15 min', type: 'recess' },
      { emoji: '✏️', label: 'Writing', duration: '25 min', type: 'activity' },
      { emoji: '☕', label: 'Lunch Break', duration: '15 min', type: 'break' },
      { emoji: '🔬', label: 'Science', duration: '25 min', type: 'activity' },
      { emoji: '🌍', label: 'Social Studies', duration: '20 min', type: 'activity' },
    ],
  };
}

// ───── Subject Zones ─────
interface WorldZone {
  domainName: string;
  emoji: string;
  zoneName: string;
  color: string;
}

const WORLD_ZONES: WorldZone[] = [
  { domainName: 'Phonological Awareness', emoji: '🎵', zoneName: 'Sound Garden', color: '#8B5CF6' },
  { domainName: 'Phonics', emoji: '🔤', zoneName: 'Letter Land', color: '#3B82F6' },
  { domainName: 'Vocabulary', emoji: '📖', zoneName: 'Word World', color: '#10B981' },
  { domainName: 'Reading Comprehension', emoji: '📚', zoneName: 'Story Castle', color: '#F59E0B' },
  { domainName: 'Writing', emoji: '✏️', zoneName: 'Writing Workshop', color: '#EF4444' },
  { domainName: 'Number Sense', emoji: '🔢', zoneName: 'Number Mountain', color: '#6366F1' },
  { domainName: 'Operations', emoji: '➕', zoneName: 'Math Lab', color: '#EC4899' },
  { domainName: 'Geometry & Measurement', emoji: '📐', zoneName: 'Shape City', color: '#14B8A6' },
  { domainName: 'Data & Patterns', emoji: '📊', zoneName: 'Pattern Park', color: '#F97316' },
  { domainName: 'Daily Living Skills', emoji: '🏠', zoneName: 'Life Skills Lodge', color: '#84CC16' },
  { domainName: 'Social-Emotional Learning', emoji: '💛', zoneName: 'Kindness Corner', color: '#E879F9' },
  { domainName: 'Heritage Spanish', emoji: '🇪🇸', zoneName: 'Spanish Village', color: '#C2591A' },
];

// ───── Animation Styles ─────
function DashboardAnimationStyles({ theme }: { theme: TierTheme }) {
  return (
    <style>{`
      :root {
        --tier-primary: ${theme.primary};
        --tier-secondary: ${theme.secondary};
        --tier-accent: ${theme.accent};
        --tier-bg: ${theme.bg};
      }
      @keyframes slideInLeft {
        0% { transform: translateX(-80px) scale(0.8); opacity: 0; }
        60% { transform: translateX(6px) scale(1.03); opacity: 1; }
        100% { transform: translateX(0) scale(1); opacity: 1; }
      }
      @keyframes bounceIn {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.12); }
        70% { transform: scale(0.96); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fadeInUp {
        0% { transform: translateY(20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes sparkle {
        0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes flame {
        0%, 100% { transform: scaleY(1) scaleX(1); }
        25% { transform: scaleY(1.15) scaleX(0.9); }
        50% { transform: scaleY(0.95) scaleX(1.05); }
        75% { transform: scaleY(1.1) scaleX(0.95); }
      }
      @keyframes cardEnter {
        0% { transform: translateY(15px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes firework {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.8; }
        100% { transform: scale(1.5); opacity: 0; }
      }
      .anim-slide-in-left { animation: slideInLeft 0.6s ease-out both; }
      .anim-bounce-in { animation: bounceIn 0.5s ease-out both; }
      .anim-fade-in-up { animation: fadeInUp 0.5s ease-out both; }
      .anim-sparkle { animation: sparkle 2s ease-in-out infinite; }
      .anim-shimmer {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        background-size: 200% 100%;
        animation: shimmer 2s ease-in-out infinite;
      }
      .anim-flame { animation: flame 0.8s ease-in-out infinite; transform-origin: bottom center; }
      .anim-card-enter { animation: cardEnter 0.4s ease-out both; }
      .anim-firework { animation: firework 0.8s ease-out both; }

      .dashboard-card {
        border-radius: 1.25rem;
        border: 2px solid transparent;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: all 0.2s ease;
      }
      .dashboard-card:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        transform: translateY(-2px);
      }
      @keyframes pepperFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      .pepper-float { animation: pepperFloat 3s ease-in-out infinite; }
      .dashboard-card:active {
        transform: scale(0.98);
      }

      .tier-bg {
        background-color: var(--tier-bg);
        background-image: ${theme.bgPattern};
        
        @keyframes swim {
          0% { transform: translateX(0px) scaleX(1); }
          100% { transform: translateX(30px) scaleX(-1); }
        }
      }

      .progress-bar-fill {
        background: linear-gradient(90deg, var(--tier-primary), var(--tier-secondary), var(--tier-primary));
        background-size: 200% 100%;
        animation: shimmer 3s ease-in-out infinite;
        border-radius: 9999px;
        transition: width 0.8s ease;
      }

      @media (max-width: 768px) {
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: white;
          border-top: 2px solid #e5e7eb;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
          padding: 6px 0 env(safe-area-inset-bottom, 6px);
        }
        .dashboard-main-content {
          padding-bottom: 80px;
        }
      }
    `}</style>
  );
}

// ═══════════════════════════════════════════
//  MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════
export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.id || '';
  const studentName = user?.fullName?.split(' ')[0] || 'Explorer';
  const { items, loading } = usePlaylist(studentId);

  // State
  const [sparkPoints, setSparkPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [pepperSpeech, setPepperSpeech] = useState(randomGreeting());
  const [checkinCelebrating, setCheckinCelebrating] = useState(false);
  const [scheduleData, setScheduleData] = useState<{ start: string; end: string; breaks: { time: string; label: string }[] } | null>(null);
  const [domainMastery, setDomainMastery] = useState<Record<string, number>>({});
  const [upcomingAssessments, setUpcomingAssessments] = useState<any[]>([]);
  const [yesterdayIncomplete, setYesterdayIncomplete] = useState<any[]>([]);
  const [playlistAutoGenerated, setPlaylistAutoGenerated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPepperHelp, setShowPepperHelp] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [pepperTip, setPepperTip] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionMood, setReflectionMood] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [selectedColorTheme, setSelectedColorTheme] = useState(() => localStorage.getItem('a2c_color_theme') || 'auto');

  // ───── Seasonal/Holiday Awareness ─────
  const getSeasonalInfo = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

    // Check holidays first (approximate dates)
    const holidays: { check: boolean; name: string; emoji: string; decor: string[]; colors: string[] }[] = [
      { check: month === 0 && day >= 15 && day <= 21, name: "MLK Day", emoji: "✊", decor: ["🕊️","✊","💫","🌍"], colors: ["#4A90D9","#FFD700"] },
      { check: month === 1 && day >= 1 && day <= 14, name: "Valentine's Day", emoji: "💝", decor: ["💝","💕","🌹","💌"], colors: ["#E91E63","#F48FB1"] },
      { check: month === 1 && day >= 1 && day <= 28, name: "Black History Month", emoji: "✊🏿", decor: ["✊🏿","📖","🌍","⭐"], colors: ["#4A4A4A","#FFD700"] },
      { check: month === 2 && day >= 14 && day <= 17, name: "St. Patrick's Day", emoji: "☘️", decor: ["☘️","🌈","🍀","💚"], colors: ["#2E7D32","#81C784"] },
      { check: month === 3 && day >= 22, name: "Earth Day", emoji: "🌍", decor: ["🌍","🌱","♻️","🌿"], colors: ["#2E7D32","#1B5E20"] },
      { check: month === 4 && day >= 1 && day <= 5, name: "Cinco de Mayo", emoji: "🎉", decor: ["🎉","🇲🇽","🌮","💃"], colors: ["#D32F2F","#388E3C"] },
      { check: month === 4 && day >= 5 && day <= 12, name: "Mother's Day Week", emoji: "💐", decor: ["💐","🌷","💕","🌸"], colors: ["#E91E63","#CE93D8"] },
      { check: month === 5 && day >= 19, name: "Juneteenth", emoji: "✊🏿", decor: ["✊🏿","🌟","🔔","⭐"], colors: ["#D32F2F","#1B5E20"] },
      { check: month === 6 && day >= 1 && day <= 4, name: "Independence Day", emoji: "🇺🇸", decor: ["🇺🇸","🎆","⭐","🗽"], colors: ["#1565C0","#D32F2F"] },
      { check: month === 8 && day >= 15 && day <= 30, name: "Hispanic Heritage", emoji: "🌎", decor: ["🌎","💃","🎶","🌺"], colors: ["#D32F2F","#FF8F00"] },
      { check: month === 9 && day >= 25 && day <= 31, name: "Halloween", emoji: "🎃", decor: ["🎃","👻","🦇","🕸️"], colors: ["#FF6F00","#4A148C"] },
      { check: month === 10 && day >= 1 && day <= 11, name: "Veterans Day", emoji: "🎖️", decor: ["🎖️","🇺🇸","⭐","🦅"], colors: ["#1565C0","#B71C1C"] },
      { check: month === 10 && day >= 20 && day <= 28, name: "Thanksgiving", emoji: "🦃", decor: ["🦃","🍂","🌽","🥧"], colors: ["#E65100","#795548"] },
      { check: month === 11 && day >= 1 && day <= 31, name: "Holiday Season", emoji: "🎄", decor: ["🎄","⭐","❄️","🎁"], colors: ["#D32F2F","#2E7D32"] },
    ];
    const holiday = holidays.find(h => h.check);
    if (holiday) return { name: holiday.name, emoji: holiday.emoji, decor: holiday.decor, colors: holiday.colors };

    // Seasons
    if (month >= 2 && month <= 4) return { name: "Spring", emoji: "🌸", decor: ["🌸","🦋","🌷","🌈","🐝"], colors: ["#E91E63","#81C784"] };
    if (month >= 5 && month <= 7) return { name: "Summer", emoji: "☀️", decor: ["☀️","🏖️","🍦","🌊","🐚"], colors: ["#FF8F00","#0288D1"] };
    if (month >= 8 && month <= 10) return { name: "Fall", emoji: "🍂", decor: ["🍂","🍎","🌾","🍁","🎃"], colors: ["#E65100","#795548"] };
    return { name: "Winter", emoji: "❄️", decor: ["❄️","⛄","🧤","🌟","☃️"], colors: ["#1565C0","#90CAF9"] };
  };

  const seasonal = getSeasonalInfo();

  // ───── Save Daily Reflection ─────
  const saveReflection = async () => {
    if (!reflectionMood) return;
    try {
      const studentId = user?.student_profile_id || user?.id;
      await supabase.from('activity_log').insert({
        student_id: studentId,
        activity_type: 'daily_reflection',
        activity_name: 'Daily Reflection',
        details: { mood: reflectionMood, text: reflectionText, date: new Date().toISOString().split('T')[0] },
        metadata: { mood: reflectionMood, journal_entry: reflectionText },
      });
      setReflectionSaved(true);
      setTimeout(() => { setShowReflection(false); setReflectionSaved(false); }, 2000);
    } catch (e) { console.error('Reflection save error:', e); }
  };

  // ───── Theme Picker ─────
  const colorThemes = [
    { id: 'auto', label: 'Auto (Seasonal)', emoji: '🌈' },
    { id: 'ocean', label: 'Ocean Blue', emoji: '🌊' },
    { id: 'forest', label: 'Forest Green', emoji: '🌲' },
    { id: 'sunset', label: 'Sunset Orange', emoji: '🌅' },
    { id: 'galaxy', label: 'Galaxy Purple', emoji: '🌌' },
    { id: 'candy', label: 'Candy Pink', emoji: '🍬' },
    { id: 'arctic', label: 'Arctic Ice', emoji: '🧊' },
  ];
  const handleColorThemeChange = (id: string) => {
    setSelectedColorTheme(id);
    localStorage.setItem('a2c_color_theme', id);
  };

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const dateDisplay = currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeDisplay = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });


  // Welcome animation state
  const [animPhase, setAnimPhase] = useState(0);
  const [welcomePlayed, setWelcomePlayed] = useState(false);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);


  // ───── Pepper Help System ─────
  const pepperTips = [
    "Take your time — there\'s no rush! 🐢",
    "If it\'s hard, that means you\'re learning! 💪",
    "Try reading the question out loud! 🗣️",
    "You can always take a break and come back! ☕",
    "Remember: mistakes help your brain grow! 🧠",
    "You\'re doing amazing — keep going! 🌟",
    "Try breaking big problems into small steps! 🧩",
    "Don\'t forget to drink water! 💧",
  ];

  const showRandomTip = () => {
    setPepperTip(pepperTips[Math.floor(Math.random() * pepperTips.length)]);
    setShowPepperHelp(true);
    setHelpSent(false);
  };

  const sendHelpRequest = async () => {
    try {
      // Log help request so parent/teacher can see it
      await supabase.from('activity_log').insert({
        student_id: studentId,
        activity_type: 'help_request',
        activity_name: 'Student asked Pepper for help',
        details: { message: 'Student needs assistance', timestamp: new Date().toISOString() },
      });
      // Also try to create a message for parent
      if (studentProfileId) {
        await supabase.from('messages').insert({
          sender_id: studentId,
          recipient_id: studentId, // Will be picked up by parent viewing student
          subject: '🐧 Help Request from ' + studentName,
          body: studentName + ' asked Pepper for help. Please check in when you can!',
          message_type: 'help_request',
        }).then(() => {});
      }
      setHelpSent(true);
    } catch (err) {
      console.error('Failed to send help request:', err);
      setHelpSent(true); // Show success anyway so kid isn\'t worried
    }
  };

  const greeting = getGreeting();
  const tierKey = getTierFromGrade(gradeLevel);
  const theme = TIER_THEMES[tierKey];
  const levelInfo = getLevel(sparkPoints);

  // ───── Data Loading ─────
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      // 1. Get student_profile
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('id, grade_level, tier_id, theme_color, school_start_time, school_end_time, break_times')
        .eq('user_id', studentId)
        .maybeSingle();

      if (profile) {
        setStudentProfileId(profile.id);
        setGradeLevel(profile.grade_level);

        // Schedule
        if (profile.school_start_time || profile.school_end_time) {
          setScheduleData({
            start: profile.school_start_time || '08:00',
            end: profile.school_end_time || '15:00',
            breaks: Array.isArray(profile.break_times)
              ? profile.break_times.map((b: any) =>
                  typeof b === 'object'
                    ? { time: b.time || '', label: b.label || 'Break' }
                    : { time: String(b), label: 'Break' }
                )
              : [],
          });
        }

        // 2. Spark points
        const { data: spRows } = await supabase
          .from('spark_points')
          .select('amount')
          .eq('student_profile_id', profile.id);
        if (spRows && spRows.length > 0) {
          const total = spRows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
          setSparkPoints(total);
        }

        // 3. Mastery data for subjects
        const [masteryRes, skillNodesRes, domainsRes] = await Promise.all([
          supabase
            .from('student_mastery')
            .select('skill_node_id, mastery_level, attempts')
            .eq('student_profile_id', profile.id),
          supabase
            .from('skill_nodes')
            .select('id, skill_domain_id, display_name'),
          supabase
            .from('skill_domains')
            .select('id, name'),
        ]);

        const masteryData = masteryRes.data || [];
        const skillNodes = skillNodesRes.data || [];
        const domains = domainsRes.data || [];

        // Build mastery % per domain name
        const domainMap: Record<string, string> = {};
        for (const d of domains) domainMap[d.id] = d.name;

        const domainSkillCounts: Record<string, number> = {};
        const domainMasteredCounts: Record<string, number> = {};

        const masteryByNode: Record<string, number> = {};
        for (const m of masteryData) {
          masteryByNode[m.skill_node_id] = m.mastery_level ?? 0;
        }

        for (const node of skillNodes) {
          const dName = domainMap[node.skill_domain_id];
          if (!dName) continue;
          domainSkillCounts[dName] = (domainSkillCounts[dName] || 0) + 1;
          const mLevel = masteryByNode[node.id] ?? 0;
          if (mLevel >= 0.8) {
            domainMasteredCounts[dName] = (domainMasteredCounts[dName] || 0) + 1;
          }
        }

        const computed: Record<string, number> = {};
        for (const dName of Object.keys(domainSkillCounts)) {
          const total = domainSkillCounts[dName];
          const mastered = domainMasteredCounts[dName] || 0;
          computed[dName] = total > 0 ? Math.round((mastered / total) * 100) : 0;
        }
        setDomainMastery(computed);
      }

      // 3b. Upcoming assessments (next 7 days)
        const { data: upcomingSessions } = await supabase
          .from('assessment_sessions')
          .select('id, created_at, status, skills_assessed, target_skill_ids')
          .eq('student_id', studentId)
          .eq('status', 'scheduled')
          .order('created_at', { ascending: true })
          .limit(5);
        if (upcomingSessions) setUpcomingAssessments(upcomingSessions);

        // 3c. Yesterday's incomplete activities
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const { data: yesterdayLogs } = await supabase
          .from('activity_log')
          .select('id, activity_name, activity_type, details, created_at')
          .eq('student_id', studentId)
          .gte('created_at', yesterdayStr + 'T00:00:00')
          .lt('created_at', yesterdayStr + 'T23:59:59')
          .limit(10);
        if (yesterdayLogs) {
          // Show activities from yesterday as "pick up where you left off"
          const incomplete = yesterdayLogs.filter((l: any) =>
            l.activity_type !== 'completed' && l.activity_type !== 'attendance_checkin'
          ).slice(0, 3);
          setYesterdayIncomplete(incomplete);
        }

      // 4. Attendance streak
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('date, status')
        .in('student_id', [studentId, studentProfileId].filter(Boolean))
        .order('date', { ascending: false })
        .limit(60);

      if (attendanceRecords && attendanceRecords.length > 0) {
        const todayRecord = attendanceRecords.find((r: any) => r.date === todayStr);
        if (todayRecord) setCheckedIn(true);

        let s = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 60; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const found = attendanceRecords.find((r: any) => r.date === dateStr && r.status !== 'absent');
          if (found) { s++; } else if (i > 0) { break; }
        }
        setStreak(s);
      } else {
        const { data: logs } = await supabase
          .from('activity_log')
          .select('created_at, activity_type')
          .eq('student_id', studentId)
          .eq('activity_type', 'attendance_checkin')
          .order('created_at', { ascending: false })
          .limit(30);

        if (logs && logs.length > 0) {
          const todayLog = logs.find((l: any) => l.created_at?.startsWith(todayStr));
          if (todayLog) setCheckedIn(true);

          let s = 0;
          const seen = new Set<string>();
          for (const log of logs) {
            const d = log.created_at?.split('T')[0];
            if (d) seen.add(d);
          }
          const today2 = new Date();
          today2.setHours(0, 0, 0, 0);
          for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today2);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr2 = checkDate.toISOString().split('T')[0];
            if (seen.has(dateStr2)) { s++; } else if (i > 0) { break; }
          }
          setStreak(s);
        }
      }

      // Auto-dismiss welcome if already seen today
      const lastWelcome = localStorage.getItem(`a2c_welcome_${todayStr}`);
      if (lastWelcome) {
        setShowWelcome(false);
        setWelcomePlayed(true);
      }
    })();
  }, [studentId]);

  // ───── Welcome Animation ─────
  const playWelcomeAnimation = useCallback(() => {
    animTimersRef.current.forEach(clearTimeout);
    animTimersRef.current = [];
    setAnimPhase(0);
    setShowConfetti(true);
    setPepperSpeech(randomGreeting());

    const t1 = setTimeout(() => setAnimPhase(1), 100);
    const t2 = setTimeout(() => setAnimPhase(2), 700);
    const t3 = setTimeout(() => setAnimPhase(3), 1700);
    const t4 = setTimeout(() => setShowConfetti(false), 3500);
    animTimersRef.current = [t1, t2, t3, t4];
  }, []);

  useEffect(() => {
    if (showWelcome && !welcomePlayed && !loading) {
      setWelcomePlayed(true);
      playWelcomeAnimation();
    }
  }, [showWelcome, loading, welcomePlayed, playWelcomeAnimation]);

  useEffect(() => {
    return () => { animTimersRef.current.forEach(clearTimeout); };
  }, []);

  // ───── Auto-generate playlist if empty ─────
  useEffect(() => {
    if (loading || playlistAutoGenerated || !studentId) return;
    if (items.length === 0) {
      // No playlist items — auto-generate from mastery data
      (async () => {
        try {
          const { generatePlaylist } = await import('../../services/skills.service');
          await generatePlaylist(studentId);
          setPlaylistAutoGenerated(true);
          console.log('📋 Auto-generated daily playlist (was empty)');
          // Playlist hook will auto-refresh on next render
        } catch (e) {
          console.error('Auto-playlist generation error:', e);
          setPlaylistAutoGenerated(true); // Don't retry endlessly
        }
      })();
    }
  }, [loading, items.length, studentId, playlistAutoGenerated]);

  // ───── Computed Data ─────
  const todayItems = useMemo(() => items.filter(i => i.status !== 'completed' && i.status !== 'skipped'), [items]);
  const completedToday = useMemo(() => items.filter(i => i.status === 'completed'), [items]);
  const totalGoal = Math.max(3, todayItems.length);
  const completedCount = completedToday.length;

  // ───── Check In ─────
  const handleCheckIn = async () => {
    setCheckedIn(true);
    setCheckinCelebrating(true);
    setShowConfetti(true);
    setPepperSpeech("You're here! Let's go! 🎉");
    setTimeout(() => { setShowConfetti(false); setCheckinCelebrating(false); }, 3000);

    const todayStr = new Date().toISOString().split('T')[0];

    // Use studentProfileId for attendance (FK matches student_profiles.id)
    const attId = studentProfileId || studentId;
    const { error: attErr } = await supabase.from('attendance_records').upsert({
      student_id: attId,
      date: todayStr,
      check_in_time: new Date().toISOString(),
      check_in_method: 'self',
      status: 'present',
    }, { onConflict: 'student_id,date' });
    if (attErr) {
      console.error('❌ Attendance save failed:', attErr);
      // Retry with auth UUID if profile ID failed
      if (attId !== studentId) {
        await supabase.from('attendance_records').upsert({
          student_id: studentId,
          date: todayStr,
          check_in_time: new Date().toISOString(),
          check_in_method: 'self',
          status: 'present',
        }, { onConflict: 'student_id,date' });
      }
    } else {
      console.log('✅ Attendance saved for', todayStr);
    }

    await supabase.from('activity_log').insert({
      student_id: studentId,
      activity_type: 'attendance_checkin',
      activity_name: 'Daily Check-In',
      details: { date: todayStr },
    });

    // Award +5 Spark Points for daily login
    if (studentProfileId) {
      await supabase.from('spark_points').insert({
        student_profile_id: studentProfileId,
        amount: 5,
        reason: 'daily_login',
        details: { date: todayStr },
      });
      setSparkPoints(prev => prev + 5);
    }

    setStreak(prev => prev + 1);
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`a2c_welcome_${todayStr}`, 'true');
  };

  const formatTime12 = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  // ───── Loading State ─────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] tier-bg">
        <div className="text-center">
          <PepperPenguin mood="thinking" size={120} />
          <p className="mt-4 text-lg text-gray-600 animate-pulse font-display font-bold">
            Packing your backpack...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tier-bg min-h-screen dashboard-main-content">
      <DashboardAnimationStyles theme={theme} />
      {showConfetti && <ConfettiBurst active />}

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">

        {/* ════════ TIER HEADER BAR ════════ */}
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between text-white shadow-lg"
          style={{ background: theme.headerBg }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{theme.icon}</span>
            <ReadAloud text={theme.name} showIcon={false}>
              <span className="font-display font-bold text-lg tracking-wide">{theme.name}</span>
            </ReadAloud>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <span className="text-lg">🪙</span>
              <span className="font-bold">{sparkPoints}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
              <span className="text-lg">{levelInfo.emoji}</span>
              <span className="font-bold text-sm">Lv.{levelInfo.level}</span>
            </div>
          </div>
        </div>

        {/* ════════ PEPPER WELCOME BANNER ════════ */}
        {showWelcome && (
          <div
            className="rounded-3xl p-5 text-white relative overflow-hidden shadow-xl"
            style={{ background: theme.headerBg }}
          >
            <FloatingStars count={8} />
            {animPhase >= 1 && (
              <>
                <span className="absolute top-3 right-8 text-xl anim-sparkle" style={{ animationDelay: '0s' }}>✨</span>
                <span className="absolute top-8 right-20 text-lg anim-sparkle" style={{ animationDelay: '0.5s' }}>⭐</span>
                <span className="absolute bottom-4 right-12 text-xl anim-sparkle" style={{ animationDelay: '1s' }}>💫</span>
              </>
            )}
            <div className="flex items-center gap-4 relative z-10">
              <div
                className={`cursor-pointer transform hover:scale-110 transition-transform flex-shrink-0
                  ${animPhase >= 1 ? 'anim-slide-in-left' : 'opacity-0'}`}
                onClick={playWelcomeAnimation}
                title="Tap Pepper to replay!"
              >
                <PepperPenguin mood="waving" size={100} speech={animPhase >= 2 ? pepperSpeech : undefined} />
              </div>
              <div className="flex-1 min-w-0">
                {animPhase >= 2 ? (
                  <div className="anim-bounce-in">
                    <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
                      <ReadAloud
                        text={`${greeting.text}, ${studentName}! ${pepperSpeech}`}
                        autoRead={true}
                        showIcon={false}
                      >
                        <h1 className="text-2xl md:text-3xl font-display font-bold">
                          {greeting.emoji} {greeting.text}, {studentName}!
                        </h1>
                      </ReadAloud>
                      <p className="text-white/80 mt-1">{formatDate()}</p>
                      {animPhase >= 3 && (
                        <div className="anim-fade-in-up mt-2">
                          <ReadAloud
                            text={`Today's goal: Complete ${totalGoal} activities. You've done ${completedCount} so far!`}
                            showIcon={true}
                            iconSize="sm"
                          >
                            <p className="text-white/80">
                              🎯 Today&apos;s goal: <span className="font-bold">{totalGoal} activities</span>
                              {completedCount > 0 && <> — <span className="font-bold" style={{ color: theme.accent }}>{completedCount} done!</span></>}
                            </p>
                          </ReadAloud>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-24" />
                )}
              </div>
            </div>
            <button
              onClick={dismissWelcome}
              className="absolute top-3 right-3 text-white/50 hover:text-white/90 text-sm z-20 bg-white/10 rounded-full px-3 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ════════ STATS ROW ════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="dashboard-card bg-white p-3 text-center anim-card-enter" style={{ animationDelay: '0.05s' }}>
            <div className="text-2xl">🪙</div>
            <div className="text-xl font-display font-bold" style={{ color: theme.primary }}>{sparkPoints}</div>
            <ReadAloud text={`Spark Points: ${sparkPoints}`} showIcon={false}>
              <div className="text-xs text-gray-500 font-medium">Spark Points</div>
            </ReadAloud>
          </div>
          <div className="dashboard-card bg-white p-3 text-center anim-card-enter" style={{ animationDelay: '0.1s' }}>
            <div className={`${getStreakSize(streak)} ${streak >= 3 ? 'anim-flame' : ''}`}>
              {getStreakEmoji(streak)}
            </div>
            <div className="text-xl font-display font-bold text-orange-600">
              {streak} day{streak !== 1 ? 's' : ''}
            </div>
            <ReadAloud text={`Day Streak: ${streak} days`} showIcon={false}>
              <div className="text-xs text-gray-500 font-medium">Day Streak</div>
            </ReadAloud>
            {streak >= 3 && (
              <div className="text-[10px] text-orange-500 font-bold mt-0.5">You&apos;re on a roll!</div>
            )}
          </div>
          <div className="dashboard-card bg-white p-3 text-center anim-card-enter" style={{ animationDelay: '0.15s' }}>
            <div className="text-2xl">✅</div>
            <div className="text-xl font-display font-bold text-green-600">{completedCount}/{totalGoal}</div>
            <ReadAloud text={`Done today: ${completedCount} of ${totalGoal}`} showIcon={false}>
              <div className="text-xs text-gray-500 font-medium">Done Today</div>
            </ReadAloud>
          </div>
          <div className="dashboard-card bg-white p-3 text-center anim-card-enter" style={{ animationDelay: '0.2s' }}>
            <div className="text-2xl">{levelInfo.emoji}</div>
            <div className="text-sm font-display font-bold" style={{ color: theme.primary }}>
              {levelInfo.title}
            </div>
            <ReadAloud text={`Level ${levelInfo.level}: ${levelInfo.title}`} showIcon={false}>
              <div className="text-xs text-gray-500 font-medium">Level {levelInfo.level}</div>
            </ReadAloud>
            {levelInfo.nextLevel && (
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="progress-bar-fill h-full" style={{ width: `${levelInfo.progress}%` }} />
              </div>
            )}
          </div>
        </div>        {/* ════════ CLASSROOM WALL ════════ */}
        <section className="anim-card-enter" style={{ animationDelay: '0.22s' }}>
          <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #D2B48C, #C4A882)' }}>
            {/* Pushpin decorations */}
            <div className="absolute top-2 left-4 text-lg" style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}>📌</div>
            <div className="absolute top-2 right-4 text-lg" style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}>📌</div>
            <div className="relative z-10 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Sticky Note: Day & Date */}
                <div className="bg-yellow-100 rounded-lg p-3 shadow-md transform -rotate-1 border border-yellow-200">
                  <p className="text-[10px] text-yellow-700 font-bold tracking-wider uppercase">📅 Today is</p>
                  <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>{dayOfWeek}</h2>
                  <p className="text-xs text-gray-600">{dateDisplay}</p>
                </div>
                {/* Blue Note: Clock */}
                <div className="bg-blue-100 rounded-lg p-3 shadow-md transform rotate-1 border border-blue-200 text-center">
                  <p className="text-[10px] text-blue-700 font-bold tracking-wider uppercase">🕐 Time</p>
                  <span className="text-xl font-bold text-gray-800 tabular-nums" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>{timeDisplay}</span>
                </div>
                {/* Green Note: Mini Calendar (week view) */}
                <div className="bg-green-100 rounded-lg p-3 shadow-md transform -rotate-1 border border-green-200 text-center">
                  <p className="text-[10px] text-green-700 font-bold tracking-wider uppercase">📆 This Week</p>
                  <div className="flex gap-1 mt-1 justify-center">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <div key={i} className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${ currentTime.getDay() === i ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800'}`}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-green-600 mt-1 font-medium">Day {currentTime.getDay() + 1} of 7</p>
                </div>
                {/* Pink Note: Season/Holiday */}
                <div className="bg-pink-100 rounded-lg p-3 shadow-md transform rotate-1 border border-pink-200 text-center">
                  <p className="text-[10px] text-pink-700 font-bold tracking-wider uppercase">{seasonal.emoji} Season</p>
                  <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "'Caveat', cursive, sans-serif" }}>{seasonal.name}</p>
                  <div className="flex gap-1 mt-1 justify-center text-sm">
                    {seasonal.decor.slice(0, 4).map((e, i) => <span key={i} className="illust-float" style={{ animationDelay: `${i * 0.3}s` }}>{e}</span>)}
                  </div>
                </div>
              </div>

              {/* ── Classroom Decorations Row ── */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Fish Aquarium */}
                <div className="bg-gradient-to-b from-blue-200 to-blue-400 rounded-xl p-3 shadow-inner relative overflow-hidden" style={{ minHeight: '80px' }}>
                  <p className="text-[10px] text-blue-800 font-bold tracking-wider uppercase text-center">🐠 Class Aquarium</p>
                  <div className="relative mt-1" style={{ height: '50px' }}>
                    {['🐠','🐟','🐡','🦀','🐙'].map((fish, i) => (
                      <span key={i} className="absolute text-lg" style={{
                        animation: `swim ${3 + i * 0.7}s ease-in-out infinite alternate`,
                        top: `${10 + (i * 8) % 30}px`,
                        left: `${(i * 20) % 80}%`,
                        animationDelay: `${i * 0.5}s`,
                      }}>{fish}</span>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-around text-sm opacity-60">
                    <span>🪸</span><span>🌿</span><span>🐚</span><span>🪨</span><span>🌿</span>
                  </div>
                </div>
                {/* Globe / Wall Map */}
                <div className="bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl p-3 shadow-inner text-center">
                  <p className="text-[10px] text-teal-800 font-bold tracking-wider uppercase">🌍 Our World</p>
                  <div className="text-4xl mt-1 illust-bob">🌎</div>
                  <p className="text-[10px] text-teal-700 mt-1 font-medium">Learning connects us all!</p>
                </div>
                {/* Seasonal decoration / bulletin */}
                <div className="rounded-xl p-3 shadow-inner text-center" style={{ background: `linear-gradient(135deg, ${seasonal.colors[0]}22, ${seasonal.colors[1]}22)` }}>
                  <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: seasonal.colors[0] }}>
                    {seasonal.emoji} {seasonal.name} Board
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1 justify-center text-xl">
                    {seasonal.decor.map((e, i) => (
                      <span key={i} className="illust-float" style={{ animationDelay: `${i * 0.4}s`, fontSize: '1.5rem' }}>{e}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative shelf items */}
              <div className="flex items-center justify-center gap-3 mt-2 text-lg opacity-50">
                <span>🍎</span><span>✏️</span><span>📚</span><span>🎨</span><span>⭐</span><span>📐</span><span>🖍️</span>
              </div>
            </div>
          </div>
        </section>



        {/* ════════ ATTENDANCE CHECK-IN ════════ */}
        {!checkedIn && (
          <div
            className="dashboard-card p-5 text-center anim-card-enter"
            style={{
              background: `linear-gradient(135deg, ${theme.bg}, white)`,
              borderColor: theme.primary + '40',
            }}
          >
            <PepperPenguin mood="waving" size={70} />
            <ReadAloud text="Tap the button to check in for today!" showIcon={false}>
              <p className="text-lg font-display font-bold mt-2" style={{ color: theme.primary }}>
                🙋 Ready to start your day?
              </p>
            </ReadAloud>
            <button
              onClick={handleCheckIn}
              className="mt-3 text-white font-display font-bold py-3 px-8 rounded-2xl
                text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
              style={{ background: theme.headerBg }}
            >
              ✅ I&apos;m Here! Check In
            </button>
          </div>
        )}

        {checkedIn && checkinCelebrating && (
          <div
            className="dashboard-card p-5 text-center anim-bounce-in"
            style={{
              background: `linear-gradient(135deg, ${theme.bg}, white)`,
              borderColor: theme.primary + '60',
            }}
          >
            <div className="text-4xl mb-2 anim-firework">🎉</div>
            <p className="text-xl font-display font-bold" style={{ color: theme.primary }}>You&apos;re here!</p>
            <p className="mt-1" style={{ color: theme.secondary }}>
              {streak > 1 ? `🔥 ${streak}-day streak! Keep it going!` : 'Great start to the day!'}
            </p>
          </div>
        )}

        {/* ════════ QUICK ACTIONS ROW (4-col) ════════ */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 anim-card-enter" style={{ animationDelay: '0.25s' }}>
          <button onClick={() => navigate('/student/play')} className="dashboard-card bg-white p-3 sm:p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-1">🎮</div>
            <ReadAloud text="Free Play" showIcon={false}>
              <div className="font-display font-bold text-gray-800 text-xs sm:text-sm">Free Play</div>
            </ReadAloud>
          </button>
          <button onClick={() => navigate('/student/library')} className="dashboard-card bg-white p-3 sm:p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-1">📚</div>
            <ReadAloud text="Library" showIcon={false}>
              <div className="font-display font-bold text-gray-800 text-xs sm:text-sm">Library</div>
            </ReadAloud>
          </button>
          <button onClick={() => navigate('/student/learning-path')} className="dashboard-card bg-white p-3 sm:p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-1">🗺️</div>
            <ReadAloud text="Learning Path" showIcon={false}>
              <div className="font-display font-bold text-gray-800 text-xs sm:text-sm">Learning Path</div>
            </ReadAloud>
          </button>
          <button onClick={() => navigate('/student/achievements')} className="dashboard-card bg-white p-3 sm:p-4 text-center">
            <div className="text-3xl sm:text-4xl mb-1">🏆</div>
            <ReadAloud text="Trophies" showIcon={false}>
              <div className="font-display font-bold text-gray-800 text-xs sm:text-sm">Trophies</div>
            </ReadAloud>
          </button>
        </div>

        {/* ════════ MY SUBJECTS ════════ */}
        <section className="anim-card-enter" style={{ animationDelay: '0.3s' }}>
          <ReadAloud text="Here are your subjects! Pick one to practice." showIcon={true} iconSize="sm">
            <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
              📚 My Subjects
            </h2>
          </ReadAloud>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WORLD_ZONES.map((zone, idx) => {
              const pct = domainMastery[zone.domainName] ?? 0;
              return (
                <div
                  key={zone.domainName}
                  className="dashboard-card bg-white p-3 sm:p-4 cursor-pointer anim-card-enter"
                  style={{ animationDelay: `${0.32 + idx * 0.04}s`, borderColor: zone.color + '40' }}
                  onClick={() => zone.domainName === 'Heritage Spanish'
                    ? navigate('/student/spanish-village')
                    : navigate('/student/practice', { state: { domain: zone.domainName } })
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl sm:text-3xl">{zone.emoji}</span>
                    <ReadAloud text={zone.zoneName} showIcon={false}>
                      <span className="font-display font-bold text-sm sm:text-base text-gray-800">{zone.zoneName}</span>
                    </ReadAloud>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: zone.color }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">
                      {pct > 0 ? `${pct}% mastered` : 'Ready to explore!'}
                    </span>
                    <span
                      className="text-xs font-display font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: zone.color }}
                    >
                      Go!
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ════════ TODAY'S ACTIVITY PLAN (Age-Appropriate) ════════ */}
        {(() => {
          const agePlan = getAgeTiming(gradeLevel);
          return (
            <section className="anim-card-enter" style={{ animationDelay: '0.55s' }}>
              <ReadAloud text={`Your activity plan for today. About ${agePlan.totalTime} of learning with breaks!`} showIcon={true} iconSize="sm">
                <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
                  📋 Today&apos;s Activity Plan
                  <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    ~{agePlan.totalTime}
                  </span>
                </h2>
              </ReadAloud>
              <div className="dashboard-card bg-white p-4">
                <div className="space-y-2">
                  {agePlan.blocks.map((block, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                        block.type === 'break' ? 'bg-amber-50 border border-amber-100' :
                        block.type === 'recess' ? 'bg-green-50 border border-green-100' :
                        'bg-blue-50 border border-blue-100'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{block.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-display font-bold text-sm text-gray-800">{block.label}</span>
                        {block.type === 'recess' && (
                          <span className="ml-2 text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-medium">
                            Move!
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        block.type === 'break' ? 'bg-amber-200 text-amber-800' :
                        block.type === 'recess' ? 'bg-green-200 text-green-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {block.duration}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    📏 Each activity: <span className="font-bold">{agePlan.taskTime}</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    Work at your own pace! 🐢
                  </span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ════════ PICK UP WHERE YOU LEFT OFF ════════ */}
        {yesterdayIncomplete.length > 0 && (
          <section className="anim-card-enter" style={{ animationDelay: '0.5s' }}>
            <ReadAloud text="Pick up where you left off from yesterday!" showIcon={true} iconSize="sm">
              <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
                ⏪ Left from Yesterday
              </h2>
            </ReadAloud>
            <div className="space-y-2">
              {yesterdayIncomplete.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="dashboard-card bg-white p-4 flex items-center justify-between cursor-pointer hover:border-amber-300"
                  onClick={() => navigate('/student/play')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-display font-bold text-gray-800 text-sm">{item.activity_name || 'Unfinished Activity'}</p>
                      <p className="text-xs text-gray-500">From yesterday — let&apos;s finish it!</p>
                    </div>
                  </div>
                  <span className="text-amber-500 font-bold text-sm">Continue →</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════ UPCOMING ASSESSMENTS ════════ */}
        {upcomingAssessments.length > 0 && (
          <section className="anim-card-enter" style={{ animationDelay: '0.52s' }}>
            <ReadAloud text="You have upcoming assessments!" showIcon={true} iconSize="sm">
              <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
                📋 Upcoming Assessments
              </h2>
            </ReadAloud>
            <div className="space-y-2">
              {upcomingAssessments.map((session: any, idx: number) => (
                <div
                  key={session.id || idx}
                  className="dashboard-card bg-white p-4 flex items-center justify-between cursor-pointer hover:border-indigo-300"
                  onClick={() => navigate('/student/assessment')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="font-display font-bold text-gray-800 text-sm">
                        Discovery Assessment
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.target_skill_ids?.length || 0} skills to check
                      </p>
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 text-white text-sm font-bold rounded-xl"
                    style={{ background: theme.headerBg }}
                  >
                    Start →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════ YOUR LEARNING PLAN ════════ */}
        <section className="anim-card-enter" style={{ animationDelay: '0.54s' }}>
          <ReadAloud
            text={todayItems.length > 0
              ? `Your Learning Plan has ${todayItems.length} activities based on your assessment results!`
              : completedCount > 0
                ? `Amazing! You finished ${completedCount} activities today!`
                : 'Your Learning Plan will fill up after your first assessment!'
            }
            showIcon={true} iconSize="sm"
          >
            <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2" style={{ color: theme.primary }}>
              🎯 Your Learning Plan
              {todayItems.length > 0 && (
                <span className="text-sm font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {todayItems.length} to do
                </span>
              )}
            </h2>
          </ReadAloud>

          {todayItems.length > 0 ? (
            <div className="space-y-2">
              {todayItems.slice(0, 6).map((item: any, idx: number) => {
                const skillEmoji = (item.skill_name || item.title || '').toLowerCase().includes('math') ? '🧮'
                  : (item.skill_name || item.title || '').toLowerCase().includes('read') ? '📖'
                  : (item.skill_name || item.title || '').toLowerCase().includes('phon') ? '🎵'
                  : (item.skill_name || item.title || '').toLowerCase().includes('writ') ? '✏️'
                  : (item.skill_name || item.title || '').toLowerCase().includes('vocab') ? '📚'
                  : (item.skill_name || item.title || '').toLowerCase().includes('spanish') ? '🇪🇸'
                  : (item.skill_name || item.title || '').toLowerCase().includes('number') ? '🔢'
                  : (item.skill_name || item.title || '').toLowerCase().includes('shape') ? '📐'
                  : '📌';
                const statusIcon = item.status === 'in_progress' ? '🔄' : skillEmoji;
                const statusLabel = item.status === 'in_progress' ? 'In progress — keep going!'
                  : item.priority === 'high' || item.source === 'improvement' ? '⭐ Needs practice'
                  : 'Ready to start';
                return (
                  <div
                    key={item.id || idx}
                    className="dashboard-card bg-white p-4 flex items-center justify-between cursor-pointer hover:border-green-300"
                    onClick={() => navigate('/student/flight-plan')}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{statusIcon}</span>
                      <div>
                        <ReadAloud text={item.title || item.skill_name || 'Activity'} showIcon={false}>
                          <p className="font-display font-bold text-gray-800 text-sm">{item.title || item.skill_name || 'Activity'}</p>
                        </ReadAloud>
                        <p className="text-xs text-gray-500">{statusLabel}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/student/flight-plan'); }}
                      className="px-4 py-2 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
                      style={{ background: theme.headerBg }}
                    >
                      Let&apos;s Go! 🚀
                    </button>
                  </div>
                );
              })}
              {todayItems.length > 6 && (
                <button
                  onClick={() => navigate('/student/flight-plan')}
                  className="w-full text-center text-sm font-display font-bold py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ color: theme.primary }}
                >
                  See all {todayItems.length} activities →
                </button>
              )}
            </div>
          ) : completedCount > 0 ? (
            <div className="dashboard-card bg-gradient-to-br from-green-50 to-emerald-50 p-5 text-center border-green-200">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-display font-bold text-green-700 text-lg">All done for today!</p>
              <p className="text-sm text-green-600 mt-1">You completed {completedCount} activit{completedCount === 1 ? 'y' : 'ies'}. Great work!</p>
              <button
                onClick={() => navigate('/student/play')}
                className="mt-3 px-5 py-2 text-white text-sm font-bold rounded-xl"
                style={{ background: theme.headerBg }}
              >
                🎮 Free Play
              </button>
            </div>
          ) : (
            <div className="dashboard-card bg-gradient-to-br from-blue-50 to-indigo-50 p-5 text-center border-indigo-200">
              <PepperPenguin mood="thinking" size={80} />
              <p className="font-display font-bold text-indigo-700 text-lg mt-2">Ready to discover your skills?</p>
              <p className="text-sm text-indigo-500 mt-1">Take a quick assessment and I&apos;ll build your personalized learning plan!</p>
              <button
                onClick={() => navigate('/student/assessment')}
                className="mt-3 px-6 py-3 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                style={{ background: theme.headerBg }}
              >
                🎯 Start Assessment
              </button>
            </div>
          )}
        </section>

        {/* ════════ DAILY REFLECTION / JOURNAL ════════ */}
        <section className="anim-card-enter" style={{ animationDelay: '0.55s' }}>
          {!showReflection ? (
            <button
              onClick={() => setShowReflection(true)}
              className="w-full dashboard-card p-4 text-center hover:shadow-lg transition-all group"
              style={{ background: `linear-gradient(135deg, #FFF8E1, #FFF3E0)`, borderColor: '#FFB74D40' }}
            >
              <span className="text-2xl">📓</span>
              <ReadAloud text="How was your learning today? Tap to write in your journal!" showIcon={false}>
                <p className="text-sm font-display font-bold text-amber-800 mt-1">
                  📓 My Daily Journal
                </p>
              </ReadAloud>
              <p className="text-xs text-amber-600 mt-0.5">How was your learning today? Tap to write!</p>
            </button>
          ) : (
            <div className="dashboard-card p-5 anim-bounce-in" style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFF3E0)', borderColor: '#FFB74D40' }}>
              {reflectionSaved ? (
                <div className="text-center py-4">
                  <span className="text-4xl">✨</span>
                  <p className="text-lg font-display font-bold text-amber-800 mt-2">Journal saved!</p>
                  <p className="text-sm text-amber-600">Great reflection today! 🌟</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <ReadAloud text="My Daily Journal. How are you feeling?" showIcon={false}>
                      <h3 className="text-lg font-display font-bold text-amber-800">📓 My Daily Journal</h3>
                    </ReadAloud>
                    <button onClick={() => setShowReflection(false)} className="text-amber-400 hover:text-amber-600 text-lg">✕</button>
                  </div>
                  <ReadAloud text="How are you feeling today?" showIcon={false}>
                    <p className="text-sm text-amber-700 font-medium mb-2">How are you feeling today?</p>
                  </ReadAloud>
                  <div className="flex gap-2 justify-center mb-3">
                    {[
                      { emoji: '😊', label: 'Great' },
                      { emoji: '🙂', label: 'Good' },
                      { emoji: '😐', label: 'Okay' },
                      { emoji: '😢', label: 'Sad' },
                      { emoji: '😤', label: 'Frustrated' },
                      { emoji: '🤩', label: 'Excited' },
                      { emoji: '😴', label: 'Tired' },
                    ].map(m => (
                      <button
                        key={m.emoji}
                        onClick={() => setReflectionMood(m.emoji)}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all ${reflectionMood === m.emoji ? 'bg-amber-200 shadow-md scale-110 ring-2 ring-amber-400' : 'bg-white hover:bg-amber-50'}`}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-[10px] text-amber-700 font-medium mt-0.5">{m.label}</span>
                      </button>
                    ))}
                  </div>
                  <ReadAloud text="What did you learn or do today? Write about it!" showIcon={false}>
                    <p className="text-sm text-amber-700 font-medium mb-1">What did you learn today?</p>
                  </ReadAloud>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="I learned about... / Today was fun because... / I need help with..."
                    className="w-full p-3 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-sm resize-none"
                    rows={3}
                    style={{ fontFamily: "'Caveat', cursive, sans-serif", fontSize: '1rem' }}
                  />
                  <button
                    onClick={saveReflection}
                    disabled={!reflectionMood}
                    className="mt-3 w-full py-3 rounded-xl text-white font-display font-bold shadow-md transition-all disabled:opacity-40"
                    style={{ background: reflectionMood ? 'linear-gradient(135deg, #FF8F00, #F57C00)' : '#ccc' }}
                  >
                    {reflectionMood ? '✨ Save My Journal Entry' : 'Pick a mood first! ☝️'}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {/* ════════ BOTTOM QUICK ACTIONS ════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 anim-card-enter" style={{ animationDelay: '0.6s' }}>
          <QuickAction icon="📝" label="Lesson Plan" color={theme.primary} onClick={() => navigate('/student/flight-plan')} />
          <QuickAction icon="📊" label="My Progress" color={theme.primary} onClick={() => navigate('/student/progress')} />
          <QuickAction icon="🎯" label="Assessment" color={theme.primary} onClick={() => navigate('/student/assessment')} />
          <QuickAction icon="🏆" label="Trophy Case" color={theme.primary} onClick={() => navigate('/student/achievements')} />
        </div>

      </div>


      {/* ════════ FLOATING PEPPER HELP BUTTON ════════ */}
      <button
        onClick={showRandomTip}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-16 h-16 rounded-full shadow-xl flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all"
        style={{ background: theme.headerBg }}
        title="Ask Pepper for help!"
      >
        <span className="text-3xl">🐧</span>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse">?</span>
      </button>

      {/* ════════ PEPPER HELP MODAL ════════ */}
      {showPepperHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPepperHelp(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 anim-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPepperHelp(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl"
            >✕</button>
            <div className="text-center">
              <PepperPenguin mood="waving" size={100} />
              <h3 className="text-xl font-display font-bold mt-3" style={{ color: theme.primary }}>
                Hi! I&apos;m Pepper! 🐧
              </h3>
              {/* Tip */}
              {pepperTip && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-sm font-medium text-blue-800">💡 Pepper&apos;s Tip:</p>
                  <p className="text-sm text-blue-700 mt-1">{pepperTip}</p>
                </div>
              )}
              {/* Action buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={showRandomTip}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  style={{ background: theme.headerBg }}
                >
                  💡 Give me another tip!
                </button>
                {!helpSent ? (
                  <button
                    onClick={sendHelpRequest}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-all"
                  >
                    🙋 I need help! Tell my teacher
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-xl text-sm font-bold bg-green-100 text-green-700 border border-green-200">
                    ✅ Got it! Your teacher will check in soon!
                  </div>
                )}
                <button
                  onClick={() => navigate('/student/play')}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-purple-500 text-white shadow-md hover:bg-purple-600 transition-all"
                >
                  🎮 I want to take a break!
                </button>
                {/* Theme Picker */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-500 mb-2">🎨 Pick Your Colors!</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {colorThemes.map(ct => (
                      <button
                        key={ct.id}
                        onClick={() => handleColorThemeChange(ct.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${selectedColorTheme === ct.id ? 'ring-2 ring-offset-1 ring-blue-400 bg-blue-50 font-bold' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {ct.emoji} {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MOBILE BOTTOM NAV ════════ */}
      <div className="mobile-bottom-nav md:hidden">
        <div className="flex items-center justify-around px-2">
          <MobileNavItem icon="🏠" label="Home" active onClick={() => navigate('/student')} />
          <MobileNavItem icon="🏆" label="Trophies" onClick={() => navigate('/student/achievements')} />
          <MobileNavItem icon="🔐" label="Locker" onClick={() => navigate('/student/locker')} />
          <MobileNavItem icon="🏆" label="Badges" onClick={() => navigate('/student/achievements')} />
          <MobileNavItem icon="👤" label="Me" onClick={() => navigate('/student/progress')} />
        </div>
      </div>
    </div>
  );
}

// ───── Helper Components ─────

function QuickAction({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="dashboard-card bg-white p-4 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <ReadAloud text={label} showIcon={false}>
        <div className="text-sm font-display font-bold" style={{ color }}>{label}</div>
      </ReadAloud>
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }: {
  icon: string; label: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-lg transition-colors
        ${active ? 'text-green-700 font-bold' : 'text-gray-500'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] mt-0.5 font-medium">{label}</span>
    </button>
  );
}
