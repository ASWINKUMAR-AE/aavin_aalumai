import React from 'react';
import { StyleSheet, View, Image, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';

interface AavinLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  style?: ViewStyle;
  transparentBg?: boolean;
  opacity?: number;
}

export const AavinLogo: React.FC<AavinLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  style,
  transparentBg = false,
  opacity,
}) => {
  const { colors } = useTheme();

  const dimensions = {
    sm: { width: 90, height: 56 },
    md: { width: 140, height: 88 },
    lg: { width: 200, height: 126 },
    xl: { width: 260, height: 164 },
  }[size];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.imageWrapper,
          transparentBg && styles.transparentWrapper,
          opacity !== undefined && { opacity },
        ]}
      >
        <Image
          source={require('../../assets/aavin-logo.png')}
          style={{ width: dimensions.width, height: dimensions.height }}
          resizeMode="contain"
        />
      </View>
      {showSubtitle && size !== 'sm' && (
        <View style={styles.taglineBadge}>
          <Text style={[styles.taglineText, { color: colors.primaryDark }]}>
            MADURAI DISTRICT CO-OPERATIVE MILK PRODUCERS' UNION
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#1A3B66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  transparentWrapper: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  taglineBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#ebf4fe',
  },
  taglineText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
