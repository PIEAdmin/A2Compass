import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const activities = [
  {
    emoji: '🎈',
    title: 'Balloon Pop',
    subtitle: 'Pop balloons to learn!',
    path: '/student/game/balloon-pop-demo',
    bg: 'from-red-100 to-orange-100',
    hoverBorder: 'hover:ring-red-300',
  },
  {
    emoji: '🧩',
    title: 'Memory Match',
    subtitle: 'Flip and match pairs!',
    path: '/student/game/memory-match',
    bg: 'from-blue-100 to-cyan-100',
    hoverBorder: 'hover:ring-blue-300',
  },
  {
    emoji: '📚',
    title: 'Interactive Story',
    subtitle: 'Read along with a story!',
    path: '/student/story',
    bg: 'from-green-100 to-emerald-100',
    hoverBorder: 'hover:ring-green-300',
  },
  {
    emoji: '🎬',
    title: 'Video Library',
    subtitle: 'Watch fun learning videos!',
    path: '/student/videos',
    bg: 'from-purple-100 to-violet-100',
    hoverBorder: 'hover:ring-purple-300',
  },
  {
    emoji: '🎮',
    title: 'Drag & Sort',
    subtitle: 'Put things in order!',
    path: '/student/game/drag-drop-sort',
    bg: 'from-yellow-100 to-amber-100',
    hoverBorder: 'hover:ring-yellow-300',
  },
  {
    emoji: '🛠️',
    title: 'Matching Pairs',
    subtitle: 'Match the pairs!',
    path: '/student/game/matching-pairs',
    bg: 'from-pink-100 to-rose-100',
    hoverBorder: 'hover:ring-pink-300',
  },
  {
    emoji: '📚',
    title: 'My Library',
    subtitle: 'Explore books and resources!',
    path: '/student/library',
    bg: 'from-teal-100 to-cyan-100',
    hoverBorder: 'hover:ring-teal-300',
  },
  {
    emoji: '🛍️',
    title: 'Reward Shop',
    subtitle: 'Spend your Spark Points!',
    path: '/student/reward-shop',
    bg: 'from-fuchsia-100 to-pink-100',
    hoverBorder: 'hover:ring-fuchsia-300',
  },
];

const floatingEmojis = ['⭐', '✨', '🌟', '💫', '⭐', '✨', '🌟', '💫', '⭐', '✨'];

export default function PlayMode() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 relative overflow-hidden">
      {/* Floating background emojis */}
      {floatingEmojis.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl sm:text-3xl opacity-20 pointer-events-none select-none"
          style={{
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 90}%`,
          }}
          animate={{
            y: [0, -20, 0, 20, 0],
            x: [0, 10, 0, -10, 0],
            rotate: [0, 15, 0, -15, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-purple-600 font-bold text-lg mb-4 hover:text-purple-800 transition-colors bg-white/70 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm hover:shadow-md"
        >
          <span className="text-xl">←</span>
          <span>Back</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
          className="text-center mb-8 sm:mb-10"
        >
          <motion.div
            className="text-6xl sm:text-7xl mb-3"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            🌶️
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-500">
            Free Play! 🎉
          </h1>
          <p className="text-lg sm:text-xl text-purple-500 font-semibold mt-2">
            Pick something fun to do!
          </p>
        </motion.div>

        {/* Activity cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {activities.map((activity, index) => (
            <motion.button
              key={activity.title}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={mounted ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                type: 'spring',
                bounce: 0.3,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(activity.path)}
              className={`
                bg-white rounded-3xl p-4 sm:p-6 shadow-md
                hover:shadow-xl transition-all duration-300
                flex flex-col items-center text-center gap-2 sm:gap-3
                ring-2 ring-transparent ${activity.hoverBorder}
                cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-300
                relative overflow-hidden group
              `}
            >
              {/* Subtle gradient overlay on hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${activity.bg} opacity-0 group-hover:opacity-40 transition-opacity duration-300 rounded-3xl`}
              />

              <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
                <motion.span
                  className="text-4xl sm:text-5xl"
                  whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  {activity.emoji}
                </motion.span>
                <h2 className="text-base sm:text-lg font-bold text-gray-800 leading-tight">
                  {activity.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 font-medium leading-snug">
                  {activity.subtitle}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
