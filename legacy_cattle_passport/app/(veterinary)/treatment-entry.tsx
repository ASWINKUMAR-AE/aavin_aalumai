import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';

export default function TreatmentEntryScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { cows, addTreatmentRecord } = useAavinStore();
  const { colors } = useTheme();
  const router = useRouter();

  const initialCowId = (params.cowId as string) || (params.tagId as string);
  const [selectedCowId, setSelectedCowId] = useState(
    initialCowId || cows[0]?.id || 'COW001'
  );

  // Sync selected cow if incoming cowId/tagId parameter changes
  useEffect(() => {
    const incomingId = (params.cowId as string) || (params.tagId as string);
    if (incomingId) {
      const found = cows.find(c => c.id === incomingId || c.tagId === incomingId || c.cowId === incomingId);
      if (found) {
        setSelectedCowId(found.id);
      }
    }
  }, [params.cowId, params.tagId, cows]);

  // Layer-by-layer back navigation: returns to cow details if entered from passport
  const handleBack = useCallback(() => {
    const fromParam = (params.from as string) || '';
    const targetCowId = (params.cowId as string) || selectedCowId;
    const returnFrom = (params.returnFrom as string) || 'cattle';

    if (fromParam === 'cow-details' || (params.cowId && fromParam !== 'home')) {
      router.replace({
        pathname: '/(veterinary)/cow-details',
        params: {
          cowId: targetCowId,
          from: returnFrom,
        },
      } as any);
      return;
    }

    if (fromParam === 'home' || fromParam === 'index') {
      router.replace('/(veterinary)' as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(veterinary)' as any);
  }, [params.from, params.cowId, params.returnFrom, selectedCowId, router]);

  // Hardware back button for Android
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  // Treatment fields
  const [medicineName, setMedicineName] = useState('Amoxicillin & Cloxacillin Intramammary');
  const [genericName, setGenericName] = useState('Amoxicillin + Cloxacillin');
  const [dosage, setDosage] = useState('1 tube per quarter bid x 3 days');
  const [route, setRoute] = useState('Intramammary Infusion');
  const [withdrawalPeriodDays, setWithdrawalPeriodDays] = useState('4');
  const [reason, setReason] = useState('Acute Clinical Mastitis');
  const [notes, setNotes] = useState('Mandatory milk withholding. Teat dip with chlorhexidine solution.');
  const [submitting, setSubmitting] = useState(false);

  const selectedCow = cows.find(c => c.id === selectedCowId) || cows[0];

  const medicineCatalog = [
    {
      name: 'Amoxicillin & Cloxacillin Intramammary',
      generic: 'Amoxicillin + Cloxacillin',
      dosage: '1 tube bid x 3 days',
      route: 'Intramammary',
      defaultDays: '4',
      reason: 'Acute Clinical Mastitis',
    },
    {
      name: 'Enrofloxacin 10% (Floxidin)',
      generic: 'Enrofloxacin',
      dosage: '15 ml IM sid x 3 days',
      route: 'Intramuscular',
      defaultDays: '5',
      reason: 'Bovine Respiratory Infection',
    },
    {
      name: 'Meloxicam Inj (Melonex)',
      generic: 'Meloxicam 5mg/ml',
      dosage: '15 ml IM stat',
      route: 'Intramuscular',
      defaultDays: '3',
      reason: 'Pyrexia & Musculoskeletal Pain',
    },
    {
      name: 'Ceftiofur Sodium Inj (Excenel)',
      generic: 'Ceftiofur Sodium',
      dosage: '10 ml IM sid x 3 days',
      route: 'Intramuscular',
      defaultDays: '0', // Zero milk withdrawal
      reason: 'Acute Metritis / Foot Rot',
    },
  ];

  const handleSelectMedicinePreset = (med: typeof medicineCatalog[0]) => {
    setMedicineName(med.name);
    setGenericName(med.generic);
    setDosage(med.dosage);
    setRoute(med.route);
    setWithdrawalPeriodDays(med.defaultDays);
    setReason(med.reason);
  };

  const handleSaveTreatment = () => {
    const days = parseInt(withdrawalPeriodDays, 10);
    if (isNaN(days) || days < 0) {
      Alert.alert('Invalid Days', 'Please enter a valid withdrawal period in days (0 for zero-withhold drugs).');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      addTreatmentRecord(selectedCow.id, {
        date: startDate,
        vetName: user?.fullName || 'Dr. R. Anand BVSc',
        medicineName: medicineName.trim(),
        genericName: genericName.trim(),
        dosage: dosage.trim(),
        route: route.trim(),
        treatmentStartDate: startDate,
        treatmentEndDate: startDate,
        withdrawalPeriodDays: days,
        withdrawalEndDate: endDate,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      Alert.alert(
        'Treatment Prescribed!',
        `Prescription saved for ${selectedCow.name} (#${selectedCow.tagId}).\n\n${days > 0 ? `⚠️ Active Milk Withdrawal Period of ${days} days deployed until ${endDate}. Safety alert dispatched to farmer and society.` : 'Zero milk discard medicine. Cow remains cleared for supply.'}`,
        [
          {
            text: 'View Passport',
            onPress: () => router.replace({
              pathname: '/(veterinary)/cow-details',
              params: {
                cowId: selectedCow.id,
                from: (params.returnFrom as string) || 'cattle',
              },
            } as any),
          },
          {
            text: 'Done',
            onPress: handleBack,
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save treatment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Prescribe Treatment"
        subtitle="Medicine Administration & Milk Withdrawal Ledger"
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Select Target Bovine */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 10 }]}>
            1. Select Patient Cow
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cowHorizontalScroll}>
            <View style={styles.cowsRow}>
              {cows.map((c) => {
                const isSelected = selectedCowId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCowId(c.id)}
                    style={[
                      styles.cowPill,
                      {
                        backgroundColor: isSelected ? colors.primaryLight : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={16} 
                      color={isSelected ? colors.primary : colors.textMuted} 
                    />
                    <View style={{ marginLeft: 6 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                        {c.name}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        Tag: #{c.tagId} ({c.farmerName.split(' ')[0]})
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.selectedCowBadge, { backgroundColor: colors.background }]}>
            <Text style={[Typography.caption1, { color: colors.text }]}>
              Selected: <Text style={{ fontWeight: '800' }}>{selectedCow.name}</Text> • Breed: {selectedCow.breed} • Owner: {selectedCow.farmerName}
            </Text>
          </View>
        </Card>

        {/* Quick Presets Catalog */}
        <Card style={styles.card}>
          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 8 }]}>
            Veterinary Drug Presets (Tap to Load Standard Protocol):
          </Text>
          <View style={styles.presetsGrid}>
            {medicineCatalog.map((med, index) => (
              <Pressable
                key={index}
                onPress={() => handleSelectMedicinePreset(med)}
                style={[
                  styles.presetChip,
                  medicineName === med.name && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              >
                <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700' }]}>
                  {med.name.split('(')[0]}
                </Text>
                <Text style={[Typography.caption2, { color: med.defaultDays === '0' ? '#16A34A' : '#DC2626', fontWeight: '800' }]}>
                  {med.defaultDays === '0' ? 'Zero Discard' : `${med.defaultDays} Days Withdrawal`}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Prescription Details Card */}
        <Card style={styles.card}>
          <Text style={[Typography.headline, { color: colors.primary, fontWeight: '800', marginBottom: 12 }]}>
            2. Clinical Diagnosis & Dosage
          </Text>

          <TextField
            label="Diagnosis / Reason for Treatment *"
            placeholder="e.g. Acute Clinical Mastitis"
            value={reason}
            onChangeText={setReason}
            icon="pulse-outline"
          />

          <TextField
            label="Trade / Brand Name *"
            placeholder="e.g. Amoxicillin & Cloxacillin Intramammary"
            value={medicineName}
            onChangeText={setMedicineName}
            icon="medkit-outline"
          />

          <TextField
            label="Generic / Active Ingredients"
            placeholder="e.g. Amoxicillin + Cloxacillin"
            value={genericName}
            onChangeText={setGenericName}
            icon="flask-outline"
          />

          <TextField
            label="Dosage & Regimen"
            placeholder="e.g. 1 tube bid x 3 days"
            value={dosage}
            onChangeText={setDosage}
            icon="fitness-outline"
          />

          <TextField
            label="Route of Administration"
            placeholder="e.g. Intramammary Infusion"
            value={route}
            onChangeText={setRoute}
            icon="eyedrop-outline"
          />

          {/* CRITICAL WITHDRAWAL PERIOD INPUT */}
          <View style={[styles.withdrawalInputBox, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={[Typography.subhead, { color: '#B91C1C', fontWeight: '900', marginLeft: 6 }]}>
                MANDATORY MILK WITHDRAWAL DAYS *
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: '#991B1B', marginBottom: 8 }]}>
              Enter number of days milk must be discarded following last administration to ensure zero antibiotic residue.
            </Text>
            <TextField
              label="Withdrawal Period (Days)"
              placeholder="e.g. 4 (0 if zero milk discard)"
              value={withdrawalPeriodDays}
              onChangeText={setWithdrawalPeriodDays}
              keyboardType="number-pad"
              icon="time-outline"
            />
          </View>

          <TextField
            label="Clinical Advice / Notes to Farmer"
            placeholder="e.g. Discard all milk during treatment. Complete full 3-day course."
            value={notes}
            onChangeText={setNotes}
            icon="create-outline"
          />
        </Card>

        <Button
          title={submitting ? "Deploying Restriction..." : "Confirm & Deploy Treatment Record"}
          size="lg"
          loading={submitting}
          onPress={handleSaveTreatment}
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 10, marginBottom: 30 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cowHorizontalScroll: {
    marginBottom: 8,
  },
  cowsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  selectedCowBadge: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  presetsGrid: {
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  withdrawalInputBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 10,
  },
});
