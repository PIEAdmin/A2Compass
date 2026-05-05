import { useState, useEffect } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  skillName: string;
  onClose: () => void;
  onWatched: () => void;
}

function getEmbedUrl(url: string): string | null {
  // YouTube: youtube.com/watch?v=XXX or youtu.be/XXX
  const ytLong = url.match(/(?:youtube\.com\/watch\?.*v=)([\w-]+)/);
  if (ytLong) return `https://www.youtube-nocookie.com/embed/${ytLong[1]}?rel=0&modestbranding=1`;

  const ytShort = url.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube-nocookie.com/embed/${ytShort[1]}?rel=0&modestbranding=1`;

  // YouTube embed URL (already embedded)
  const ytEmbed = url.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
  if (ytEmbed) return `https://www.youtube-nocookie.com/embed/${ytEmbed[1]}?rel=0&modestbranding=1`;

  // Vimeo: vimeo.com/XXX
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Vimeo embed URL (already embedded)
  const vimeoEmbed = url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoEmbed) return url;

  // Fallback — try using the URL as-is (might be a direct embed)
  return url;
}

export default function VideoPlayer({ videoUrl, skillName, onClose, onWatched }: VideoPlayerProps) {
  const [embedUrl] = useState(() => getEmbedUrl(videoUrl));

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleDoneWatching = () => {
    onWatched();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">📺</span>
            <h2 className="text-white font-bold text-lg truncate">{skillName}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/25 hover:bg-white/40 text-white text-xl font-bold transition-colors"
            aria-label="Close video"
          >
            ✕
          </button>
        </div>

        {/* Video area — responsive 16:9 */}
        <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`Lesson video: ${skillName}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              <p>Hmm, we can't play this video right now. Ask your teacher for help! 🤔</p>
            </div>
          )}
        </div>

        {/* Footer with Done button */}
        <div className="px-5 py-4 bg-gradient-to-b from-gray-50 to-white flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">
            Watch the lesson, then press Done! 🌟
          </p>
          <button
            onClick={handleDoneWatching}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-base rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            ✅ Done Watching
          </button>
        </div>
      </div>
    </div>
  );
}
