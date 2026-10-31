import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  rightComponent?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  value,
  icon,
  iconColor,
  iconBg,
  rightComponent,
  showChevron = false,
  onPress,
  isLast = false,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    }
  };

  const RowContent = (
    <View style={[styles.row, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: iconBg || colors.primaryLight }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.primary} />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[Typography.body, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.rightContainer}>
        {value && (
          <Text style={[Typography.subhead, { color: colors.textSecondary, marginRight: showChevron ? 6 : 0 }]}>
            {value}
          </Text>
        )}
        {rightComponent}
        {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {onPress ? (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [{ backgroundColor: pressed ? colors.separator : 'transparent' }]}
        >
          {RowContent}
        </Pressable>
      ) : (
        RowContent
      )}
      {!isLast && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
});
