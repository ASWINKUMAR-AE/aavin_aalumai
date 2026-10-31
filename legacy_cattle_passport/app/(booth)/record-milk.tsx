import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
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
import { CollectionRoute, MeasurementMethod } from '../../types/aavin';

export default function RecordMilkScreen() {
  const { user } = useAuth();
  const { farmers, vendors, booths, recordMilk, cows } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ farmerId?: string }>();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];
  const assignedFarmers = farmers.filter(f => f.assignedBoothId === booth.id);

  // Mode: 'farmer_wise' vs 'combined'
  const [measurementMethod, setMeasurementMethod] = useState<MeasurementMethod>('farmer_wise');
  const [selectedFarmerId, setSelectedFarmerId] = useState(params.farmerId || assignedFarmers[0]?.id || 'FARMER001');
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerSelector, setShowFarmerSelector] = useState(false);

  // Delivery Route
  const [route, setRoute] = useState<CollectionRoute>('direct');
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || 'VEND001');

  // Intake Data
  const [quantityLitres, setQuantityLitres] = useState('');
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [collectionDate, setCollectionDate] = useState('2026-10-12');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle route param changes (e.g. navigation from Farmers Directory card)
  useEffect(() => {
    if (params.farmerId) {
      setSelectedFarmerId(params.farmerId);
      setShowFarmerSelector(false);
    }
  }, [params.farmerId]);

  // Selected entities
  const selectedFarmer = farmers.find(f => f.id === selectedFarmerId) || assignedFarmers[0];
  const selectedVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  // Active withdrawal check
  const farmerCows = cows.filter(c => c.farmerId === selectedFarmerId);
  const cowWithWithdrawal = farmerCows.find(c => c.activeWithdrawal?.hasActiveWithdrawal);

  // Filtered farmers list
  const filteredFarmers = assignedFarmers.filter(f => {
    if (!farmerSearch.trim()) return true;
    const q = farmerSearch.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.farmerIdCode.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.mobileNumber.includes(q)
    );
  });

  // Quick preset quantity adjustment
  const handlePresetVolume = (litres: number) => {
    setQuantityLitres(litres.toFixed(1));
    setErrorMsg(null);
  };

  const handleStepVolume = (delta: number) => {
    const current = parseFloat(quantityLitres) || 0;
    const nextVal = Math.max(0, current + delta);
    setQuantityLitres(nextVal > 0 ? nextVal.toFixed(1) : '');
    setErrorMsg(null);
  };

  const handleSubmit = () => {
    setErrorMsg(null);
    const qty = parseFloat(quantityLitres);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid measured milk volume in litres (greater than 0).');
      return;
    }

    setSubmitting(true);
    try {
      if (measurementMethod === 'farmer_wise') {
        const farmerObj = farmers.find(f => f.id === selectedFarmerId) || selectedFarmer;
        recordMilk({
          farmerId: selectedFarmerId,
          farmerName: farmerObj?.name,
          boothId: booth.id,
          collectionDate,
          session,
          quantityLitres: qty,
          route,
          vendorId: route === 'vendor' ? selectedVendorId : undefined,
          vendorName: route === 'vendor' ? vendors.find(v => v.id === selectedVendorId)?.name : undefined,
          measurementMethod: 'farmer_wise',
          individualAllocation: 'measured',
          createdBy: user?.fullName || 'Society Operator',
          notes: notes.trim() || undefined,
        });

        Alert.alert(
          'Milk Intake Recorded Successfully',
          `Successfully recorded ${qty.toFixed(2)} Litres for ${farmerObj?.name}.\n\nThe collection entry has been logged into the society ledger and eligible dispatch total.`,
          [
            {
              text: '+ Record Another Entry',
              onPress: () => {
                setQuantityLitres('');
                setNotes('');
              },
            },
            {
              text: 'Review Dispatch Receipts',
              onPress: () => router.push('/(booth)/review-collection'),
            },
          ]
        );
      } else {
        // Combined bulk route batch
        const vendorObj = vendors.find(v => v.id === selectedVendorId) || selectedVendor;
        recordMilk({
          farmerId: undefined,
          farmerName: undefined,
          boothId: booth.id,
          collectionDate,
          session,
          quantityLitres: qty,
          route: 'vendor',
          vendorId: selectedVendorId,
          vendorName: vendorObj?.name,
          measurementMethod: 'combined',
          individualAllocation: 'not_available',
          createdBy: user?.fullName || 'Society Operator',
          notes: notes.trim() || 'Bulk intake batch from route vendor cans.',
        });

        Alert.alert(
          'Combined Route Batch Recorded',
          `Successfully recorded ${qty.toFixed(2)} Litres for Vendor ${vendorObj?.name} (Method: Combined Bulk Route).\n\nConsolidated volume added to the eligible society dispatch receipt.`,
          [
            {
              text: '+ Record Another Entry',
              onPress: () => {
                setQuantityLitres('');
                setNotes('');
              },
            },
            {
              text: 'Review Dispatch Receipts',
              onPress: () => router.push('/(booth)/review-collection'),
            },
          ]
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save milk collection entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live calculation preview
  const enteredQty = parseFloat(quantityLitres) || 0;
  const estimatedPayout = (enteredQty * 35.5).toFixed(2); // Avg standard rate ₹35.50/L

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader 
        title="Record Milk Collection"
        subtitle={`Milk Intake Station • ${booth.name}`}
        showBack
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Intake Mode Toggle Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Intake Measurement Mode
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
            Select direct individual producer weighing or consolidated route logistics batch
          </Text>

          <View style={styles.modeToggleRow}>
            {/* Mode 1: Farmer Direct */}
            <Pressable
              onPress={() => setMeasurementMethod('farmer_wise')}
              style={[
                styles.modeToggleCard,
                {
                  backgroundColor: measurementMethod === 'farmer_wise' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: measurementMethod === 'farmer_wise' ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.modeTextCol}>
                <Text style={[Typography.subhead, { color: measurementMethod === 'farmer_wise' ? colors.primary : colors.text, fontWeight: '800', textAlign: 'center' }]}>
                  Farmer-Wise
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 3 }]}>
                  Individual Weighing
                </Text>
              </View>
            </Pressable>

            {/* Mode 2: Combined Route */}
            <Pressable
              onPress={() => setMeasurementMethod('combined')}
              style={[
                styles.modeToggleCard,
                {
                  backgroundColor: measurementMethod === 'combined' ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: measurementMethod === 'combined' ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.modeTextCol}>
                <Text style={[Typography.subhead, { color: measurementMethod === 'combined' ? colors.primary : colors.text, fontWeight: '800', textAlign: 'center' }]}>
                  Combined Route
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 3 }]}>
                  Bulk Can Batch
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* Error Notification */}
        {errorMsg && (
          <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={[Typography.footnote, { color: '#B91C1C', flex: 1, fontWeight: '600' }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* 2. Producer / Vendor Selection Card */}
        {measurementMethod === 'farmer_wise' ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                Selected Milk Producer
              </Text>
              <Pressable 
                onPress={() => setShowFarmerSelector(!showFarmerSelector)}
                style={styles.changeProducerLink}
              >
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800' }]}>
                  {showFarmerSelector ? 'Close List' : 'Change Producer ▾'}
                </Text>
              </Pressable>
            </View>

            {/* Active Producer Spotlight Banner - Clickable Card to Change Producer */}
            {selectedFarmer && (
              <Pressable
                onPress={() => setShowFarmerSelector(!showFarmerSelector)}
                style={({ pressed }) => [
                  styles.farmerSpotlightBox,
                  {
                    backgroundColor: showFarmerSelector 
                      ? (isDark ? '#1E293B' : '#EFF6FF') 
                      : (isDark ? '#1E293B' : '#F8FAFC'),
                    borderColor: showFarmerSelector ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.farmerSpotlightAvatar}>
                  <Text style={styles.avatarInitials}>
                    {selectedFarmer.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.farmerSpotlightDetails}>
                  <View style={styles.farmerNameCodeRow}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: '900' }]} numberOfLines={1}>
                      {selectedFarmer.name}
                    </Text>
                    <View style={styles.farmerCodeBadge}>
                      <Text style={styles.farmerCodeBadgeText}>{selectedFarmer.farmerIdCode}</Text>
                    </View>
                  </View>

                  <View style={styles.farmerMetaAlignedRow}>
                    <View style={styles.metaIconText}>
                      <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.village}
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaIconText}>
                      <Ionicons name="paw-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.numberOfCows} Cattle
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaIconText}>
                      <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                      <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 3 }]}>
                        {selectedFarmer.mobileNumber.slice(-4)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Action Badge / Chevron Indicator */}
                <View style={[styles.changeFarmerActionPill, { backgroundColor: showFarmerSelector ? colors.primaryLight : (isDark ? '#334155' : '#E0F2FE') }]}>
                  <Text style={[styles.changeFarmerActionText, { color: colors.primary }]}>
                    {showFarmerSelector ? 'Close' : 'Change'}
                  </Text>
                  <Ionicons 
                    name={showFarmerSelector ? "chevron-up" : "chevron-forward"} 
                    size={14} 
                    color={colors.primary} 
                  />
                </View>
              </Pressable>
            )}

            {/* Expandable Searchable Farmer List */}
            {showFarmerSelector && (
              <View style={[styles.farmerDropdownContainer, { borderTopColor: colors.border }]}>
                {/* Search Input */}
                <View style={[styles.farmerSearchInputRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: colors.border }]}>
                  <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Search by name, ID code, or village..."
                    placeholderTextColor={colors.textMuted}
                    value={farmerSearch}
                    onChangeText={setFarmerSearch}
                    style={[styles.farmerSearchTextInput, { color: colors.text }]}
                  />
                  {farmerSearch.length > 0 && (
                    <Pressable onPress={() => setFarmerSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* Farmers Radio List */}
                <View style={styles.farmerListScroll}>
                  {filteredFarmers.map((f) => {
                    const isSelected = selectedFarmerId === f.id;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          setSelectedFarmerId(f.id);
                          setShowFarmerSelector(false);
                        }}
                        style={[
                          styles.farmerOptionCard,
                          {
                            backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#FFFFFF'),
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons 
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                          size={18} 
                          color={isSelected ? colors.primary : colors.textMuted} 
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                              {f.name}
                            </Text>
                            <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700' }]}>
                              {f.farmerIdCode}
                            </Text>
                          </View>
                          <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                            {f.village} • {f.numberOfCows} Cows • +91 {f.mobileNumber}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Active Withdrawal Warning for this farmer */}
            {cowWithWithdrawal && (
              <View style={styles.withdrawalWarningCard}>
                <View style={styles.warningIconFrame}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[Typography.caption1, { color: '#B91C1C', fontWeight: '900' }]}>
                    SAFETY WITHDRAWAL HOLD: ACTIVE MEDICINE
                  </Text>
                  <Text style={[Typography.caption2, { color: '#991B1B', marginTop: 2, lineHeight: 16 }]}>
                    Cow "{cowWithWithdrawal.name}" (Tag #{cowWithWithdrawal.tagId}) is under antibiotic withdrawal hold. Ensure milk from this animal was segregated and NOT included in this batch!
                  </Text>
                </View>
              </View>
            )}

            {/* Delivery Route Selector */}
            <View style={[styles.routeSection, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.routeHeaderRow}>
                <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                  Delivery Handover Method
                </Text>
              </View>
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
                Specify how the milk batch physically reached the booth
              </Text>

              <View style={styles.routeToggleRow}>
                <Pressable
                  onPress={() => setRoute('direct')}
                  style={[
                    styles.routeToggleBtn,
                    {
                      backgroundColor: route === 'direct' ? (isDark ? '#0F172A' : '#EFF6FF') : (isDark ? '#1E293B' : '#FFFFFF'),
                      borderColor: route === 'direct' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.routeBtnTextCol}>
                    <Text style={[styles.routeToggleBtnText, { color: route === 'direct' ? colors.primary : colors.text }]}>
                      Direct Producer Supply
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2 }]}>
                      Producer Handover
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setRoute('vendor')}
                  style={[
                    styles.routeToggleBtn,
                    {
                      backgroundColor: route === 'vendor' ? (isDark ? '#0F172A' : '#EFF6FF') : (isDark ? '#1E293B' : '#FFFFFF'),
                      borderColor: route === 'vendor' ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.routeBtnTextCol}>
                    <Text style={[styles.routeToggleBtnText, { color: route === 'vendor' ? colors.primary : colors.text }]}>
                      Route Transport Vehicle
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 2 }]}>
                      Vendor Can Route
                    </Text>
                  </View>
                </Pressable>
              </View>

              {route === 'vendor' && (
                <View style={[styles.vendorSelectContainer, { borderColor: colors.border }]}>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 6 }]}>
                    Select Route Vendor:
                  </Text>
                  {vendors.map((v) => (
                    <Pressable
                      key={v.id}
                      onPress={() => setSelectedVendorId(v.id)}
                      style={[
                        styles.vendorSelectRow,
                        {
                          backgroundColor: selectedVendorId === v.id ? colors.primaryLight : 'transparent',
                          borderColor: selectedVendorId === v.id ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons 
                        name={selectedVendorId === v.id ? "radio-button-on" : "radio-button-off"} 
                        size={16} 
                        color={selectedVendorId === v.id ? colors.primary : colors.textMuted} 
                      />
                      <Text style={[Typography.caption1, { color: colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }]}>
                        {v.name} ({v.vehicleNumber}) • Route: {v.routeName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </Card>
        ) : (
          /* Combined Route Batch Vendor Selection */
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bus-outline" size={18} color={colors.primary} />
              <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
                Combined Route Logistics Batch
              </Text>
            </View>
            <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 12 }]}>
              Measured as a single combined bulk volume from route collection cans without individual weighing.
            </Text>

            <View style={styles.vendorCardsList}>
              {vendors.map((v) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVendorId(v.id)}
                    style={[
                      styles.vendorBatchOptionCard,
                      {
                        backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons 
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                      size={18} 
                      color={isSelected ? colors.primary : colors.textMuted} 
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800' }]}>
                        {v.name}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        Route: {v.routeName} • Vehicle: {v.vehicleNumber} • ID: {v.id}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {/* 3. Measured Volume Hero Input Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="water" size={18} color="#0072BC" />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Milk Intake Volume
            </Text>
          </View>
          <Text style={[Typography.caption2, { color: colors.textSecondary, marginBottom: 10 }]}>
            Enter calibrated volumetric measurement in Litres
          </Text>

          {/* Big Number Input Container */}
          <View style={[styles.volumeInputBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
            <TextInput
              style={[styles.bigVolumeTextInput, { color: colors.primary }]}
              placeholder="0.0"
              placeholderTextColor={colors.textMuted}
              value={quantityLitres}
              onChangeText={(t) => { setQuantityLitres(t); setErrorMsg(null); }}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <View style={styles.volumeUnitTag}>
              <Ionicons name="water-outline" size={14} color="#0284C7" />
              <Text style={styles.volumeUnitTagText}>LITRES (L)</Text>
            </View>
          </View>

          {/* Quick Fine-Adjustment Stepper Buttons */}
          <View style={styles.stepperRow}>
            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(-1.0)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>- 1.0 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(-0.5)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>- 0.5 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(0.5)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+ 0.5 L</Text>
            </Pressable>

            <Pressable 
              style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}
              onPress={() => handleStepVolume(1.0)}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+ 1.0 L</Text>
            </Pressable>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.presetsRow}>
            {[5, 10, 15, 20, 25].map((preset) => (
              <Pressable
                key={preset}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: enteredQty === preset ? colors.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                    borderColor: enteredQty === preset ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handlePresetVolume(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: enteredQty === preset ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {preset} L
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* 4. Session & Shift Selection */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              Intake Shift & Session
            </Text>
          </View>

          <View style={styles.sessionToggleRow}>
            {/* Morning Shift */}
            <Pressable
              onPress={() => setSession('morning')}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: session === 'morning' ? '#FEF3C7' : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: session === 'morning' ? '#D97706' : colors.border,
                },
              ]}
            >
              <View style={[styles.sessionIconCircle, { backgroundColor: session === 'morning' ? '#F59E0B' : '#E2E8F0' }]}>
                <Ionicons name="sunny" size={16} color={session === 'morning' ? '#FFFFFF' : '#64748B'} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: session === 'morning' ? '#92400E' : colors.text, fontWeight: '800' }]}>
                  Morning Shift
                </Text>
                <Text style={[Typography.caption2, { color: session === 'morning' ? '#B45309' : colors.textSecondary }]}>
                  காலை • 06:00 - 09:30 AM
                </Text>
              </View>
              <Ionicons 
                name={session === 'morning' ? "checkmark-circle" : "ellipse-outline"} 
                size={18} 
                color={session === 'morning' ? "#D97706" : colors.textMuted} 
              />
            </Pressable>

            {/* Evening Shift */}
            <Pressable
              onPress={() => setSession('evening')}
              style={[
                styles.sessionCard,
                {
                  backgroundColor: session === 'evening' ? '#E0E7FF' : (isDark ? '#0F172A' : '#F8FAFC'),
                  borderColor: session === 'evening' ? '#4F46E5' : colors.border,
                },
              ]}
            >
              <View style={[styles.sessionIconCircle, { backgroundColor: session === 'evening' ? '#6366F1' : '#E2E8F0' }]}>
                <Ionicons name="moon" size={16} color={session === 'evening' ? '#FFFFFF' : '#64748B'} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.subhead, { color: session === 'evening' ? '#3730A3' : colors.text, fontWeight: '800' }]}>
                  Evening Shift
                </Text>
                <Text style={[Typography.caption2, { color: session === 'evening' ? '#4338CA' : colors.textSecondary }]}>
                  மாலை • 04:30 - 07:30 PM
                </Text>
              </View>
              <Ionicons 
                name={session === 'evening' ? "checkmark-circle" : "ellipse-outline"} 
                size={18} 
                color={session === 'evening' ? "#4F46E5" : colors.textMuted} 
              />
            </Pressable>
          </View>
        </Card>

        {/* 5. Date & Operator Remarks Card */}
        <Card style={styles.sectionCard}>
          <TextField
            label="Collection Date (YYYY-MM-DD)"
            value={collectionDate}
            onChangeText={setCollectionDate}
            icon="calendar-outline"
          />

          <TextField
            label="Operator Notes (Optional)"
            placeholder="e.g. Can #4 inspected, lactometer 1.028, FAT/SNF passed"
            value={notes}
            onChangeText={setNotes}
            icon="create-outline"
            helperText="Quality remarks, can IDs, or lactometer test observations"
          />
        </Card>

        {/* 6. Live Intake Summary & Payout Preview (When Volume Entered) */}
        {enteredQty > 0 && (
          <View style={[styles.livePreviewCard, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: '#86EFAC' }]}>
            <View style={styles.livePreviewHeader}>
              <Ionicons name="calculator-outline" size={16} color="#15803D" />
              <Text style={[Typography.caption2, { color: '#166534', fontWeight: '800', marginLeft: 6 }]}>
                INTAKE AUDIT & ESTIMATED VALUE
              </Text>
            </View>

            <View style={styles.livePreviewValuesRow}>
              <View style={styles.livePreviewCol}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Net Volume</Text>
                <Text style={[Typography.headline, { color: '#15803D', fontWeight: '900' }]}>
                  {enteredQty.toFixed(1)} L
                </Text>
              </View>

              <View style={styles.livePreviewDivider} />

              <View style={styles.livePreviewCol}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Est. Value (@₹35.5/L)</Text>
                <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                  ₹{estimatedPayout}
                </Text>
              </View>

              <View style={styles.livePreviewDivider} />

              <View style={styles.livePreviewCol}>
                <Text style={[Typography.caption2, { color: colors.textSecondary }]}>Reconciliation</Text>
                <Text style={[Typography.subhead, { color: colors.primary, fontWeight: '800' }]}>
                  Eligible
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 7. Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title={submitting ? "Saving Intake Entry..." : "Submit Milk Intake Record"}
            size="lg"
            loading={submitting}
            onPress={handleSubmit}
            icon="checkmark-circle-outline"
            style={{ marginTop: 4 }}
          />

          <Button
            title="Review Daily Collection Ledger"
            variant="outline"
            onPress={() => router.push('/(booth)/review-collection')}
            style={{ marginTop: 10, marginBottom: 28 }}
          />
        </View>
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
    paddingBottom: 48,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeToggleCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modeTextCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  changeProducerLink: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  farmerSpotlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  farmerSpotlightAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0072BC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  farmerSpotlightDetails: {
    flex: 1,
    marginLeft: 12,
  },
  farmerNameCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  farmerCodeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  farmerCodeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  farmerMetaAlignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaIconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDot: {
    color: '#94A3B8',
    marginHorizontal: 5,
    fontSize: 10,
  },
  changeFarmerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
    marginLeft: 8,
  },
  changeFarmerActionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  farmerDropdownContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  farmerSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  farmerSearchTextInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  farmerListScroll: {
    maxHeight: 220,
    gap: 8,
  },
  farmerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  withdrawalWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  warningIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeSection: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  routeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  routeBtnTextCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  vendorSelectContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  vendorSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  vendorCardsList: {
    gap: 8,
  },
  vendorBatchOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  volumeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginVertical: 4,
  },
  bigVolumeTextInput: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
    padding: 0,
  },
  volumeUnitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  volumeUnitTagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stepperBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepperBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sessionToggleRow: {
    gap: 10,
    marginTop: 4,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  sessionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePreviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  livePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePreviewValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePreviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  livePreviewDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#86EFAC',
  },
  actionsContainer: {
    marginTop: 2,
    marginBottom: 16,
  },
});
