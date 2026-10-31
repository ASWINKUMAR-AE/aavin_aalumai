import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import * as Haptics from 'expo-haptics';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  values,
  selectedIndex,
  onChange,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const handleSelect = (idx: number) => {
    if (idx !== selectedIndex) {
      Haptics.selectionAsync().catch(() => {});
      onChange(idx);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.card : '#E2E8F0',
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {values.map((val, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <Pressable
            key={val}
            onPress={() => handleSelect(idx)}
            style={[
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                {
                  backgroundColor: isDark ? colors.primaryDark : '#FFFFFF',
                  shadowColor: '#000000',
                },
              ],
            ]}
          >
            <Text
              style={[
                Typography.footnote,
                {
                  color: isSelected ? (isDark ? '#FFFFFF' : colors.text) : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {val}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginVertical: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedSegment: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
