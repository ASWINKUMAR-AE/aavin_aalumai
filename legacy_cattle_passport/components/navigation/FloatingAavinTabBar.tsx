import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../context/LanguageContext';
import { useScroll } from '../../context/ScrollContext';
import {
  TAB_BAR_HEIGHT,
  BUTTON_SIZE,
  AAVIN_NAV_COLORS as AAVIN_COLORS,
  getCurvedBarPath,
} from './curvedNavPath';

export { TAB_BAR_HEIGHT, BUTTON_SIZE, getCurvedBarPath };

// Route name to icon & translation key mapping
const ROUTE_META_MAP: Record<
  string,
  {
    outline: keyof typeof Ionicons.glyphMap;
    filled: keyof typeof Ionicons.glyphMap;
    labelKey: string;
    fallbackLabel: string;
  }
> = {
  // Farmer
  index: {
    outline: 'home-outline',
    filled: 'home',
    labelKey: 'nav.home',
    fallbackLabel: 'Home',
  },
  'milk-history': {
    outline: 'water-outline',
    filled: 'water',
    labelKey: 'nav.milk',
    fallbackLabel: 'Milk',
  },
  cows: {
    outline: 'paw-outline',
    filled: 'paw',
    labelKey: 'nav.myCows',
    fallbackLabel: 'My Cows',
  },
  receipts: {
    outline: 'receipt-outline',
    filled: 'receipt',
    labelKey: 'nav.receipts',
    fallbackLabel: 'Receipts',
  },
  profile: {
    outline: 'person-outline',
    filled: 'person',
    labelKey: 'nav.profile',
    fallbackLabel: 'Profile',
  },
  'union-profile': {
    outline: 'person-outline',
    filled: 'person',
    labelKey: 'nav.profile',
    fallbackLabel: 'Profile',
  },

  // Society Staff
  farmers: {
    outline: 'people-outline',
    filled: 'people',
    labelKey: 'nav.farmers',
    fallbackLabel: 'Farmers',
  },
  'record-milk': {
    outline: 'create-outline',
    filled: 'create',
    labelKey: 'nav.recordMilk',
    fallbackLabel: 'Record Milk',
  },
  'review-collection': {
    outline: 'receipt-outline',
    filled: 'receipt',
    labelKey: 'nav.receipts',
    fallbackLabel: 'Receipts',
  },
  'sent-receipts': {
    outline: 'send-outline',
    filled: 'send',
    labelKey: 'nav.receipts',
    fallbackLabel: 'Receipts',
  },

  // BMC Staff
  'receive-milk': {
    outline: 'cube-outline',
    filled: 'cube',
    labelKey: 'nav.deliveries',
    fallbackLabel: 'Deliveries',
  },
  'daily-summary': {
    outline: 'document-text-outline',
    filled: 'document-text',
    labelKey: 'nav.verifyMilk',
    fallbackLabel: 'Verify Milk',
  },
  investigations: {
    outline: 'alert-circle-outline',
    filled: 'alert-circle',
    labelKey: 'nav.alerts',
    fallbackLabel: 'Alerts',
  },

  // Union Management
  'bmc-monitoring': {
    outline: 'grid-outline',
    filled: 'grid',
    labelKey: 'nav.bmcs',
    fallbackLabel: 'BMCs',
  },
  'receipt-review': {
    outline: 'document-text-outline',
    filled: 'document-text',
    labelKey: 'nav.reports',
    fallbackLabel: 'Reports',
  },
  discrepancies: {
    outline: 'warning-outline',
    filled: 'warning',
    labelKey: 'nav.alerts',
    fallbackLabel: 'Alerts',
  },

  // Veterinarian
  'cattle-registry': {
    outline: 'paw-outline',
    filled: 'paw',
    labelKey: 'nav.cattle',
    fallbackLabel: 'Cattle',
  },
  'treatment-entry': {
    outline: 'medkit-outline',
    filled: 'medkit',
    labelKey: 'nav.treatments',
    fallbackLabel: 'Treatments',
  },
  'examination-entry': {
    outline: 'pulse-outline',
    filled: 'pulse',
    labelKey: 'nav.followUps',
    fallbackLabel: 'Follow-ups',
  },

  // Admin
  verifications: {
    outline: 'checkbox-outline',
    filled: 'checkbox',
    labelKey: 'nav.verifications',
    fallbackLabel: 'Verifications',
  },
  'demo-settings': {
    outline: 'settings-outline',
    filled: 'settings',
    labelKey: 'nav.demoSettings',
    fallbackLabel: 'Settings',
  },
  users: {
    outline: 'people-outline',
    filled: 'people',
    labelKey: 'nav.users',
    fallbackLabel: 'Users',
  },
};

