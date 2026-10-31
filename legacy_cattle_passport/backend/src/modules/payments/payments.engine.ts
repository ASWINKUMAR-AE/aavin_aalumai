import { db } from '../../config/database.js';
import { PaymentCalculationResult } from '../../types/index.js';
import { RowDataPacket } from 'mysql2';

export class PaymentCalculationEngine {
  /**
   * Deterministic transparent payment rate calculation based on Aavin Fat & SNF Matrix
   */
  static async calculateCollectionPayment(
    quantityLitres: number,
    fatPercent: number,
    snfPercent: number,
    isSafetyClear: boolean
  ): Promise<PaymentCalculationResult> {
    // Fetch active pricing rule
    const [pricingRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM milk_pricing_rules
       WHERE is_active = 1 AND (effective_to IS NULL OR effective_to > CURRENT_DATE())
       ORDER BY effective_from DESC LIMIT 1`
    );

    const rule = pricingRows[0] || {
      rule_code: 'AAVIN-COW-RATE-2025',
      base_rate_per_litre: 36.5,
      standard_fat_percent: 4.0,
      standard_snf_percent: 8.5,
      fat_increment_per_point: 0.35,
      snf_increment_per_point: 0.25,
      quality_incentive_flat: 1.0,
    };

    const baseRate = Number(rule.base_rate_per_litre);
    const standardFat = Number(rule.standard_fat_percent);
    const standardSnf = Number(rule.standard_snf_percent);
    const fatInc = Number(rule.fat_increment_per_point);
    const snfInc = Number(rule.snf_increment_per_point);
    const qualityIncentive = isSafetyClear ? Number(rule.quality_incentive_flat) : 0.0;

    // Increments (positive or negative based on differential from standard)
    const fatDiffRate = Number(((fatPercent - standardFat) * 10 * fatInc).toFixed(2));
    const snfDiffRate = Number(((snfPercent - standardSnf) * 10 * snfInc).toFixed(2));

    let ratePerLitre = Number((baseRate + fatDiffRate + snfDiffRate + qualityIncentive).toFixed(2));
    // Minimum safety rate floor to prevent negative rates
    if (ratePerLitre < 20.0) ratePerLitre = 20.0;

    // If safety decision is HOLD, payable amount is 0 until cleared
    const totalAmountInr = isSafetyClear ? Number((quantityLitres * ratePerLitre).toFixed(2)) : 0.0;

    return {
      quantityLitres,
      fatPercent,
      snfPercent,
      baseRate,
      fatDiffRate,
      snfDiffRate,
      qualityIncentive,
      ratePerLitre,
      totalAmountInr,
      ruleCode: rule.rule_code,
    };
  }
}
