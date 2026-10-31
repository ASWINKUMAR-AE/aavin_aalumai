import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  bordered?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, bordered = false, onLayout }) => {
  const { colors, isDark } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: bordered ? colors.border : isDark ? colors.border : '#E2EBF5',
      borderWidth: 1,
      shadowColor: '#123157',
    },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={cardStyle} onLayout={onLayout}>
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle} onLayout={onLayout}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
});
