import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'navy':
        return colors.navy;
      case 'secondary':
        return colors.primaryLight;
      case 'destructive':
        return colors.hold;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'navy':
      case 'destructive':
        return '#FFFFFF';
      case 'secondary':
        return colors.primaryDark;
      case 'outline':
        return colors.primaryDark;
      case 'ghost':
        return colors.text;
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, minHeight: 38, borderRadius: 20 };
      case 'lg':
        return { paddingVertical: 15, paddingHorizontal: 26, minHeight: 52, borderRadius: 28 };
      case 'md':
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, minHeight: 46, borderRadius: 24 };
    }
  };

  const textColor = getTextColor();
  const pad = getPadding();

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0,
          ...pad,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={textColor} style={styles.iconLeft} />
          )}
          <Text style={[Typography.headline, { color: textColor, fontSize: size === 'sm' ? 14 : 16 }, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={textColor} style={styles.iconRight} />
          )}
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
