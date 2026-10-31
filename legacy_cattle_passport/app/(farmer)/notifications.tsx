import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { InAppNotification, NotificationType } from '../../types/aavin';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { DemoHeader } from '../../components/DemoHeader';

export default function FarmerNotificationsScreen() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAavinStore();
  const { activeRole } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');

  const roleNotifications = notifications.filter(
    n => !n.recipientRole || n.recipientRole === activeRole || n.recipientRole === 'farmer'
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
      <DemoHeader 
        title={t('nav.notifications', 'Notifications')} 
        subtitle="Live Cattle & Milk Supply Alerts" 
      />

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.filterTabs}>
          <Pressable 
            style={[styles.filterTab, filterMode === 'all' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterTabText, { color: filterMode === 'all' ? colors.primary : colors.textSecondary }]}>
              All ({roleNotifications.length})
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.filterTab, filterMode === 'unread' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
            onPress={() => setFilterMode('unread')}
          >
            <Text style={[styles.filterTabText, { color: filterMode === 'unread' ? colors.primary : colors.textSecondary }]}>
              Unread ({roleNotifications.filter(n => !n.isRead).length})
            </Text>
          </Pressable>
        </View>

        <Pressable 
          style={styles.markAllBtn}
          onPress={() => markAllNotificationsAsRead()}
        >
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={displayedNotifications}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState 
            icon="notifications-off-outline"
            title="No Notifications"
            message={filterMode === 'unread' ? "You have read all notifications." : "No alerts or messages for your farmer account."}
          />
        }
        renderItem={({ item }) => {
          const iconMeta = getIconForType(item.type);
          return (
            <Pressable
              style={[
                styles.itemCard,
                { backgroundColor: item.isRead ? colors.card : colors.primaryLight + '25', borderColor: colors.border },
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={[styles.iconBox, { backgroundColor: iconMeta.color + '18' }]}>
                <Ionicons name={iconMeta.name} size={22} color={iconMeta.color} />
              </View>

              <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: item.isRead ? '600' : '800', flex: 1 }]}>
                    {item.title}
                  </Text>
                  {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>

                <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 4 }]}>
                  {item.message}
                </Text>

                <View style={styles.itemFooter}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                  {item.linkRoute && (
                    <View style={styles.linkIndicator}>
                      <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>View</Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.primary} />
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
    borderBottomWidth: 1,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 16,
  },
  filterTab: {
    paddingVertical: 12,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  linkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
