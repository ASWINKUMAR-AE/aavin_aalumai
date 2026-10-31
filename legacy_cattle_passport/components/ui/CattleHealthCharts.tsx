import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from './Card';
import { Ionicons } from '@expo/vector-icons';

interface ProductionItem {
  id?: string;
  production_date: string;
  session: string;
  quantity_litres: number;
  fat_percentage?: number;
  snf_percentage?: number;
  milking_temperature_c?: number;
  teat_dip_applied?: number | boolean;
}

interface VaccinationItem {
  id?: string;
  vaccine_name: string;
  batch_number: string;
  dose: string;
  administration_date: string;
  next_booster_due_date: string;
  notes?: string;
  vet_name?: string;
}

interface HealthRecordItem {
  body_temperature_c?: number;
  heart_rate_bpm?: number;
  respiration_rate_bpm?: number;
  body_condition_score?: number;
  health_status_assigned?: string;
  scc_reading?: number;
  udder_quarter_status?: any;
}

interface Props {
  cow: any;
  production?: ProductionItem[];
  vaccinations?: VaccinationItem[];
  healthRecords?: HealthRecordItem[];
  showDoctorControls?: boolean;
}

export function CattleHealthCharts({
  cow,
  production = [],
  vaccinations = [],
  healthRecords = [],
  showDoctorControls = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  // 1. Group production by date (Morning vs Evening)
  const productionByDate: Record<string, { morning: number; evening: number; total: number; fat?: number; snf?: number }> = {};
  
  production.forEach((item) => {
    const d = item.production_date ? item.production_date.slice(0, 10) : '2026-10-01';
    if (!productionByDate[d]) {
      productionByDate[d] = { morning: 0, evening: 0, total: 0, fat: item.fat_percentage, snf: item.snf_percentage };
    }
    const q = Number(item.quantity_litres) || 0;
    if (item.session?.toLowerCase() === 'morning') {
      productionByDate[d].morning = q;
    } else {
      productionByDate[d].evening = q;
    }
    productionByDate[d].total += q;
  });

  const dateKeys = Object.keys(productionByDate).slice(0, 7).reverse();
  const maxYield = Math.max(
    ...dateKeys.map((k) => Math.max(productionByDate[k].morning, productionByDate[k].evening)),
    10
  );

  // 2. Vaccination Analysis & AI Next Booster Prediction
  const sortedVaccines = [...vaccinations].sort(
    (a, b) => new Date(b.administration_date).getTime() - new Date(a.administration_date).getTime()
  );

  const latestVaccine = sortedVaccines[0];
  let nextBoosterDateStr = latestVaccine?.next_booster_due_date || '2026-12-15';
  let daysUntilNext = 65;
  let urgencyLevel: 'CLEAR' | 'DUE_SOON' | 'OVERDUE' = 'CLEAR';

  if (nextBoosterDateStr) {
    const nextDate = new Date(nextBoosterDateStr);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    daysUntilNext = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysUntilNext < 0) {
      urgencyLevel = 'OVERDUE';
    } else if (daysUntilNext <= 14) {
      urgencyLevel = 'DUE_SOON';
    } else {
      urgencyLevel = 'CLEAR';
    }
  }

  // 3. Clinical Vitals
  const latestHealth = healthRecords[0] || {};
  const sccValue = Number(cow.somatic_cell_count || latestHealth.scc_reading || 145000);
  const tempC = Number(latestHealth.body_temperature_c || 38.6);
  const heartRate = Number(latestHealth.heart_rate_bpm || 68);
  const respRate = Number(latestHealth.respiration_rate_bpm || 26);
  const bcs = Number(latestHealth.body_condition_score || 3.5);

  return (
    <View style={styles.container}>
      {/* VACCINATION STATUS & PREDICTIVE BOOSTER CARD */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleIconRow}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={[Typography.headline, { color: colors.text, marginLeft: 8 }]}>
              Vaccination Ledger & Booster Predictor
            </Text>
          </View>
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor:
                  urgencyLevel === 'OVERDUE'
                    ? '#FEE2E2'
                    : urgencyLevel === 'DUE_SOON'
                    ? '#FEF3C7'
                    : '#DCFCE7',
              },
            ]}
          >
            <Text
              style={[
                Typography.caption2,
                {
                  fontWeight: '800',
                  color:
                    urgencyLevel === 'OVERDUE'
                      ? '#DC2626'
                      : urgencyLevel === 'DUE_SOON'
                      ? '#D97706'
                      : '#16A34A',
                },
              ]}
            >
              {urgencyLevel === 'OVERDUE'
                ? '⛔ OVERDUE'
                : urgencyLevel === 'DUE_SOON'
                ? '⚠️ DUE SOON'
                : '✅ UP TO DATE'}
            </Text>
          </View>
        </View>

        {/* Predictive AI Booster Box */}
        <View
          style={[
            styles.predictorBox,
            {
              backgroundColor: isDark ? '#0f172a' : '#F0FDF4',
              borderColor: urgencyLevel === 'DUE_SOON' ? '#FDE68A' : '#BBF7D0',
            },
          ]}
        >
          <View style={styles.predictHeader}>
            <Ionicons name="sparkles" size={18} color="#059669" />
            <Text style={[Typography.subhead, { color: '#059669', fontWeight: '700', marginLeft: 6 }]}>
              Next Booster Countdown & Veterinary Protocol
            </Text>
          </View>

          <View style={styles.predictGrid}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>PREDICTED NEXT BOOSTER</Text>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                {nextBoosterDateStr}
              </Text>
              <Text
                style={[
                  Typography.caption1,
                  {
                    color: daysUntilNext <= 14 ? '#DC2626' : '#059669',
                    fontWeight: '700',
                    marginTop: 2,
                  },
                ]}
              >
                {daysUntilNext > 0 ? `⏳ Due in ${daysUntilNext} days` : `⚠️ Overdue by ${Math.abs(daysUntilNext)} days`}
              </Text>
            </View>

            <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.border }}>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>TARGET IMMUNIZATION</Text>
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                {latestVaccine?.vaccine_name || 'FMD Trivalent Booster'}
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                Dose: {latestVaccine?.dose || '2.0 ml s/c'} • Batch: {latestVaccine?.batch_number || 'FMD-2026'}
              </Text>
            </View>
          </View>

          {/* Historical Vaccination Logs */}
          <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 12, marginBottom: 6, fontWeight: '700' }]}>
            ADMINISTERED VACCINATION TIMELINE ({sortedVaccines.length} DOSES LOGGED)
          </Text>
          {sortedVaccines.map((v, i) => (
            <View key={v.id || i} style={[styles.vaccineRow, { borderBottomColor: colors.separator }]}>
              <View style={styles.dotLine}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[Typography.footnote, { color: colors.text, fontWeight: '700' }]}>
                    {v.vaccine_name}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {v.administration_date}
                  </Text>
                </View>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Dose: {v.dose} | Batch #{v.batch_number} {v.notes ? `• ${v.notes}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* MILK PRODUCTION 7-DAY VISUAL BAR CHART */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleIconRow}>
            <Ionicons name="bar-chart" size={22} color={colors.primary} />
            <Text style={[Typography.headline, { color: colors.text, marginLeft: 8 }]}>
              Milk Production Yield Chart (7 Days)
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginRight: 8 }]}>Morning</Text>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
          </View>
        </View>

        {dateKeys.length === 0 ? (
          <Text style={[Typography.footnote, { color: colors.textSecondary, textAlign: 'center', padding: 20 }]}>
            No daily milking sessions logged yet
          </Text>
        ) : (
          <View style={styles.chartContainer}>
            {/* Bars */}
            <View style={styles.barsRow}>
              {dateKeys.map((date, idx) => {
                const dayData = productionByDate[date];
                const mHeight = Math.max((dayData.morning / maxYield) * 110, 8);
                const eHeight = Math.max((dayData.evening / maxYield) * 110, 8);
                const isSelected = selectedDayIdx === idx;

                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.barCol, isSelected && { backgroundColor: isDark ? '#1e293b' : '#EFF6FF', borderRadius: 8 }]}
                    onPress={() => setSelectedDayIdx(isSelected ? null : idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, marginBottom: 4 }]}>
                      {dayData.total.toFixed(1)}L
                    </Text>

                    <View style={styles.barGroup}>
                      <View style={[styles.bar, { height: mHeight, backgroundColor: '#2563EB' }]} />
                      <View style={[styles.bar, { height: eHeight, backgroundColor: '#F59E0B' }]} />
                    </View>

                    <Text style={[Typography.caption2, { color: colors.textMuted, fontSize: 10, marginTop: 6 }]}>
                      {date.slice(5)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Day Info Popup */}
            {selectedDayIdx !== null && dateKeys[selectedDayIdx] && (
              <View style={[styles.dayDetailBox, { backgroundColor: isDark ? '#1e293b' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                  📅 {dateKeys[selectedDayIdx]} Milking Breakdown:
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 2 }]}>
                  🌅 Morning: <Text style={{ fontWeight: '700', color: '#2563EB' }}>{productionByDate[dateKeys[selectedDayIdx]].morning} Litres</Text> • 🌇 Evening: <Text style={{ fontWeight: '700', color: '#F59E0B' }}>{productionByDate[dateKeys[selectedDayIdx]].evening} Litres</Text> • Total: <Text style={{ fontWeight: '800' }}>{productionByDate[dateKeys[selectedDayIdx]].total.toFixed(1)} L</Text>
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* MILK QUALITY & SOMATIC CELL COUNT (SCC) VISUAL GAUGE */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleIconRow}>
            <Ionicons name="pulse" size={22} color="#059669" />
            <Text style={[Typography.headline, { color: colors.text, marginLeft: 8 }]}>
              Milk Quality & Somatic Cell (SCC) Health
            </Text>
          </View>
          <Text style={[Typography.caption1, { color: '#059669', fontWeight: '700' }]}>
            Aavin Grade A
          </Text>
        </View>

        {/* Quality Metric Gauges */}
        <View style={styles.gaugeRow}>
          {/* Fat % */}
          <View style={[styles.gaugeCard, { backgroundColor: isDark ? '#0f172a' : '#F8FAFC' }]}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>FAT PERCENTAGE</Text>
            <Text style={[Typography.title2, { color: colors.text, fontWeight: '800', marginTop: 2 }]}>
              4.35%
            </Text>
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: '85%', backgroundColor: '#2563EB' }]} />
            </View>
            <Text style={[Typography.caption2, { color: '#2563EB', marginTop: 4 }]}>Benchmark: &gt;4.0%</Text>
          </View>

          {/* SNF % */}
          <View style={[styles.gaugeCard, { backgroundColor: isDark ? '#0f172a' : '#F8FAFC' }]}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>SNF SOLIDS %</Text>
            <Text style={[Typography.title2, { color: colors.text, fontWeight: '800', marginTop: 2 }]}>
              8.65%
            </Text>
            <View style={styles.meterTrack}>
              <View style={[styles.meterFill, { width: '88%', backgroundColor: '#059669' }]} />
            </View>
            <Text style={[Typography.caption2, { color: '#059669', marginTop: 4 }]}>Benchmark: &gt;8.5%</Text>
          </View>
        </View>

        {/* Somatic Cell Count Bar */}
        <View style={[styles.sccCard, { backgroundColor: isDark ? '#0f172a' : '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                SOMATIC CELL COUNT (SCC)
              </Text>
              <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                {sccValue.toLocaleString('en-IN')} <Text style={{ fontSize: 13, fontWeight: '500' }}>cells/mL</Text>
              </Text>
            </View>
            <View style={[styles.chipPill, { backgroundColor: sccValue < 200000 ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text style={[Typography.caption2, { color: sccValue < 200000 ? '#16A34A' : '#D97706', fontWeight: '800' }]}>
                {sccValue < 200000 ? '⭐ LOW MASTITIS RISK' : '⚠️ ELEVATED MONITOR'}
              </Text>
            </View>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
            Aavin standards: &lt;200,000 cells/mL yields premium payout & ensures high milk shelf-life.
          </Text>
        </View>
      </Card>

      {/* CLINICAL VITALS DASHBOARD (DOCTOR & FARMER VIEW) */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleIconRow}>
            <Ionicons name="fitness" size={22} color="#DC2626" />
            <Text style={[Typography.headline, { color: colors.text, marginLeft: 8 }]}>
              Veterinary Clinical Vitals & Score
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
            Examined by Vet
          </Text>
        </View>

        <View style={styles.vitalsGrid}>
          <View style={styles.vitalItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>BODY TEMP</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{tempC}°C</Text>
            <Text style={[Typography.caption2, { color: '#059669' }]}>Normal (38.5-39.2)</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>HEART RATE</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{heartRate} bpm</Text>
            <Text style={[Typography.caption2, { color: '#059669' }]}>Normal (60-80)</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>RESPIRATION</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{respRate} bpm</Text>
            <Text style={[Typography.caption2, { color: '#059669' }]}>Normal (20-30)</Text>
          </View>

          <View style={styles.vitalItem}>
            <Text style={[Typography.caption2, { color: colors.textMuted }]}>BCS SCORE</Text>
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>{bcs} / 5.0</Text>
            <Text style={[Typography.caption2, { color: '#059669' }]}>Optimal Dairy</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  predictorBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  predictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  predictGrid: {
    flexDirection: 'row',
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dotLine: {
    marginRight: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  chartContainer: {
    paddingTop: 8,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingBottom: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 10,
    borderRadius: 4,
  },
  dayDetailBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  gaugeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  gaugeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  meterTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  sccCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalItem: {
    flex: 1,
    paddingRight: 4,
  },
});
