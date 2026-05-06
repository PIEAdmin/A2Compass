/* ═══════════════════════════════════════════════════════════
   🪙  SPARK POINTS SERVICE — A² Compass
   In-app currency for the reward ecosystem
   ═══════════════════════════════════════════════════════════ */

import { supabase } from './supabase';

export interface RewardShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  cost: number;
  image_emoji: string;
  is_seasonal: boolean;
  season: string | null;
  requires_unit_completion: boolean;
}

export interface StudentReward {
  id: string;
  item_id: string;
  is_equipped: boolean;
  purchased_at: string;
  item?: RewardShopItem;
}

// Point values for different actions
export const POINT_VALUES = {
  daily_login: 5,
  activity_complete: 10,
  mastery: 50,
  perfect_quiz: 25,
  streak_7: 25,
  streak_30: 100,
  streak_100: 500,
  assessment_complete: 15,
} as const;

export const sparkPointsService = {
  /** Get student's current total points */
  async getBalance(studentProfileId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_spark_points', {
      p_student_profile_id: studentProfileId,
    });
    if (error) { console.error('getBalance error:', error); return 0; }
    return data ?? 0;
  },

  /** Award points to a student */
  async award(
    studentProfileId: string,
    amount: number,
    reason: string,
    description?: string,
    relatedId?: string
  ): Promise<number> {
    const { data, error } = await supabase.rpc('award_spark_points', {
      p_student_profile_id: studentProfileId,
      p_amount: amount,
      p_reason: reason,
      p_description: description || null,
      p_related_id: relatedId || null,
    });
    if (error) { console.error('award error:', error); return 0; }
    return data ?? 0;
  },

  /** Get available shop items */
  async getShopItems(): Promise<RewardShopItem[]> {
    const { data, error } = await supabase
      .from('reward_shop_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) { console.error('getShopItems error:', error); return []; }
    return data ?? [];
  },

  /** Get student's purchased rewards */
  async getMyRewards(studentProfileId: string): Promise<StudentReward[]> {
    const { data, error } = await supabase
      .from('student_rewards')
      .select('*, item:reward_shop_items(*)')
      .eq('student_profile_id', studentProfileId);
    if (error) { console.error('getMyRewards error:', error); return []; }
    return data ?? [];
  },

  /** Purchase an item */
  async purchaseItem(studentProfileId: string, itemId: string, cost: number): Promise<{ success: boolean; newBalance: number; error?: string }> {
    // Check balance
    const balance = await this.getBalance(studentProfileId);
    if (balance < cost) {
      return { success: false, newBalance: balance, error: 'Not enough Spark Points!' };
    }

    // Deduct points
    const newBalance = await this.award(studentProfileId, -cost, 'purchase', `Purchased reward item`);

    // Add to student's rewards
    const { error } = await supabase
      .from('student_rewards')
      .insert({ student_profile_id: studentProfileId, item_id: itemId });

    if (error) {
      // Refund if insert fails
      await this.award(studentProfileId, cost, 'refund', 'Purchase failed — refunded');
      return { success: false, newBalance: balance, error: 'Already owned or purchase failed' };
    }

    return { success: true, newBalance };
  },

  /** Equip/unequip an item */
  async toggleEquip(rewardId: string, equipped: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('student_rewards')
      .update({ is_equipped: equipped })
      .eq('id', rewardId);
    return !error;
  },

  /** Get recent point history */
  async getHistory(studentProfileId: string, limit = 20) {
    const { data, error } = await supabase
      .from('spark_points')
      .select('*')
      .eq('student_profile_id', studentProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('getHistory error:', error); return []; }
    return data ?? [];
  },
};
