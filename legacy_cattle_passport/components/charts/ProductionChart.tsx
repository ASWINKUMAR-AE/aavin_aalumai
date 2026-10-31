import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../ui/Card';

interface DataPoint {
  date: string;
  morning: number;
  evening: number;
  total: number;
}

interface ProductionChartProps {
  data: DataPoint[];
  title?: string;
}

export const ProductionChart: React.FC<ProductionChartProps> = ({
  data,
  title = '7-Day Milk Production (Litres)',
}) => {
  const { colors, isDark } = useTheme();

  // If no data provided, generate standard 7-day placeholder sample
  const chartData = data && data.length > 0 ? data : [
    { date: 'Mon', morning: 7.2, evening: 6.5, total: 13.7 },
    { date: 'Tue', morning: 7.5, evening: 6.8, total: 14.3 },
    { date: 'Wed', morning: 7.0, evening: 6.6, total: 13.6 },
    { date: 'Thu', morning: 7.8, evening: 7.0, total: 14.8 },
    { date: 'Fri', morning: 8.0, evening: 7.2, total: 15.2 },
    { date: 'Sat', morning: 7.6, evening: 6.9, total: 14.5 },
    { date: 'Sun', morning: 7.8, evening: 7.1, total: 14.9 },
  ];

  const maxVal = Math.max(...chartData.map((d) => d.total), 18);
  const chartHeight = 160;
  const chartWidth = 320;
  const barWidth = 26;
  const gap = (chartWidth - chartData.length * barWidth) / (chartData.length + 1);

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[Typography.headline, { color: colors.text }]}>{title}</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginRight: 8 }]}>Morning</Text>
          <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Evening</Text>
        </View>
      </View>

      <View style={styles.svgContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {chartData.map((item, idx) => {
            const x = gap + idx * (barWidth + gap);
            const morningHeight = (item.morning / maxVal) * (chartHeight - 40);
            const eveningHeight = (item.evening / maxVal) * (chartHeight - 40);
            const morningY = chartHeight - 25 - morningHeight;
            const eveningY = morningY - eveningHeight;

            return (
              <React.Fragment key={idx}>
                {/* Evening portion (stacked on top) */}
                <Rect
                  x={x}
                  y={eveningY}
                  width={barWidth}
                  height={eveningHeight}
                  fill="#FF9500"
                  rx={4}
                />
                {/* Morning portion */}
                <Rect
                  x={x}
                  y={morningY}
                  width={barWidth}
                  height={morningHeight}
                  fill={colors.primary}
                  rx={4}
                />
                {/* Total label above bar */}
                <SvgText
                  x={x + barWidth / 2}
                  y={eveningY - 4}
                  fontSize="10"
                  fontWeight="bold"
                  fill={colors.textSecondary}
                  textAnchor="middle"
                >
                  {item.total.toFixed(1)}
                </SvgText>
                {/* Day label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 8}
                  fontSize="11"
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {item.date.length > 5 ? item.date.slice(5) : item.date}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
