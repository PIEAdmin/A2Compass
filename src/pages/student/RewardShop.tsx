import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PepperAvatar from '../../components/shared/PepperAvatar';
import { ReadAloud } from '../../components/shared/ReadAloud';
import {
  getRewardCatalog,
  getStudentInventory,
  purchaseItem,
  type RewardItem,
} from '../../services/inventory.service';
import { supabase } from '../../services/supabase';

const CATEGORIES = [
  { key: 'all', label: 'All Items', emoji: '🎁' },
  { key: 'hat', label: 'Hats', emoji: '🧢' },
  { key: 'glasses', label: 'Glasses', emoji: '👓' },
  { key: 'scarf', label: 'Scarves', emoji: '🧣' },
  { key: 'wings', label: 'Wings & Jets', emoji: '🦋' },
  { key: 'background', label: 'Backgrounds', emoji: '🖼️' },
  { key: 'sticker', label: 'Stickers', emoji: '⭐' },
  { key: 'special', label: 'Special Items', emoji: '🎁' },
];

const RARITY_GLOW: Record<string, string> = {
  common: '',
  uncommon: 'ring-1 ring-green-300',
  rare: 'ring-2 ring-blue-400 shadow-blue-100 shadow-md',
  legendary: 'ring-2 ring-amber-400 shadow-amber-200 shadow-lg animate-pulse-slow',
};

export default function RewardShop() {
  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confetti, setConfetti] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [items, inventory] = await Promise.all([
      getRewardCatalog(),
      getStudentInventory(),
    ]);
    setCatalog(items);
    setOwnedIds(new Set(inventory.map(i => i.item_id)));

    // Get balance
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: sp } = await supabase.from('student_profiles').select('id').eq('user_id', user.id).single();
      if (sp) {
        const { data: pts } = await supabase.from('spark_points').select('balance').eq('student_id', sp.id).single();
        setBalance(pts?.balance || 0);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePurchase = async (item: RewardItem) => {
    if (ownedIds.has(item.id)) return;
    setPurchasing(item.id);
    setMessage(null);

    const result = await purchaseItem(item.id, item.cost);

    if (result.success) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
      setMessage({ text: `🎉 You bought ${item.emoji} ${item.name}! Go to My Locker to equip it!`, type: 'success' });
    } else {
      setMessage({ text: result.message, type: 'error' });
    }

    await loadData();
    setPurchasing(null);
    setTimeout(() => setMessage(null), 5000);
  };

  const filtered = activeCategory === 'all'
    ? catalog
    : catalog.filter(i => i.category === activeCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-6xl animate-bounce">🐧</span>
        <p className="text-lg text-gray-600 animate-pulse">Opening the Reward Shop...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Confetti overlay */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-confetti-fall text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '✨', '⭐', '🪙', '🎊', '💎'][i % 6]}
            </span>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <PepperAvatar size="lg" clickable={false} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                <ReadAloud text="Reward Shop">🛍️ Reward Shop</ReadAloud>
              </h1>
              <p className="text-amber-100">
                <ReadAloud text="Spend your Spark Points on cool accessories for Pepper!">
                  Spend your Spark Points on cool accessories!
                </ReadAloud>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-amber-100">Your Balance</p>
              <p className="text-2xl font-bold">✨ {balance.toLocaleString()}</p>
            </div>
            <Link
              to="/student/locker"
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/30 transition-all text-center"
            >
              <p className="text-xs text-amber-100">My Locker</p>
              <p className="text-lg font-bold">🔐 Go</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl text-center font-medium text-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
          message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
          'bg-blue-100 text-blue-800 border border-blue-300'
        }`}>
          <ReadAloud text={message.text}>{message.text}</ReadAloud>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-amber-500 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-amber-50 border border-gray-200'
            }`}
          >
            <span>{cat.emoji}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.map(item => {
          const owned = ownedIds.has(item.id);
          const isPurchasing = purchasing === item.id;
          const canAfford = balance >= item.cost;
          return (
            <div
              key={item.id}
              className={`relative rounded-2xl border-2 p-4 flex flex-col items-center gap-2 bg-white transition-all hover:scale-105 ${
                owned ? 'border-green-400 bg-green-50' : RARITY_GLOW[item.rarity] || ''
              } ${!owned && !canAfford ? 'opacity-60' : ''}`}
            >
              {/* Rarity label */}
              {item.rarity !== 'common' && (
                <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.rarity === 'legendary' ? 'bg-amber-100 text-amber-800' :
                  item.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.rarity}
                </span>
              )}

              {/* Owned badge */}
              {owned && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  ✅ Owned
                </span>
              )}

              {/* Item */}
              <span className="text-5xl mt-2" role="img" aria-label={item.name}>{item.emoji}</span>
              <p className="font-bold text-sm text-center">
                <ReadAloud text={item.name}>{item.name}</ReadAloud>
              </p>
              <p className="text-xs text-gray-500 text-center line-clamp-2">
                {item.description}
              </p>

              {/* Price / Buy */}
              {owned ? (
                <Link
                  to="/student/locker"
                  className="w-full mt-auto px-3 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-all text-center active:scale-95"
                >
                  🔐 Equip in Locker
                </Link>
              ) : (
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={isPurchasing || !canAfford}
                  className={`w-full mt-auto px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    isPurchasing
                      ? 'bg-gray-200 text-gray-500 cursor-wait'
                      : canAfford
                        ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-md'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin">🪙</span> Buying...
                    </span>
                  ) : canAfford ? (
                    `✨ ${item.cost} Points`
                  ) : (
                    `Need ${item.cost - balance} more ✨`
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border">
          <span className="text-6xl block mb-4">🐧</span>
          <p className="text-gray-500">No items in this category yet!</p>
        </div>
      )}
    </div>
  );
}
