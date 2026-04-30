// ============================================================
// A² Compass — Billing Service (Updated with real pricing)
// ============================================================
import { supabase } from './supabase';
import type { PricingPackage, FoundersAccount, FamilyDiscount } from '../types/billing';

export const billingService = {
  // ---- Pricing Packages ----
  async getPricingPackages(): Promise<PricingPackage[]> {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async getPackagesByEnrollmentType(enrollmentTypeId: string): Promise<PricingPackage[]> {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('enrollment_type_id', enrollmentTypeId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  // ---- Founders' Rate ----
  async getFoundersAccount(parentId: string): Promise<FoundersAccount | null> {
    const { data, error } = await supabase
      .from('founders_accounts')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getFoundersCount(): Promise<number> {
    const { count, error } = await supabase
      .from('founders_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) throw error;
    return count || 0;
  },

  async grantFoundersRate(
    parentId: string,
    familyName: string,
    grantedBy: string
  ): Promise<FoundersAccount> {
    // Get current count to determine founders number
    const currentCount = await this.getFoundersCount();
    if (currentCount >= 10) {
      throw new Error('All 10 Founders slots have been filled');
    }

    // Snapshot current pricing
    const packages = await this.getPricingPackages();
    const pricingSnapshot: Record<string, number> = {};
    packages.forEach(pkg => {
      pricingSnapshot[pkg.slug] = pkg.price;
    });

    const { data, error } = await supabase
      .from('founders_accounts')
      .insert({
        parent_id: parentId,
        family_name: familyName,
        founders_number: currentCount + 1,
        rate_lock_pricing: pricingSnapshot,
        granted_by: grantedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listFoundersAccounts(): Promise<FoundersAccount[]> {
    const { data, error } = await supabase
      .from('founders_accounts')
      .select('*')
      .order('founders_number');
    if (error) throw error;
    return data || [];
  },

  // ---- Family Discounts ----
  async getFamilyDiscounts(parentId: string): Promise<FamilyDiscount[]> {
    const { data, error } = await supabase
      .from('family_discounts')
      .select('*')
      .eq('family_parent_id', parentId)
      .eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async calculateEffectivePrice(
    parentId: string,
    packageSlug: string,
    childOrder: number = 1
  ): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_effective_price', {
        p_parent_id: parentId,
        p_package_slug: packageSlug,
        p_child_order: childOrder,
      });
    if (error) throw error;
    return data;
  },

  // ---- Payment History ----
  async getPaymentHistory(parentId: string) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
