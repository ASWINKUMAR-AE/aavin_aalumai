import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../../context/LanguageContext';
import { IndicTransLanguageSwitch } from './IndicTransLanguageSwitch';

interface LargeTitleHeaderProps {
  title: string;
  subtitle?: string;
  showLanguageSwitch?: boolean;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  rightActions?: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
    bg?: string;
  }>;
  onLogout?: () => void;
}

export const LargeTitleHeader: React.FC<LargeTitleHeaderProps> = ({
  title,
  subtitle,
  showLanguageSwitch = true,
  rightAction,
  rightActions,
  onLogout,
}) => {
  const { colors } = useTheme();
  const { language, toggleLanguage } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.topRow}>
        <View style={styles.textCol}>
          {subtitle && (
            <Text style={[Typography.footnote, { color: colors.primary, fontWeight: '700', textTransform: 'uppercase' }]}>
              {subtitle}
            </Text>
          )}
          <Text style={[Typography.largeTitle, { color: colors.text }]}>
            {title}
          </Text>
        </View>
        <View style={styles.actionsRow}>
          {showLanguageSwitch && (
            <IndicTransLanguageSwitch variant="compact" />
          )}
          {rightActions && rightActions.map((action, idx) => (
            <Pressable
              key={idx}
              onPress={action.onPress}
              style={[styles.actionBtn, { backgroundColor: action.bg || colors.primaryLight }]}
            >
              <Ionicons name={action.icon} size={20} color={action.color || colors.primary} />
            </Pressable>
          ))}
          {rightAction && (
            <Pressable
              onPress={rightAction.onPress}
              style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name={rightAction.icon} size={20} color={colors.primary} />
            </Pressable>
          )}
          {onLogout && (
            <Pressable
              onPress={onLogout}
              style={[styles.logoutPill, { backgroundColor: colors.holdBg || '#FEF2F2', borderColor: '#FECACA' }]}
              accessibilityLabel="Sign out of account"
            >
              <Ionicons name="log-out-outline" size={16} color={colors.hold || '#DC2626'} />
              <Text style={[Typography.caption1, { color: colors.hold || '#DC2626', fontWeight: '700', marginLeft: 4 }]}>
                {language === 'ta' ? 'வெளியேறு' : 'Logout'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
});


