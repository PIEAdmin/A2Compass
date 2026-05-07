import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PepperAvatar from '../../components/shared/PepperAvatar';
import { ReadAloud } from '../../components/shared/ReadAloud';
import {
  getStudentInventory,
  getStudentEquipment,
  equipItem,
  unequipItem,
  type InventoryItem,
  type StudentEquipment
} from '../../services/inventory.service';

const CATEGORIES = [
  { key: 'all', label: 'All Items', emoji: '🎒' },
  { key: 'hat', label: 'Hats', emoji: '🧢' },
  { key: 'glasses', label: 'Glasses', emoji: '👓' },
  { key: 'scarf', label: 'Scarves', emoji: '🧣' },
  { key: 'wings', label: 'Wings & Jets', emoji: '🦋' },
  { key: 'background', label: 'Backgrounds', emoji: '🖼️' },
  { key: 'sticker', label: 'Stickers', emoji: '⭐' },
  { key: 'special', label: 'Special Items', emoji: '🎁' },
];

const RARITY_COLORS: Record<string, string> = {
  common: 'border-gray-300 bg-gray-50',
  uncommon: 'border-green-400 bg-green-50',
  rare: 'border-blue-400 bg-blue-50',
  legendary: 'border-amber-400 bg-amber-50 shadow-amber-200/50 shadow-lg',
};

const RARITY_BADGES: Record<string, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  legendary: '🟡',
};

export default function MyLocker() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equipment, setEquipment] = useState<StudentEquipment | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [processingItem, setProcessingItem] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [inv, eq] = await Promise.all([getStudentInventory(), getStudentEquipment()]);
    setInventory(inv);
    setEquipment(eq);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredInventory = activeCategory === 'all'
    ? inventory
    : inventory.filter(i => i.reward_items?.slot === activeCategory);

  const isEquipped = (itemId: string, slot: string): boolean => {
    if (!equipment) return false;
    const key = `${slot}_item_id` as keyof StudentEquipment;
    return equipment[key] === itemId;
  };

  const handleEquip = async (item: InventoryItem) => {
    const rewardItem = item.reward_items;
    if (!rewardItem) return;
    setProcessingItem(item.id);
    setActionMessage(null);

    if (isEquipped(item.item_id, rewardItem.slot)) {
      const success = await unequipItem(rewardItem.slot);
      setActionMessage(success
        ? { text: `${rewardItem.emoji} ${rewardItem.name} unequipped!`, type: 'success' }
        : { text: 'Something went wrong. Try again!', type: 'error' }
      );
    } else {
      const success = await equipItem(item.item_id, rewardItem.slot);
      setActionMessage(success
        ? { text: `${rewardItem.emoji} ${rewardItem.name} equipped! Looking great!`, type: 'success' }
        : { text: 'Something went wrong. Try again!', type: 'error' }
      );
    }

    await loadData();
    setProcessingItem(null);
    setTimeout(() => setActionMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="text-6xl animate-bounce">🐧</span>
        <p className="text-lg text-gray-600 animate-pulse">Opening your locker...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Large Avatar Preview */}
          <div className="flex-shrink-0">
            <PepperAvatar size="xl" clickable={false} equipment={equipment} />
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 justify-center sm:justify-start">
              <ReadAloud text="My Locker">My Locker</ReadAloud> 🔐
            </h1>
            <p className="text-purple-100 mt-1">
              <ReadAloud text="Customize Pepper with your accessories!">
                Customize Pepper with your accessories!
              </ReadAloud>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                📦 {inventory.length} item{inventory.length !== 1 ? 's' : ''} owned
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                👗 {inventory.filter(i => i.equipped).length} equipped
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={`p-3 rounded-xl text-center font-medium animate-fade-in ${
          actionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? 'bg-purple-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            <span>{cat.emoji}</span> {cat.label}
            {cat.key !== 'all' && (
              <span className="ml-1 text-xs opacity-70">
                ({inventory.filter(i => cat.key === 'all' ? true : i.reward_items?.slot === cat.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border">
          <span className="text-6xl block mb-4">🐧</span>
          <p className="text-gray-600 text-lg">
            <ReadAloud text="No items yet! Visit the Reward Shop to buy cool accessories for Pepper!">
              No items yet! Visit the <Link to="/student/rewards" className="text-purple-600 underline font-medium">Reward Shop</Link> to buy cool accessories for Pepper!
            </ReadAloud>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredInventory.map(item => {
            const ri = item.reward_items;
            if (!ri) return null;
            const equipped = isEquipped(item.item_id, ri.slot);
            const processing = processingItem === item.id;
            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all hover:scale-105 ${
                  equipped
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300 shadow-md'
                    : RARITY_COLORS[ri.rarity] || RARITY_COLORS.common
                }`}
              >
                {/* Rarity badge */}
                <span className="absolute top-2 right-2 text-xs" title={ri.rarity}>
                  {RARITY_BADGES[ri.rarity]}
                </span>

                {/* Equipped badge */}
                {equipped && (
                  <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    Wearing
                  </span>
                )}

                {/* Item emoji */}
                <span className="text-4xl" role="img" aria-label={ri.name}>{ri.emoji}</span>

                {/* Item name */}
                <p className="font-medium text-sm text-center">
                  <ReadAloud text={ri.name}>{ri.name}</ReadAloud>
                </p>

                {/* Slot label */}
                <span className="text-xs text-gray-500 capitalize">{ri.slot}</span>

                {/* Equip/Unequip button */}
                <button
                  onClick={() => handleEquip(item)}
                  disabled={processing}
                  className={`w-full mt-auto px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    processing
                      ? 'bg-gray-200 text-gray-500 cursor-wait'
                      : equipped
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 active:scale-95'
                        : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  }`}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="animate-spin">⚙️</span> Working...
                    </span>
                  ) : equipped ? (
                    '❌ Unequip'
                  ) : (
                    '👕 Equip'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Shop link */}
      <div className="text-center pt-4">
        <Link
          to="/student/rewards"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-full font-bold hover:bg-amber-600 transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          🛍️ Visit Reward Shop
        </Link>
      </div>
    </div>
  );
}
