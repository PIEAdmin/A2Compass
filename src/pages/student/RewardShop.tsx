import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks';
import { supabase } from '../../services/supabase';
import { sparkPointsService, type RewardShopItem, type StudentReward } from '../../services/sparkPoints.service';
import { PenguinMascot } from '../../components/shared/PepperPenguin';
import { EmptyStatePenguin } from '../../components/shared/EmptyStatePenguin';
import { LoadingState } from '../../components/shared/LoadingState';
import { ConfettiEffect } from '../../components/shared/ConfettiEffect';
import { useSound } from '../../hooks/useSound';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  hat: { label: 'Hats', icon: '🎩' },
  glasses: { label: 'Glasses', icon: '👓' },
  scarf: { label: 'Scarves', icon: '🧣' },
  wings: { label: 'Wings & Jets', icon: '🚀' },
  background: { label: 'Backgrounds', icon: '🖼️' },
  sticker: { label: 'Stickers', icon: '⭐' },
  special: { label: 'Special Items', icon: '👑' },
};

export default function RewardShop() {
  const { user } = useAuth();
  const { play } = useSound();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<RewardShopItem[]>([]);
  const [myRewards, setMyRewards] = useState<StudentReward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get student profile ID
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!sp) return;
      setStudentProfileId(sp.id);

      const [bal, shopItems, rewards] = await Promise.all([
        sparkPointsService.getBalance(sp.id),
        sparkPointsService.getShopItems(),
        sparkPointsService.getMyRewards(sp.id),
      ]);
      setBalance(bal);
      setItems(shopItems);
      setMyRewards(rewards);
    } catch (e) {
      console.error('Failed to load reward shop:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePurchase = async (item: RewardShopItem) => {
    if (!studentProfileId) return;
    setPurchasing(item.id);
    setMessage(null);

    const result = await sparkPointsService.purchaseItem(studentProfileId, item.id, item.cost);
    
    if (result.success) {
      play('coins');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      setBalance(result.newBalance);
      setMessage({ text: `🎉 You got the ${item.name}!`, type: 'success' });
      loadData();
    } else {
      play('incorrect');
      setMessage({ text: result.error || 'Purchase failed', type: 'error' });
    }
    setPurchasing(null);
  };

  const ownedIds = new Set(myRewards.map(r => r.item_id));
  const categories = ['all', ...new Set(items.map(i => i.category))];
  const filtered = selectedCategory === 'all' ? items : items.filter(i => i.category === selectedCategory);

  if (loading) return <LoadingState variant="packing" message="Opening the Reward Shop..." />;

  return (
    <div className="tier-page min-h-screen pb-24 page-enter">
      <ConfettiEffect active={showConfetti} variant="stars" />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white p-6 rounded-b-3xl shadow-lg mb-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <PenguinMascot mood="waving" size={80} />
            <div>
              <h1 className="text-2xl font-black">✨ Reward Shop</h1>
              <p className="text-amber-100 font-medium">Spend your Spark Points on cool stuff!</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-3 text-center">
            <div className="text-3xl font-black">🪙 {balance.toLocaleString()}</div>
            <div className="text-amber-100 text-sm font-medium">Spark Points</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`max-w-4xl mx-auto px-4 mb-4`}>
          <div className={`p-4 rounded-xl font-bold text-center badge-fly-in ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); play('click'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all btn-animated
                ${selectedCategory === cat 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'}`}
            >
              <span>{cat === 'all' ? '🛍️' : CATEGORY_LABELS[cat]?.icon || '📦'}</span>
              <span>{cat === 'all' ? 'All Items' : CATEGORY_LABELS[cat]?.label || cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-4xl mx-auto px-4">
        {filtered.length === 0 ? (
          <EmptyStatePenguin context="rewards" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(item => {
              const owned = ownedIds.has(item.id);
              const canAfford = balance >= item.cost;

              return (
                <div
                  key={item.id}
                  className={`tier-card card-animated p-4 text-center relative
                    ${owned ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
                >
                  {owned && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      ✓ Owned
                    </div>
                  )}
                  
                  <div className="text-5xl mb-3 float-animation" style={{ animationDelay: `${Math.random()}s` }}>
                    {item.image_emoji}
                  </div>
                  
                  <h3 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h3>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">{item.description}</p>
                  
                  <div className="flex items-center justify-center gap-1 mb-3 font-bold text-amber-600">
                    <span>🪙</span>
                    <span>{item.cost}</span>
                  </div>

                  {!owned && (
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford || purchasing === item.id}
                      className={`w-full py-2 rounded-xl font-bold text-sm transition-all btn-animated
                        ${canAfford 
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow hover:shadow-lg' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {purchasing === item.id ? '...' : canAfford ? 'Buy!' : 'Need more ✨'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Collection */}
      {myRewards.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 tier-heading">🎒 My Collection</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {myRewards.map(r => (
              <div key={r.id} className="flex-shrink-0 tier-card card-animated p-3 text-center min-w-[80px]">
                <div className="text-3xl mb-1">{(r as any).item?.image_emoji || '🎁'}</div>
                <div className="text-xs font-bold text-gray-600 truncate">{(r as any).item?.name || 'Item'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
