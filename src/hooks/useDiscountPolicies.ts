import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DiscountTier, DISCOUNT_TIER_OPTIONS } from '@/types/quote';

export interface DiscountPolicy {
  id: string;
  tier: DiscountTier;
  paymentTerms: string;
  avgDays: number;
  discountPct: number;
  code: string; // e.g. D-15, O-30/60
}

function buildCode(tier: DiscountTier, paymentTerms: string): string {
  const prefix = DISCOUNT_TIER_OPTIONS.find(t => t.value === tier)?.prefix || tier[0].toUpperCase();
  // Extract just the numbers portion: "15 DIAS / ANTECIPADO" -> "15", "30/60/90 DIAS" -> "30/60/90"
  const nums = paymentTerms
    .replace(/\s*DIAS?\s*/gi, '')
    .replace(/\s*\/\s*ANTECIPADO/gi, '')
    .replace(/\s+/g, '')
    .trim();
  return `${prefix}-${nums}`;
}

export function useDiscountPolicies() {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_policies')
        .select('*')
        .order('avg_days', { ascending: true });

      if (error) {
        console.error('Error fetching discount policies:', error);
        return;
      }

      setPolicies(
        (data || []).map(row => ({
          id: row.id,
          tier: row.tier as DiscountTier,
          paymentTerms: row.payment_terms,
          avgDays: row.avg_days,
          discountPct: Number(row.discount_pct),
          code: buildCode(row.tier as DiscountTier, row.payment_terms),
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const getPoliciesForTier = (tier: DiscountTier) => {
    return policies.filter(p => p.tier === tier);
  };

  const findPolicy = (tier: DiscountTier, installmentPlan: string): DiscountPolicy | undefined => {
    // Map installmentPlan (e.g. "30/60/90") to matching policy
    return policies.find(p => {
      if (p.tier !== tier) return false;
      // Normalize: extract only digits and slashes from both
      const policyNums = p.paymentTerms
        .replace(/\s*DIAS?\s*/gi, '')
        .replace(/\s*\/?\s*ANTECIPADO/gi, '')
        .replace(/\s+/g, '')
        .trim();
      const planNums = installmentPlan.replace(/\s+/g, '').trim();
      // Direct match
      if (policyNums === planNums) return true;
      // For "15" match "15 DIAS / ANTECIPADO"
      if (planNums === '15' && policyNums === '15') return true;
      return false;
    });
  };

  const getMaxDiscount = (tier: DiscountTier, installmentPlan: string): number | null => {
    const policy = findPolicy(tier, installmentPlan);
    return policy ? policy.discountPct : null;
  };

  return {
    policies,
    loading,
    getPoliciesForTier,
    findPolicy,
    getMaxDiscount,
  };
}
