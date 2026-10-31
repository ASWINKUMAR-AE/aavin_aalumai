import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';

interface IndicTransLanguageSwitchProps {
  variant?: 'compact' | 'pill' | 'expanded';
  showModelBadge?: boolean;
  style?: any;
}

export const IndicTransLanguageSwitch: React.FC<IndicTransLanguageSwitchProps> = ({
  variant = 'compact',
  showModelBadge = false,
  style,
}) => {
  const { language, setLanguage, isTranslating } = useTranslation();

  const handleSelect = async (newLang: 'en' | 'ta') => {
    if (newLang === language) return;
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (_) {}
    await setLanguage(newLang);
  };

  // Compact Header Button Variant (used in headers)
  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]}>
        <Pressable
          style={[styles.compactBtn, language === 'en' && styles.compactBtnActive]}
          onPress={() => handleSelect('en')}
          accessibilityLabel="Switch to English"
        >
          <Text style={[styles.compactBtnText, language === 'en' && styles.compactBtnTextActive]}>
            EN
          </Text>
        </Pressable>

        <View style={styles.compactDivider} />

        <Pressable
          style={[styles.compactBtn, language === 'ta' && styles.compactBtnActive]}
          onPress={() => handleSelect('ta')}
          accessibilityLabel="Switch to Tamil"
        >
          <Text style={[styles.compactBtnText, language === 'ta' && styles.compactBtnTextActive]}>
            தமிழ்
          </Text>
        </Pressable>
      </View>
    );
  }

  // Pill Switch Variant (used on Login screen and Cards)
  if (variant === 'pill') {
    return (
      <View style={[styles.pillContainer, style]}>
        <View style={styles.pillRow}>
          <Pressable
            style={[styles.pillOption, language === 'en' && styles.pillOptionActive]}
            onPress={() => handleSelect('en')}
          >
            <Text style={[styles.pillText, language === 'en' && styles.pillTextActive]}>
              English (eng_Latn)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.pillOption, language === 'ta' && styles.pillOptionActive]}
            onPress={() => handleSelect('ta')}
          >
            <Text style={[styles.pillText, language === 'ta' && styles.pillTextActive]}>
              தமிழ் (tam_Taml)
            </Text>
          </Pressable>
        </View>

        {showModelBadge && (
          <View style={styles.badgeRow}>
            <View style={styles.aiDot} />
            <Text style={styles.modelBadgeText}>
              AI4Bharat IndicTrans2 Neural NMT ({language === 'en' ? 'eng_Latn ⇄ tam_Taml' : 'தமிழ் ⇄ ஆங்கிலம்'})
            </Text>
            {isTranslating && (
              <Ionicons name="sync" size={11} color="#0284C7" style={{ marginLeft: 4 }} />
            )}
          </View>
        )}
      </View>
    );
  }

  // Expanded Variant (Used in Profile / Settings)
  return (
    <View style={[styles.expandedCard, style]}>
      <View style={styles.expandedHeader}>
        <View style={styles.expandedIconBox}>
          <Ionicons name="language" size={20} color="#0072BC" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.expandedTitle}>IndicTrans2 Bilingual Switcher</Text>
          <Text style={styles.expandedSubtitle}>
            AI4Bharat 22-language NMT • Pure JS English ⇄ Tamil
          </Text>
        </View>
      </View>

      <View style={styles.expandedOptionsRow}>
        <Pressable
          style={[styles.langSelectCard, language === 'en' && styles.langSelectCardActive]}
          onPress={() => handleSelect('en')}
        >
          <View style={styles.langRadioRow}>
            <View style={[styles.radioCircle, language === 'en' && styles.radioCircleActive]}>
              {language === 'en' && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.langName}>English</Text>
          </View>
          <Text style={styles.scriptTag}>eng_Latn (Latin Script)</Text>
          <Text style={styles.langDesc}>Standard administrative & system terminology</Text>
        </Pressable>

        <Pressable
          style={[styles.langSelectCard, language === 'ta' && styles.langSelectCardActive]}
          onPress={() => handleSelect('ta')}
        >
          <View style={styles.langRadioRow}>
            <View style={[styles.radioCircle, language === 'ta' && styles.radioCircleActive]}>
              {language === 'ta' && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.langName}>தமிழ் (Tamil)</Text>
          </View>
          <Text style={styles.scriptTag}>tam_Taml (Tamil Script)</Text>
          <Text style={styles.langDesc}>பால் உற்பத்தியாளர் மற்றும் சங்க நடைமுறைகள்</Text>
        </Pressable>
      </View>

      <View style={styles.footerNoteRow}>
        <Ionicons name="sparkles" size={13} color="#0072BC" />
        <Text style={styles.footerNoteText}>
          Model: ai4bharat/indictrans2-en-indic-dist-200M (Zero Python dependencies)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  compactBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  compactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  compactBtnTextActive: {
    color: '#0072BC',
    fontWeight: '800',
  },
  compactDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Pill styles
  pillContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    maxWidth: 380,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOptionActive: {
    backgroundColor: '#0072BC',
    shadowColor: '#0072BC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  modelBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Expanded styles
  expandedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  expandedSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  expandedOptionsRow: {
    gap: 10,
  },
  langSelectCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  langSelectCardActive: {
    borderColor: '#0072BC',
    backgroundColor: '#F0F9FF',
  },
  langRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0072BC',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0072BC',
  },
  langName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  scriptTag: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0284C7',
    fontWeight: '600',
    marginLeft: 28,
  },
  langDesc: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 28,
  },
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerNoteText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