export interface FloatingAavinTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
}

export function FloatingAavinTabBar({
  state,
  descriptors,
  navigation,
}: FloatingAavinTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isScrolled } = useScroll();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Filter to only routes that have a registered icon and not hidden
  const visibleRoutes = (state.routes || []).filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    if (options.href === null) return false;
    return Boolean(ROUTE_META_MAP[route.name]);
  });

  // Active index among visible tabs
  const activeRoute = state.routes[state.index];
  const activeRouteIndex = visibleRoutes.findIndex((route: any) => route.key === activeRoute?.key);
  
  // Map subroutes to their corresponding parent tab
  const SUBROUTE_PARENT_MAP: Record<string, string[]> = {
    'cow-details': ['cows', 'cattle-registry'],
    'milk-entry': ['milk-history', 'record-milk'],
    'bmc-analytics': ['bmc-monitoring'],
    'society-analytics': ['bmc-monitoring'],
  };

  const parentTabNames = SUBROUTE_PARENT_MAP[activeRoute?.name];
  const parentTabIndex = parentTabNames
    ? visibleRoutes.findIndex((route: any) => parentTabNames.includes(route.name))
    : -1;

  const activeVisibleIndex = activeRouteIndex >= 0
    ? activeRouteIndex
    : parentTabIndex >= 0
    ? parentTabIndex
    : 0;

  const horizontalMargin = 16;

  // Track keyboard events to hide bar during text entry
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingBottom: bottomPadding,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.barWrapper,
          { height: TAB_BAR_HEIGHT },
        ]}
      >
        {/* Tab Touch Targets & Content */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const isFocused = index === activeVisibleIndex;
            const options = descriptors[route.key]?.options || {};
            const meta = ROUTE_META_MAP[route.name] || {
              outline: 'ellipse-outline',
              filled: 'ellipse',
              labelKey: '',
              fallbackLabel: (options.title as string) || route.name,
            };

            const label = meta.labelKey
              ? t(meta.labelKey, meta.fallbackLabel)
              : (options.title as string) || meta.fallbackLabel;

            const onPress = () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              const isDirectlyActive = activeRoute?.name === route.name;

              if ((!isFocused || !isDirectlyActive) && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
                testID={`tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[
                  styles.tabItem,
                  isFocused && styles.tabItemFocused,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={isFocused ? meta.filled : meta.outline}
                    size={21}
                    color={isFocused ? AAVIN_COLORS.primaryBlue : AAVIN_COLORS.secondaryText}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.tabLabel,
                    { color: isFocused ? AAVIN_COLORS.navy : AAVIN_COLORS.secondaryText },
                    isFocused && styles.tabLabelFocused,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  barWrapper: {
    width: '92%',
    maxWidth: 520,
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: AAVIN_COLORS.white,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: AAVIN_COLORS.navy,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      default: {
        boxShadow: '0px 6px 24px rgba(18, 52, 81, 0.14)',
      },
    }),
  },
  barWrapperScrolled: {
    backgroundColor: 'transparent',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    zIndex: 10,
    borderRadius: 50,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginHorizontal: 2,
    borderRadius: 50,
    paddingVertical: 4,
  },
  tabItemFocused: {
    backgroundColor: AAVIN_COLORS.skyBlueLight,
  },
  iconContainer: {
    width: 44,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    maxWidth: '100%',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  tabLabelFocused: {
    fontWeight: '800',
  },
});
