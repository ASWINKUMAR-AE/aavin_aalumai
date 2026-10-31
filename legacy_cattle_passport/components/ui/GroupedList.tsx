import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';

interface GroupedListProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GroupedList: React.FC<GroupedListProps> = ({ title, footer, children, style }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Text style={[Typography.footnote, styles.headerText, { color: colors.textSecondary }]}>
          {title.toUpperCase()}
        </Text>
      )}
      <View
        style={[
          styles.listGroup,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.border : 'transparent',
            borderWidth: isDark ? 1 : 0,
          },
        ]}
      >
        {children}
      </View>
      {footer && (
        <Text style={[Typography.caption1, styles.footerText, { color: colors.textMuted }]}>
          {footer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerText: {
    marginBottom: 6,
    marginLeft: 14,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  listGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  footerText: {
    marginTop: 6,
    marginLeft: 14,
  },
});
