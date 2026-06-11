import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';

interface Video {
  id: string;
  title: string;
  category: string;
  youtubeId: string;
  description: string;
}

const STARTER_VIDEOS: Video[] = [
  { id: '1', title: 'ABC Phonics Song', category: 'Phonics Songs', youtubeId: 'hq3yfQnllfQ', description: 'Learn the alphabet with fun phonics!' },
  { id: '2', title: 'Counting to 20', category: 'Math Songs', youtubeId: 'TdDypyS_5zE', description: 'Count from 1 to 20 with this catchy tune!' },
  { id: '3', title: 'Colors of the Rainbow', category: 'Science Explorations', youtubeId: '8WEaEkjEys0', description: 'Learn about colors and light!' },
  { id: '4', title: 'The Very Hungry Caterpillar', category: 'Story Time', youtubeId: '75NQK-Sm1YY', description: 'Listen to this classic story!' },
  { id: '5', title: 'Shapes Song', category: 'Math Songs', youtubeId: 'UjG5HBKIFBA', description: 'Learn shapes with Pepper!' },
  { id: '6', title: 'Phonics Letter Sounds', category: 'Phonics Songs', youtubeId: 'BELlZKpi1Zs', description: 'Practice letter sounds A-Z!' },
];

const CATEGORIES = [
  { label: 'All', emoji: '🌟' },
  { label: 'Phonics Songs', emoji: '🔤' },
  { label: 'Math Songs', emoji: '🔢' },
  { label: 'Science Explorations', emoji: '🔬' },
  { label: 'Story Time', emoji: '📖' },
  { label: "Pepper's Tips", emoji: '🐾' },
];

const FLOATING_EMOJIS = ['🎬', '🎵', '📺', '⭐', '🎶', '🌈', '🎪', '✨'];

function extractYoutubeId(url: string): string {
  try {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : url;
  } catch {
    return url;
  }
}

export default function VideoLibrary() {
  const [videos, setVideos] = useState<Video[]>(STARTER_VIDEOS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const { data, error } = await supabase
          .from('video_library')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: Video[] = data.map((v: Record<string, unknown>) => ({
            id: String(v.id),
            title: String(v.title || ''),
            category: String(v.category || ''),
            youtubeId: extractYoutubeId(String(v.youtube_url || '')),
            description: String(v.description || ''),
          }));
          setVideos(mapped);
        }
      } catch {
        // Table doesn't exist or query failed — use fallback
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const filteredVideos = activeCategory === 'All'
    ? videos
    : videos.filter(v => v.category === activeCategory);

  const closeModal = useCallback(() => setSelectedVideo(null), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeModal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Floating background emojis */}
      {FLOATING_EMOJIS.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl opacity-10 pointer-events-none select-none"
          style={{
            left: `${(i * 13 + 5) % 90}%`,
            top: `${(i * 17 + 10) % 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-5xl sm:text-6xl mb-2"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            🎬
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Video Library
          </h1>
          <p className="text-gray-500 mt-1 text-base sm:text-lg">
            Watch, learn, and have fun! 🎉
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="sticky top-0 z-20 bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-purple-50/90 backdrop-blur-sm pb-4 -mx-4 px-4">
          <motion.div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat.label)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 min-h-[44px] ${
                  activeCategory === cat.label
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200'
                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                }`}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span>{cat.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <motion.div
              className="text-5xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              🎬
            </motion.div>
          </div>
        )}

        {/* Video Grid */}
        {!loading && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AnimatePresence mode="popLayout">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedVideo(video)}
                    className="w-full text-left bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden group cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                        <motion.div
                          className="w-14 h-14 sm:w-16 sm:h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:bg-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                        >
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </motion.div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-bold text-gray-800 text-base sm:text-lg leading-tight mb-1.5 line-clamp-2">
                        {video.title}
                      </h3>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 mb-2">
                        {CATEGORIES.find(c => c.label === video.category)?.emoji || '🎬'}{' '}
                        {video.category}
                      </span>
                      <p className="text-gray-500 text-sm line-clamp-2">
                        {video.description}
                      </p>
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && filteredVideos.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">No videos yet!</h3>
            <p className="text-gray-400">
              Check back soon for new {activeCategory !== 'All' ? activeCategory : ''} videos! 🎬
            </p>
          </motion.div>
        )}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden z-10"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={closeModal}
                className="absolute top-3 right-3 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>

              {/* YouTube Embed */}
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Video Info */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                      {selectedVideo.title}
                    </h2>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 mb-3">
                      {CATEGORIES.find(c => c.label === selectedVideo.category)?.emoji || '🎬'}{' '}
                      {selectedVideo.category}
                    </span>
                    <p className="text-gray-500 text-sm sm:text-base">
                      {selectedVideo.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
