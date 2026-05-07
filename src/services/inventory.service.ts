import { supabase } from './supabase';

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  slot: string;
  cost: number;
  rarity: string;
  image_url?: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  student_id: string;
  item_id: string;
  purchased_at: string;
  equipped: boolean;
  reward_items?: RewardItem;
}

export interface StudentEquipment {
  student_id: string;
  hat_item_id?: string;
  glasses_item_id?: string;
  scarf_item_id?: string;
  wings_item_id?: string;
  background_item_id?: string;
  sticker_item_id?: string;
  special_item_id?: string;
}

// Get student profile ID for current user
async function getStudentProfileId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  return data?.id || null;
}

// Fetch all active reward items from catalog
export async function getRewardCatalog(): Promise<RewardItem[]> {
  const { data, error } = await supabase
    .from('reward_items')
    .select('*')
    .eq('is_active', true)
    .order('cost', { ascending: true });
  if (error) { console.error('Error fetching catalog:', error); return []; }
  return data || [];
}

// Fetch student's inventory (owned items)
export async function getStudentInventory(): Promise<InventoryItem[]> {
  const studentId = await getStudentProfileId();
  if (!studentId) return [];
  const { data, error } = await supabase
    .from('student_inventory')
    .select('*, reward_items(*)')
    .eq('student_id', studentId);
  if (error) { console.error('Error fetching inventory:', error); return []; }
  return data || [];
}

// Fetch student's currently equipped items
export async function getStudentEquipment(): Promise<StudentEquipment | null> {
  const studentId = await getStudentProfileId();
  if (!studentId) return null;
  const { data, error } = await supabase
    .from('student_equipment')
    .select('*')
    .eq('student_id', studentId)
    .single();
  if (error && error.code !== 'PGRST116') { console.error('Error fetching equipment:', error); }
  return data || null;
}

// Purchase an item (deduct Spark Points, add to inventory)
export async function purchaseItem(itemId: string, cost: number): Promise<{ success: boolean; message: string }> {
  const studentId = await getStudentProfileId();
  if (!studentId) return { success: false, message: 'Not logged in' };

  // Check if already owned
  const { data: existing } = await supabase
    .from('student_inventory')
    .select('id')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .single();
  if (existing) return { success: false, message: 'You already own this item!' };

  // Check Spark Points balance
  const { data: points } = await supabase
    .from('spark_points')
    .select('balance')
    .eq('student_id', studentId)
    .single();
  const balance = points?.balance || 0;
  if (balance < cost) return { success: false, message: `Not enough Spark Points! You need ${cost - balance} more.` };

  // Deduct points
  await supabase
    .from('spark_points')
    .update({ balance: balance - cost, updated_at: new Date().toISOString() })
    .eq('student_id', studentId);

  // Add to inventory
  const { error } = await supabase
    .from('student_inventory')
    .insert({ student_id: studentId, item_id: itemId });
  if (error) return { success: false, message: 'Purchase failed. Points refunded.' };

  return { success: true, message: 'Item purchased! Visit My Locker to equip it.' };
}

// Equip an item (update equipment slot)
export async function equipItem(itemId: string, slot: string): Promise<boolean> {
  const studentId = await getStudentProfileId();
  if (!studentId) return false;

  const slotColumn = `${slot}_item_id`;

  // Upsert equipment row
  const { error } = await supabase
    .from('student_equipment')
    .upsert({
      student_id: studentId,
      [slotColumn]: itemId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'student_id' });

  if (error) { console.error('Error equipping item:', error); return false; }

  // Mark in inventory
  await supabase
    .from('student_inventory')
    .update({ equipped: true })
    .eq('student_id', studentId)
    .eq('item_id', itemId);

  return true;
}

// Unequip an item
export async function unequipItem(slot: string): Promise<boolean> {
  const studentId = await getStudentProfileId();
  if (!studentId) return false;

  const slotColumn = `${slot}_item_id`;

  // Get current equipment to find old item
  const { data: equip } = await supabase
    .from('student_equipment')
    .select('*')
    .eq('student_id', studentId)
    .single();

  const oldItemId = equip?.[slotColumn as keyof typeof equip];

  // Clear the slot
  const { error } = await supabase
    .from('student_equipment')
    .update({ [slotColumn]: null, updated_at: new Date().toISOString() })
    .eq('student_id', studentId);

  if (error) { console.error('Error unequipping:', error); return false; }

  // Update inventory
  if (oldItemId) {
    await supabase
      .from('student_inventory')
      .update({ equipped: false })
      .eq('student_id', studentId)
      .eq('item_id', oldItemId);
  }

  return true;
}
