import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useNetwork } from '../../context/NetworkContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const { isConnected, offlineQueue } = useNetwork();
  const { colors } = useTheme();

  if (isConnected && offlineQueue.length === 0) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: !isConnected ? colors.hold : colors.review,
        },
      ]}
    >
      <Ionicons
        name={!isConnected ? 'cloud-offline' : 'sync'}
        size={16}
        color="#FFFFFF"
        style={styles.icon}
      />
      <Text style={[Typography.footnote, styles.text]}>
        {!isConnected
          ? 'Offline Mode — Operating from local cache'
          : `Online — ${offlineQueue.length} local drafts pending sync`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
