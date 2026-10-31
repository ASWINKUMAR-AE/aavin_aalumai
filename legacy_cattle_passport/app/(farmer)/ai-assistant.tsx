import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform, TextInput, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function AIAssistantScreen() {
  const { user } = useAuth();
  const { cows } = useAavinStore();
  const { colors } = useTheme();

  const farmerId = user?.associatedId || 'FARMER001';
  const myCows = cows.filter(c => c.farmerId === farmerId);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: `Vanakkam ${user?.fullName || 'Farmer'}! I am your Aavin Cattle Passport AI Advisor. You have ${myCows.length} registered cows (Kamadhenu & Lakshmi). Ask me about feeding, mastitis care, milk withdrawal guidelines, or Aavin procurement incentives!`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const generateLocalAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('withdrawal') || q.includes('medicine') || q.includes('antibiotic')) {
      return '⚠️ Veterinary Milk Withdrawal Notice: If a cow receives intramammary or injectable antibiotics (such as Amoxicillin or Enrofloxacin), its milk must be strictly discarded for the duration of the prescribed withdrawal period (typically 72 to 96 hours). Mixing treated milk can cause antibiotic residue penalties at the Aavin BMC.';
    }
    if (q.includes('mastitis') || q.includes('swelling') || q.includes('udder')) {
      return '🩺 Udder Health Guide: Strip cups and California Mastitis Test (CMT) should be performed before milking. For early signs of quarter swelling or flakes, contact Dr. Anand at Melur Dispensary immediately. Always teat-dip in 0.5% povidone-iodine post-milking.';
    }
    if (q.includes('feed') || q.includes('grass') || q.includes('diet') || q.includes('nutrition')) {
      return '🌿 Recommended Feeding Protocol: Provide 20-25 kg of fresh Co-4 Hybrid Napier green grass, 5 kg dry paddy straw for rumen fiber, and 3-4 kg of Aavin balanced cattle feed pellets with 50g chelated mineral mixture daily per milking cow.';
    }
    if (q.includes('fat') || q.includes('snf') || q.includes('price') || q.includes('rate')) {
      return '🥛 Quality Pricing Schedule: Aavin standard cow milk requires 4.0% Fat and 8.5% SNF at base rate ₹36.50/L. Higher fat earns ₹0.35 per 0.1 point increment plus a ₹1.00 clean milk incentive bonus.';
    }
    return `Based on your cattle passport records for ${myCows.map(c => c.name).join(' & ')}, daily production is optimal. Ensure clean stainless steel cans and deliver to Melur Society within 2 hours of milking to maintain low bacterial counts.`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    const query = inputText;
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      const aiReply: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: generateLocalAIResponse(query),
      };
      setMessages(prev => [...prev, aiReply]);
      setLoading(false);
    }, 400);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader
        title="Aavin Cattle AI Advisor"
        subtitle="Local Knowledge Engine • Bovine Care & Safety"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <View
              key={m.id}
              style={[
                styles.bubbleRow,
                { justifyContent: isUser ? 'flex-end' : 'flex-start' },
              ]}
            >
              {!isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isUser ? colors.primary : colors.card,
                    borderColor: isUser ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.subhead,
                    { color: isUser ? '#FFFFFF' : colors.text, lineHeight: 22 },
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Box */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          placeholder="Ask about cattle health, feed, or milk safety..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || loading}
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.border }]}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
