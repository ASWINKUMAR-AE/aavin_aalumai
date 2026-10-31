import React from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useAavinStore } from '../../store/AavinStoreContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GroupedList } from '../../components/ui/GroupedList';
import { ListRow } from '../../components/ui/ListRow';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user, updateLanguage, logout } = useAuth();
  const { farmers, cows, milkRecords, discrepancyCases, resetDemoData } = useAavinStore();

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will restore all seeded farmers, cattle tags, and milk records to their initial demo state. Any unsaved demo edits will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Dataset',
          style: 'destructive',
          onPress: async () => {
            await resetDemoData();
            Alert.alert('Reset Complete', 'Demo state has been restored to factory seed data.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[Typography.title2, { color: colors.text, marginBottom: 12, fontWeight: '800' }]}>
        App Preferences & Demo Mode
      </Text>

      {/* Local Simulation Architecture Card */}
      <Card style={{ marginBottom: 16 }}>
        <View style={styles.cardHeader}>
          <Ionicons name="hardware-chip-outline" size={22} color={colors.primary} />
          <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
            Architecture: Frontend-Only Simulation
          </Text>
        </View>
        <Text style={[Typography.footnote, { color: colors.textSecondary, marginTop: 6, lineHeight: 18 }]}>
          This app runs as a fully interactive client-side twin. All milk recordings, difference calculations, receipts, and discrepancy alerts execute locally with persistent AsyncStorage.
        </Text>

        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.statCol}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>{farmers.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Farmers</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>{cows.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Cows</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>{milkRecords.length}</Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Records</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[Typography.headline, { color: discrepancyCases.length > 0 ? '#DC2626' : '#16A34A', fontWeight: '800' }]}>
              {discrepancyCases.length}
            </Text>
            <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Cases</Text>
          </View>
        </View>

        <Button
          title="🔄 Reset All Demo Data to Seed"
          variant="outline"
          size="sm"
          onPress={handleResetData}
          style={{ marginTop: 14 }}
        />
      </Card>

      <GroupedList title="Appearance & Theme">
        <ListRow
          title="Theme Mode"
          value={mode === 'system' ? 'System Automatic' : mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
          onPress={() => {
            const nextMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
            setMode(nextMode);
          }}
          showChevron
        />
      </GroupedList>

      <GroupedList title="Language (மொழி)">
        <ListRow
          title="English"
          value={user?.preferredLanguage === 'en' ? '✓ Selected' : ''}
          icon="language-outline"
          onPress={() => updateLanguage('en')}
        />
        <ListRow
          title="தமிழ் (Tamil)"
          value={user?.preferredLanguage === 'ta' ? '✓ Selected' : ''}
          icon="language-outline"
          onPress={() => updateLanguage('ta')}
          isLast
        />
      </GroupedList>

      {user && (
        <Button
          title="Sign Out / Switch Demo User"
          variant="destructive"
          onPress={logout}
          style={{ marginTop: 24 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 12,
  },
  statCol: {
    alignItems: 'center',
  },
});
