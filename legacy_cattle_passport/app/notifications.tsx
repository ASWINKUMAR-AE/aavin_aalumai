import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../store/AavinStoreContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Typography } from '../constants/Typography';
import { InAppNotification, NotificationType } from '../types/aavin';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../components/ui/EmptyState';

export default function NotificationsScreen() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAavinStore();
  const { activeRole } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  // Filter notifications for active role or system wide
  const roleNotifications = notifications.filter(
    n => !n.recipientRole || n.recipientRole === activeRole
  );

  const displayedNotifications = filterMode === 'unread'
    ? roleNotifications.filter(n => !n.isRead)
    : roleNotifications;

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'withdrawal_warning':
        return { name: 'warning' as const, color: '#DC2626' };
      case 'discrepancy_alert':
      case 'union_escalation':
        return { name: 'alert-circle' as const, color: '#EA580C' };
      case 'milk_recorded':
        return { name: 'water' as const, color: '#0284C7' };
      case 'receipt_generated':
      case 'bmc_confirmation':
        return { name: 'document-text' as const, color: '#16A34A' };
      case 'delivery_pending':
        return { name: 'bus' as const, color: '#0072BC' };
      case 'verification_request':
        return { name: 'person-add' as const, color: '#7C3AED' };
      default:
        return { name: 'notifications' as const, color: '#64748B' };
    }
  };

  const handleNotificationPress = (item: InAppNotification) => {
    markNotificationAsRead(item.id);
    if (item.linkRoute) {
      router.push(item.linkRoute as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Filter & Mark All Read bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setFilterMode('all')}
            style={[
              styles.segmentBtn,
              filterMode === 'all' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: filterMode === 'all' ? colors.primary : colors.textSecondary },
              ]}
            >
              All ({roleNotifications.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterMode('unread')}
            style={[
              styles.segmentBtn,
              filterMode === 'unread' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: filterMode === 'unread' ? colors.primary : colors.textSecondary },
              ]}
            >
              Unread ({roleNotifications.filter(n => !n.isRead).length})
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => markAllNotificationsAsRead(activeRole || undefined)}
          style={styles.markAllBtn}
        >
          <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
            Mark All Read
          </Text>
        </Pressable>
      </View>

      {/* Notification List */}
      <FlatList
        data={displayedNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Notifications"
            message={`You have no ${filterMode === 'unread' ? 'unread ' : ''}notifications for the ${activeRole === 'booth' ? 'society' : activeRole} role.`}
            icon="notifications-off-outline"
          />
        }
        renderItem={({ item }) => {
          const icon = getIconForType(item.type);
          return (
            <Pressable
              onPress={() => handleNotificationPress(item)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: item.isRead ? colors.card : colors.card,
                  borderColor: item.isRead ? colors.border : icon.color,
                  borderLeftWidth: item.isRead ? 1 : 4,
                  borderLeftColor: item.isRead ? colors.border : icon.color,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: icon.color + '15' }]}>
                <Ionicons name={icon.name} size={22} color={icon.color} />
              </View>

              <View style={styles.itemTextContainer}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      Typography.headline,
                      { color: colors.text, fontWeight: item.isRead ? '600' : '800', flex: 1 },
                    ]}
                  >
                    {item.title?.replace(/booth/gi, 'Society')}
                  </Text>
                  {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: icon.color }]} />
                  )}
                </View>

                <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 4, lineHeight: 20 }]}>
                  {item.message?.replace(/booth weigh-scale/gi, 'society weigh-scale').replace(/booth weigh scale/gi, 'society weigh-scale').replace(/booth staff/gi, 'society staff').replace(/booth/gi, 'society').replace(/Booth/g, 'Society')}
                </Text>

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginLeft: 4 }]}>
                    {item.timestamp}
                  </Text>

                  {item.linkRoute && (
                    <View style={styles.actionPrompt}>
                      <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                        View Details →
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  markAllBtn: {
    padding: 6,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionPrompt: {
    marginLeft: 'auto',
  },
});
