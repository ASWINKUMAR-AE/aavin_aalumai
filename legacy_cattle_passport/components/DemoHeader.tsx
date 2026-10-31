import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView, Platform, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAavinStore } from '../store/AavinStoreContext';
import { Typography } from '../constants/Typography';
import { UserRole } from '../types/aavin';
import { canScanCattleTag } from '../constants/CattlePermissions';
import { SmartCattleTagScannerModal } from './scanner/SmartCattleTagScannerModal';

import { useTranslation } from '../context/LanguageContext';
import { useScroll } from '../context/ScrollContext';
import { IndicTransLanguageSwitch } from './ui/IndicTransLanguageSwitch';

interface DemoHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const DemoHeader: React.FC<DemoHeaderProps> = ({ title, subtitle, showBack = false, onBack }) => {
  const { user, activeRole, switchRole, demoUsers, logout } = useAuth();
  const { colors } = useTheme();
  const { language, toggleLanguage } = useTranslation();
  const { notifications } = useAavinStore();
  const { isScrolled } = useScroll();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [tagScannerVisible, setTagScannerVisible] = useState(false);
  const isScannerAllowed = canScanCattleTag(activeRole);

  // Unread notifications count for current active role
  const unreadCount = notifications.filter(
    n => !n.isRead && (n.recipientRole === activeRole || !n.recipientRole)
  ).length;

  const roleMeta: Record<UserRole, { label: string; icon: string; color: string; desc: string }> = {
    farmer: { label: 'Farmer', icon: '👨‍🌾', color: '#16A34A', desc: 'Own cows, view supply & receipts' },
    booth: { label: 'Society Staff', icon: '🏢', color: '#0072BC', desc: 'Record milk, generate digital dispatch receipts' },
    bmc: { label: 'BMC Staff', icon: '❄️', color: '#0284C7', desc: 'Receive deliveries, record measurements, flag mismatches' },
    union: { label: 'Union Admin', icon: '🏛️', color: '#7C3AED', desc: 'District overview, audit discrepancies & receipts' },
    veterinary: { label: 'Veterinarian', icon: '🩺', color: '#EA580C', desc: 'Clinical records & medicine withdrawal alerts' },
    admin: { label: 'System Admin', icon: '🛡️', color: '#475569', desc: 'KYC verifications, thresholds & demo reset' },
  };

