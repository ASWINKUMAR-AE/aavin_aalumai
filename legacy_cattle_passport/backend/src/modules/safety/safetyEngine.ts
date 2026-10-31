import { db } from '../../config/database.js';
import { SafetyDecisionResult, SafetyDecisionType } from '../../types/index.js';
import { RowDataPacket } from 'mysql2';

export interface QualityTestInput {
  fatPercent: number;
  snfPercent: number;
  temperatureC: number;
  densityGcm3?: number | null;
  adulterationDetected: boolean;
  adulterationTypesTested?: string;
}

export class MilkSafetyTwinEngine {
  /**
   * Deterministic 4-Domain Safety Evaluation Engine
   */
  static async evaluate(
    cowId: string,
    testInput: QualityTestInput
  ): Promise<SafetyDecisionResult> {
    const evaluatedAt = new Date().toISOString();

    // 1. Fetch active Quality Threshold Policy
    const [thresholdRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM quality_threshold_versions
       WHERE (effective_to IS NULL OR effective_to > UTC_TIMESTAMP())
       ORDER BY effective_from DESC LIMIT 1`
    );

    const thresholds = thresholdRows[0] || {
      version_code: 'AAVIN-DEFAULT-STD-2025',
      min_fat_percent: 3.5,
      min_snf_percent: 8.5,
      max_temperature_c: 12.0,
      fat_review_min: 3.0,
      fat_review_max: 3.49,
      snf_review_min: 8.0,
      snf_review_max: 8.49,
      min_density_g_cm3: 1.026,
      max_density_g_cm3: 1.032,
    };

    // 2. Fetch Active Veterinary Withdrawal Restrictions for this cow
    const [withdrawalRows] = await db.query<RowDataPacket[]>(
      `SELECT wr.*, tr.dosage, tr.reason_for_treatment,
              COALESCE(mc.brand_name, tr.custom_medicine_name) as medicine_name,
              u.full_name as prescribing_vet
       FROM withdrawal_restrictions wr
       JOIN treatment_records tr ON wr.treatment_id = tr.id
       LEFT JOIN medicine_catalog mc ON tr.medicine_id = mc.id
       JOIN users u ON tr.vet_user_id = u.id
       WHERE wr.cow_id = ? AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP()
       ORDER BY wr.restriction_end DESC LIMIT 1`,
      [cowId]
    );

    // 3. Domain A & B Check: Active Veterinary Withdrawal
    let withdrawalStatus: 'PASSED' | 'FAILED' | 'REVIEW' = 'PASSED';
    let withdrawalDetails = 'No active veterinary withdrawal restriction recorded. Animal cleared for milking.';
    let activeRestrictionUntil: string | null = null;
    let medicineName: string | null = null;

    if (withdrawalRows.length > 0) {
      const activeWd = withdrawalRows[0];
      withdrawalStatus = 'FAILED';
      activeRestrictionUntil = activeWd.restriction_end;
      medicineName = activeWd.medicine_name;
      withdrawalDetails = `CRITICAL FOOD SAFETY RESTRICTION: Active veterinary withdrawal for '${activeWd.medicine_name}' in force until ${new Date(activeWd.restriction_end).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Reason: ${activeWd.reason_for_treatment}`;
    }

    // 4. Domain C Check: Adulteration Screening
    let adulterationStatus: 'PASSED' | 'FAILED' = 'PASSED';
    if (testInput.adulterationDetected) {
      adulterationStatus = 'FAILED';
    }

    // 5. Domain C Check: Fat Percentage
    let fatStatus: 'PASSED' | 'REVIEW' | 'FAILED' = 'PASSED';
    let fatMessage = `Fat (${testInput.fatPercent}%) meets standard (>= ${thresholds.min_fat_percent}%)`;

    if (testInput.fatPercent < thresholds.fat_review_min) {
      fatStatus = 'FAILED';
      fatMessage = `Fat (${testInput.fatPercent}%) is critically low (< ${thresholds.fat_review_min}%)`;
    } else if (
      testInput.fatPercent >= thresholds.fat_review_min &&
      testInput.fatPercent <= thresholds.fat_review_max
    ) {
      fatStatus = 'REVIEW';
      fatMessage = `Fat (${testInput.fatPercent}%) falls in review warning boundary (${thresholds.fat_review_min}% - ${thresholds.fat_review_max}%)`;
    }

    // 6. Domain C Check: SNF (Solids-Not-Fat) Percentage
    let snfStatus: 'PASSED' | 'REVIEW' | 'FAILED' = 'PASSED';
    let snfMessage = `SNF (${testInput.snfPercent}%) meets standard (>= ${thresholds.min_snf_percent}%)`;

    if (testInput.snfPercent < thresholds.snf_review_min) {
      snfStatus = 'FAILED';
      snfMessage = `SNF (${testInput.snfPercent}%) is critically low (< ${thresholds.snf_review_min}%)`;
    } else if (
      testInput.snfPercent >= thresholds.snf_review_min &&
      testInput.snfPercent <= thresholds.snf_review_max
    ) {
      snfStatus = 'REVIEW';
      snfMessage = `SNF (${testInput.snfPercent}%) falls in review warning boundary (${thresholds.snf_review_min}% - ${thresholds.snf_review_max}%)`;
    }

    // 7. Domain C Check: Temperature
    let tempStatus: 'PASSED' | 'REVIEW' | 'FAILED' = 'PASSED';
    let tempMessage = `Temperature (${testInput.temperatureC}°C) within chilled transport safety limit (<= ${thresholds.max_temperature_c}°C)`;

    if (testInput.temperatureC > thresholds.max_temperature_c) {
      tempStatus = 'REVIEW';
      tempMessage = `Temperature (${testInput.temperatureC}°C) exceeds max recommended intake threshold (${thresholds.max_temperature_c}°C)`;
    }

    // 8. Overall Safety Decision Synthesis (HOLD > REVIEW > CLEAR)
    let decision: SafetyDecisionType = 'CLEAR';
    let primaryReason = 'All recorded animal health, clinical withdrawal, and milk quality checks passed standard policy.';

    // Priority 1: Critical HOLD conditions
    if (withdrawalStatus === 'FAILED') {
      decision = 'HOLD';
      primaryReason = `MANDATORY SAFETY HOLD: Animal is under active veterinary withdrawal restriction until ${activeRestrictionUntil}.`;
    } else if (adulterationStatus === 'FAILED') {
      decision = 'HOLD';
      primaryReason = `MANDATORY SAFETY HOLD: Adulteration detected during analyzer screening test.`;
    } else if (fatStatus === 'FAILED' || snfStatus === 'FAILED') {
      decision = 'HOLD';
      primaryReason = `QUALITY HOLD: Fat or SNF percentage is below minimum critical safety thresholds.`;
    }
    // Priority 2: REVIEW warning conditions
    else if (fatStatus === 'REVIEW' || snfStatus === 'REVIEW' || tempStatus === 'REVIEW') {
      decision = 'REVIEW';
      const reasons: string[] = [];
      if (fatStatus === 'REVIEW') reasons.push(`Fat in review range (${testInput.fatPercent}%)`);
      if (snfStatus === 'REVIEW') reasons.push(`SNF in review range (${testInput.snfPercent}%)`);
      if (tempStatus === 'REVIEW') reasons.push(`High temperature (${testInput.temperatureC}°C)`);
      primaryReason = `FLAGGED FOR OPERATOR REVIEW: ${reasons.join('; ')}`;
    }

    return {
      decision,
      primaryReason,
      checks: {
        withdrawal: {
          status: withdrawalStatus,
          details: withdrawalDetails,
          activeRestrictionUntil,
          medicineName,
        },
        fat: {
          status: fatStatus,
          value: testInput.fatPercent,
          threshold: thresholds.min_fat_percent,
          message: fatMessage,
        },
        snf: {
          status: snfStatus,
          value: testInput.snfPercent,
          threshold: thresholds.min_snf_percent,
          message: snfMessage,
        },
        temperature: {
          status: tempStatus,
          value: testInput.temperatureC,
          maxThreshold: thresholds.max_temperature_c,
          message: tempMessage,
        },
        adulteration: {
          status: adulterationStatus,
          detected: testInput.adulterationDetected,
          typesTested: testInput.adulterationTypesTested || 'urea,starch,detergent,sugar,salt',
        },
      },
      ruleVersion: thresholds.version_code,
      evaluatedAt,
    };
  }
}
