/* ═══════════════════════════════════════════════════════════
   🎨  FREE PLAY — Pre-K Creative Break Activities
   Age-appropriate 5–10 minute creative activities
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReadAloud } from '../../components/shared/ReadAloud';

/* ── Activity definitions ── */
interface Activity {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  minutes: number;
  color: string;
  component: React.FC<{ onFinish: () => void }>;
}

/* ── Timer component ── */
function ActivityTimer({ minutes, onDone }: { minutes: number; onDone: () => void }) {
  const [seconds, setSeconds] = useState(minutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDone();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [minutes, onDone]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const pct = (seconds / (minutes * 60)) * 100;
  const isLow = seconds <= 60;

  return (
    <div className="flex items-center gap-3 bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-md">
      <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-bold text-lg tabular-nums ${isLow ? 'text-red-500' : 'text-gray-700'}`}>
        {m}:{s.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

/* ── Coloring Activity ── */
function ColoringActivity({ onFinish }: { onFinish: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#FF6B6B');
  const [drawing, setDrawing] = useState(false);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C00', '#2ECC71', '#E74C3C', '#9B59B6'];

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setDrawing(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <ReadAloud text="Draw something beautiful!">
        <h2 className="text-2xl font-bold text-purple-700">🎨 Draw Something Beautiful!</h2>
      </ReadAloud>
      <div className="flex gap-2 flex-wrap justify-center">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 scale-110' : 'border-white shadow-md'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          onClick={() => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }}
          className="px-3 py-1 bg-gray-200 rounded-full text-sm font-bold hover:bg-gray-300"
        >
          🧹 Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        className="bg-white rounded-2xl shadow-lg border-4 border-purple-200 touch-none cursor-crosshair"
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
    </div>
  );
}

/* ── Music & Rhythm Activity ── */
function MusicActivity({ onFinish }: { onFinish: () => void }) {
  const [lastTap, setLastTap] = useState<string | null>(null);
  const instruments = [
    { emoji: '🥁', name: 'Drum', sound: 'Boom!' },
    { emoji: '🎹', name: 'Piano', sound: 'Ding!' },
    { emoji: '🎸', name: 'Guitar', sound: 'Strum!' },
    { emoji: '🔔', name: 'Bell', sound: 'Ring!' },
    { emoji: '🎺', name: 'Trumpet', sound: 'Toot!' },
    { emoji: '🪘', name: 'Bongo', sound: 'Bap!' },
    { emoji: '🎶', name: 'Whistle', sound: 'Tweet!' },
    { emoji: '🪇', name: 'Maracas', sound: 'Shake!' },
    { emoji: '🎵', name: 'Clap', sound: 'Clap!' },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <ReadAloud text="Tap the instruments to make music!">
        <h2 className="text-2xl font-bold text-purple-700">🎵 Make Some Music!</h2>
      </ReadAloud>
      {lastTap && (
        <div className="text-4xl font-bold text-purple-500 animate-bounce">{lastTap}</div>
      )}
      <div className="grid grid-cols-3 gap-4">
        {instruments.map(inst => (
          <button
            key={inst.name}
            onClick={() => { setLastTap(`${inst.emoji} ${inst.sound}`); setTimeout(() => setLastTap(null), 800); }}
            className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all hover:scale-110 active:scale-95 flex flex-col items-center gap-1 border-2 border-transparent hover:border-purple-300"
          >
            <span className="text-4xl">{inst.emoji}</span>
            <span className="text-xs font-bold text-gray-600">{inst.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Simon Says Activity ── */
function SimonSaysActivity({ onFinish }: { onFinish: () => void }) {
  const actions = [
    { emoji: '🙌', text: 'Raise your hands high!' },
    { emoji: '🦶', text: 'Stomp your feet!' },
    { emoji: '👏', text: 'Clap 5 times!' },
    { emoji: '🤸', text: 'Touch your toes!' },
    { emoji: '🐧', text: 'Waddle like Pepper!' },
    { emoji: '🌟', text: 'Spin around once!' },
    { emoji: '🐻', text: 'Roar like a bear!' },
    { emoji: '🐱', text: 'Meow like a cat!' },
    { emoji: '🦅', text: 'Flap your wings!' },
    { emoji: '🐸', text: 'Jump like a frog!' },
    { emoji: '😊', text: 'Make a silly face!' },
    { emoji: '🤖', text: 'Walk like a robot!' },
  ];
  const [current, setCurrent] = useState(() => actions[Math.floor(Math.random() * actions.length)]);
  const [score, setScore] = useState(0);

  const next = () => {
    setScore(s => s + 1);
    setCurrent(actions[Math.floor(Math.random() * actions.length)]);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <ReadAloud text="Pepper says do this!">
        <h2 className="text-2xl font-bold text-purple-700">🐧 Pepper Says...</h2>
      </ReadAloud>
      <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm border-4 border-purple-200">
        <span className="text-6xl block mb-4">{current.emoji}</span>
        <p className="text-xl font-bold text-gray-800">
          <ReadAloud text={current.text}>{current.text}</ReadAloud>
        </p>
      </div>
      <button
        onClick={next}
        className="px-8 py-4 bg-green-500 text-white rounded-full text-xl font-bold hover:bg-green-600 active:scale-95 transition-all shadow-lg"
      >
        ✅ Did it! Next!
      </button>
      <span className="text-lg font-bold text-purple-600">⭐ Score: {score}</span>
    </div>
  );
}

/* ── Shape Builder Activity ── */
function ShapeBuilderActivity({ onFinish }: { onFinish: () => void }) {
  const shapes = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠', '⭐', '💜', '💚', '🩷', '🩵', '🤎'];
  const [pattern, setPattern] = useState<string[]>([]);

  return (
    <div className="flex flex-col items-center gap-4">
      <ReadAloud text="Create a colorful pattern!">
        <h2 className="text-2xl font-bold text-purple-700">🔶 Shape Pattern Maker!</h2>
      </ReadAloud>
      <div className="bg-white rounded-2xl p-4 min-h-[80px] w-full max-w-md shadow-inner border-2 border-dashed border-purple-200 flex flex-wrap gap-1 justify-center items-center">
        {pattern.length === 0 ? (
          <span className="text-gray-400 text-sm">Tap shapes below to build a pattern!</span>
        ) : (
          pattern.map((s, i) => <span key={i} className="text-3xl">{s}</span>)
        )}
      </div>
      <div className="grid grid-cols-6 gap-3">
        {shapes.map((s, i) => (
          <button
            key={i}
            onClick={() => setPattern(p => [...p, s])}
            className="text-3xl p-2 rounded-xl hover:bg-purple-50 active:scale-90 transition-all"
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={() => setPattern([])}
        className="px-4 py-2 bg-gray-200 rounded-full text-sm font-bold hover:bg-gray-300"
      >
        🧹 Start Over
      </button>
    </div>
  );
}

/* ── Activity list ── */
const activities: Activity[] = [
  { id: 'color', emoji: '🎨', title: 'Drawing Time', subtitle: 'Draw and color!', minutes: 10, color: 'from-pink-100 to-rose-100', component: ColoringActivity },
  { id: 'music', emoji: '🎵', title: 'Music Maker', subtitle: 'Tap to make music!', minutes: 5, color: 'from-blue-100 to-cyan-100', component: MusicActivity },
  { id: 'simon', emoji: '🐧', title: 'Pepper Says', subtitle: 'Follow Pepper!', minutes: 5, color: 'from-purple-100 to-violet-100', component: SimonSaysActivity },
  { id: 'shapes', emoji: '🔶', title: 'Pattern Maker', subtitle: 'Build patterns!', minutes: 10, color: 'from-yellow-100 to-amber-100', component: ShapeBuilderActivity },
];

/* ── Main Free Play page ── */
export default function FreePlay() {
  const navigate = useNavigate();
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [showDone, setShowDone] = useState(false);

  const handleFinish = () => {
    setShowDone(true);
    setTimeout(() => { setShowDone(false); setActiveActivity(null); }, 2500);
  };

  // Playing an activity
  if (activeActivity) {
    const ActivityComponent = activeActivity.component;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-4">
        {showDone ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <span className="text-7xl animate-bounce">🌟</span>
            <h2 className="text-3xl font-bold text-purple-700">Great Job!</h2>
            <p className="text-lg text-purple-500">Pepper is so proud of you!</p>
            <span className="text-5xl">🐧</span>
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveActivity(null)}
                className="flex items-center gap-2 text-purple-600 font-bold bg-white/70 rounded-2xl px-4 py-2 shadow-sm hover:shadow-md"
              >
                ← Back
              </button>
              <ActivityTimer minutes={activeActivity.minutes} onDone={handleFinish} />
            </div>
            <ActivityComponent onFinish={handleFinish} />
          </div>
        )}
      </div>
    );
  }

  // Activity picker
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 relative overflow-hidden">
      {/* Floating emojis */}
      {['⭐', '✨', '🌟', '💫', '🎨', '🎵', '🐧', '🦋'].map((emoji, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-15 pointer-events-none animate-pulse"
          style={{ top: `${10 + i * 11}%`, left: `${5 + i * 12}%`, animationDelay: `${i * 0.5}s` }}
        >
          {emoji}
        </div>
      ))}

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-purple-600 font-bold text-lg mb-4 bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm hover:shadow-md"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          <span className="text-6xl block mb-3">🐧</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-500">
            <ReadAloud text="Free Play Time!">Free Play Time! 🎉</ReadAloud>
          </h1>
          <p className="text-lg text-purple-500 font-semibold mt-2">
            <ReadAloud text="Pick a fun activity! Each one has a timer so you know when break is over.">
              Pick a fun activity! Each one has a timer.
            </ReadAloud>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {activities.map(act => (
            <button
              key={act.id}
              onClick={() => setActiveActivity(act)}
              className={`bg-white rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl transition-all hover:scale-105 active:scale-97 flex flex-col items-center text-center gap-2 sm:gap-3 ring-2 ring-transparent hover:ring-purple-300 cursor-pointer relative overflow-hidden group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${act.color} opacity-0 group-hover:opacity-40 transition-opacity rounded-3xl`} />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="text-5xl">{act.emoji}</span>
                <h2 className="text-lg font-bold text-gray-800">{act.title}</h2>
                <p className="text-sm text-gray-500">{act.subtitle}</p>
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                  ⏱️ {act.minutes} min
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Also link to the bigger Play Mode for older kids */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/student/play')}
            className="text-purple-500 text-sm font-medium hover:text-purple-700 underline"
          >
            Looking for more games? Try Play Mode →
          </button>
        </div>
      </div>
    </div>
  );
}
