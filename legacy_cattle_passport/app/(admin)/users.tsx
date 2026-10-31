import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../../types/aavin';

export default function AdminUsersScreen() {
  const { demoUsers, activeRole, switchRole } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const handleSwitch = (role: UserRole) => {
    switchRole(role);
    switch (role) {
      case 'farmer':
        router.replace('/(farmer)');
        break;
      case 'booth':
        router.replace('/(booth)');
        break;
      case 'bmc':
        router.replace('/(bmc)');
        break;
      case 'union':
        router.replace('/(union)');
        break;
      case 'veterinary':
        router.replace('/(veterinary)');
        break;
      case 'admin':
        router.replace('/(admin)');
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Demo User Accounts"
        subtitle="6 Pre-Seeded Academic Roles"
        showBack
      />

      <FlatList
        data={demoUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCurrent = activeRole === item.role;
          return (
            <Card style={[styles.card, isCurrent && { borderColor: colors.primary, borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                      {item.fullName}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.activeBadgeText}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                    ID: {item.id} • Username: {item.username} • Role: {item.role === 'booth' ? 'SOCIETY' : item.role.toUpperCase()}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.description}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginTop: 2 }]}>
                    Phone: +91 {item.phone} • Email: {item.email}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                <Button
                  title={isCurrent ? "Active Role" : `Switch to ${item.role === 'booth' ? 'SOCIETY' : item.role.toUpperCase()}`}
                  variant={isCurrent ? "outline" : "secondary"}
                  size="sm"
                  onPress={() => handleSwitch(item.role)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
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
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