  const handleConfirmLogout = () => {
    const titleText = language === 'ta' ? 'வெளியேறு (Logout)' : 'Sign Out';
    const messageText = language === 'ta'
      ? 'ஆவின் கணக்கிலிருந்து பாதுகாப்பாக வெளியேற விரும்புகிறீர்களா?'
      : 'Are you sure you want to securely log out from the Aavin Dairy Portal?';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(messageText)) {
        logout().then(() => {
          router.replace('/(auth)/login' as any);
        });
      }
    } else {
      Alert.alert(
        titleText,
        messageText,
        [
          { text: language === 'ta' ? 'ரத்து' : 'Cancel', style: 'cancel' },
          {
            text: language === 'ta' ? 'வெளியேறு' : 'Log Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login' as any);
            },
          },
        ]
      );
    }
  };

  const handleSelectRole = (r: UserRole) => {
    setModalVisible(false);
    switchRole(r);
    // Navigate to role's dashboard
    switch (r) {
      case 'farmer':
        router.replace('/(farmer)' as any);
        break;
      case 'booth':
        router.replace('/(booth)' as any);
        break;
      case 'bmc':
        router.replace('/(bmc)' as any);
        break;
      case 'union':
        router.replace('/(union)' as any);
        break;
      case 'veterinary':
        router.replace('/(veterinary)' as any);
        break;
      case 'admin':
        router.replace('/(admin)' as any);
        break;
    }
  };

  const currentMeta = activeRole ? roleMeta[activeRole] : roleMeta.farmer;

  const handleBackPress = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      switch (activeRole) {
        case 'farmer':
          router.replace('/(farmer)' as any);
          break;
        case 'booth':
          router.replace('/(booth)' as any);
          break;
        case 'bmc':
          router.replace('/(bmc)' as any);
          break;
        case 'union':
          router.replace('/(union)' as any);
          break;
        case 'veterinary':
          router.replace('/(veterinary)' as any);
          break;
        case 'admin':
          router.replace('/(admin)' as any);
          break;
        default:
          router.replace('/');
          break;
      }
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 8 }, isScrolled && styles.containerScrolled]}>
        {/* Top Info Strip */}
        <View style={styles.topStrip}>
          <View style={styles.brandBadgeRow}>
            <Image
              source={require('../assets/aavin-logo.png')}
              style={styles.logoThumbnail}
              resizeMode="contain"
            />
          </View>

          <View style={styles.rightIconsRow}>
            {/* AI4Bharat IndicTrans2 Language Switcher (eng_Latn ⇄ tam_Taml) */}
            <IndicTransLanguageSwitch variant="compact" />

            {/* Cattle Ear-Tag Scanner (Strictly for Society, Union, Vet, and Admin roles only) */}
            {isScannerAllowed && (
              <Pressable
                style={[styles.iconBtn, styles.scannerIconBtn]}
                onPress={() => setTagScannerVisible(true)}
                accessibilityLabel="Scan Cattle Ear Tag"
              >
                <Ionicons name="scan" size={15} color="#FFFFFF" />
              </Pressable>
            )}

            {/* Notification Bell */}
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Prominent Real Logout Button */}
            <Pressable
              style={[styles.iconBtn, styles.logoutIconBtn]}
              onPress={handleConfirmLogout}
              accessibilityLabel="Log Out"
            >
              <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* User Info Bar */}
        <View style={styles.userBar}>
          {showBack && (
            <Pressable onPress={handleBackPress} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {title || user?.fullName || 'Aavin Milk Safety Twin'}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSubtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Role Switcher Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.title2, { color: colors.text }]}>
                  {language === 'ta' ? 'ஆவின் பயனர் கணக்கு' : 'Aavin Account & Node'}
                </Text>
                <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
                  {language === 'ta' ? 'செயலில் உள்ள பயனர்: ' : 'Active Officer: '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>{user?.fullName || 'Authorized User'}</Text>
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.roleList}>
              {(['farmer', 'booth', 'bmc', 'union', 'veterinary', 'admin'] as UserRole[]).map((r) => {
                const meta = roleMeta[r];
                const matchedUser = demoUsers.find(u => u.role === r);
                const isSelected = activeRole === r;

                return (
                  <Pressable
                    key={r}
                    onPress={() => handleSelectRole(r)}
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: isSelected ? meta.color + '15' : colors.background,
                        borderColor: isSelected ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.roleCardIcon}>
                      <Text style={{ fontSize: 28 }}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[Typography.headline, { color: colors.text, fontWeight: '700' }]}>
                          {meta.label}
                        </Text>
                        {isSelected && (
                          <View style={[styles.activePill, { backgroundColor: meta.color }]}>
                            <Text style={styles.activePillText}>LOGGED IN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '600', marginTop: 2 }]}>
                        {matchedUser?.fullName}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                        {meta.desc}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                      size={22}
                      color={isSelected ? meta.color : colors.textMuted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Prominent Red Logout Button inside Modal */}
            <Pressable
              style={styles.modalLogoutBtn}
              onPress={() => {
                setModalVisible(false);
                handleConfirmLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.modalLogoutBtnText}>
                {language === 'ta' ? 'கணக்கிலிருந்து வெளியேறு (Sign Out)' : 'Sign Out of Aavin Portal'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Cattle Ear-Tag Dual-Mode Scanner Modal (Barcode First + OCR Fallback) */}
      {isScannerAllowed && (
        <SmartCattleTagScannerModal
          visible={tagScannerVisible}
          onClose={() => setTagScannerVisible(false)}
          onScan={(scannedTag) => {
            setTagScannerVisible(false);
            router.push({
              pathname: '/cow-details',
              params: { tagId: scannedTag },
            } as any);
          }}
          userRoleLabel={currentMeta.label}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#5EA8EE', // Sky-Blue surface matching reference UI
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 100,
    ...Platform.select({
      default: {
        transition: 'box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-bottom-color 0.28s ease',
      },
    }),
  },
  containerScrolled: {
    ...Platform.select({
      ios: {
        shadowColor: '#0A3871',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0px 6px 20px rgba(10, 56, 113, 0.24), 0px 2px 6px rgba(0, 0, 0, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.28)',
      },
    }),
  },
  topStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoThumbnail: {
    width: 58,
    height: 34,
    backgroundColor: 'transparent',
  },
  rightIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  langBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 0,
  },
  backBtn: {
    marginRight: 8,
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  roleList: {
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  roleCardIcon: {
    marginRight: 14,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  demoNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  scannerIconBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  logoutIconBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderColor: 'rgba(254, 202, 202, 0.5)',
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  modalLogoutBtnText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '800',
  },
});
