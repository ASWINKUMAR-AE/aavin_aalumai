import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Card } from '../../components/ui/Card';
import { DemoHeader } from '../../components/DemoHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export interface CowFormItem {
  id: string;
  pashuAadhaar: string; // 12-digit RFID tag (Mandatory *)
  breed: string; // Cow type/breed (Mandatory *)
  milkCapacity: string; // Daily milk yield in Litres (Mandatory *)
  name: string; // Cow name or nickname (Optional)
}

const POPULAR_BREEDS = [
  'Jersey Cross',
  'HF Cross',
  'Kangeyam',
  'Murrah Buffalo',
  'Umblachery',
  'Sindhi Cross',
];

const MILK_PRESETS = ['6', '8', '10', '12', '15', '18', '22'];

export default function RegisterFarmerScreen() {
  const { user } = useAuth();
  const { booths, cows, addFarmer } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const defaultBoothId = (user?.role === 'booth' && user.associatedId) 
    ? user.associatedId 
    : (booths[0]?.id || 'BOOTH001');

  // Farmer Details State (Entered by Booth Operator)
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('Melur Rural');
  const [community, setCommunity] = useState('Melur Taluk');
  const [assignedBoothId, setAssignedBoothId] = useState(defaultBoothId);
  const [farmerIdCode, setFarmerIdCode] = useState(`FARM-MDU-${Math.floor(105 + Math.random() * 800)}`);
  
  // Banking / DBT State
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // N-Cattle Slider State
  const [cowEntries, setCowEntries] = useState<CowFormItem[]>([
    { id: 'cow_1', pashuAadhaar: '', breed: 'Jersey Cross', milkCapacity: '12.0', name: '' },
  ]);
  const [activeCowSlide, setActiveCowSlide] = useState(0);

  // Form Validation & Submitting State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Helper to add a new cow card to slider and slide to it
  const handleAddCow = () => {
    const nextIdx = cowEntries.length + 1;
    const newCow: CowFormItem = {
      id: `cow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pashuAadhaar: '',
      breed: 'Jersey Cross',
      milkCapacity: '12.0',
      name: '',
    };
    setCowEntries(prev => [...prev, newCow]);
    setActiveCowSlide(cowEntries.length);
  };

  // Helper to remove a cow card
  const handleRemoveCow = (id: string) => {
    if (cowEntries.length <= 1) {
      Alert.alert('Cannot Remove', 'Every registered farmer must have at least one cow.');
      return;
    }
    const idxToRemove = cowEntries.findIndex(c => c.id === id);
    setCowEntries(prev => prev.filter(c => c.id !== id));
    if (activeCowSlide >= idxToRemove && activeCowSlide > 0) {
      setActiveCowSlide(prev => prev - 1);
    }
  };

  // Helper to update a field in a specific cow card
  const handleUpdateCow = (id: string, field: keyof CowFormItem, value: string) => {
    setCowEntries(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));

    // Clear specific field error if present
    const errKey = `cow_${id}_${field}`;
    if (errors[errKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  // Validation function
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Farmer Details Validation
    if (!name.trim()) errs.name = 'Farmer name is required.';
    
    const phoneClean = mobileNumber.trim().replace(/\D/g, '');
    if (!phoneClean) {
      errs.mobileNumber = 'Mobile phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(phoneClean)) {
      errs.mobileNumber = 'Enter a valid 10-digit Indian mobile number (starts with 6-9).';
    }

    if (!address.trim()) errs.address = 'Street/Door address is required.';
    if (!village.trim()) errs.village = 'Village name is required.';
    if (!farmerIdCode.trim()) errs.farmerIdCode = 'Farmer ID Code is required.';

    // 2. Cows Validation (N Cows in Slider)
    if (cowEntries.length === 0) {
      errs.cowsGeneral = 'At least 1 cow must be registered.';
    }

    const seenFormTags = new Set<string>();

    cowEntries.forEach((c, index) => {
      const cowNum = index + 1;
      const cleanTag = c.pashuAadhaar.trim().replace(/\D/g, '');

      // Mandatory 12-digit Pashu Aadhaar Validation
      if (!cleanTag) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: 12-digit Pashu Aadhaar Number is mandatory.`;
      } else if (cleanTag.length !== 12) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Must be exactly 12 digits (currently ${cleanTag.length}).`;
      } else if (seenFormTags.has(cleanTag)) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Duplicate Pashu Aadhaar #${cleanTag} entered for multiple cows.`;
      } else if (cows.some(existing => existing.tagId === cleanTag)) {
        errs[`cow_${c.id}_pashuAadhaar`] = `Cow #${cowNum}: Pashu Aadhaar #${cleanTag} is already registered in Aavin database.`;
      }
      seenFormTags.add(cleanTag);

      // Mandatory Breed/Type Validation
      if (!c.breed.trim()) {
        errs[`cow_${c.id}_breed`] = `Cow #${cowNum}: Cattle type / breed is required.`;
      }

      // Mandatory Milk Capacity Validation
      const milkNum = parseFloat(c.milkCapacity);
      if (isNaN(milkNum) || milkNum <= 0) {
        errs[`cow_${c.id}_milkCapacity`] = `Cow #${cowNum}: Enter a valid daily milk yield (e.g. 12.0 L).`;
      }
    });

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstErrorMessage = Object.values(errs)[0];
      Alert.alert('Validation Error', firstErrorMessage);
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const initialCows = cowEntries.map((c, idx) => ({
        pashuAadhaar: c.pashuAadhaar.trim().replace(/\D/g, ''),
        breed: c.breed.trim() || 'Jersey Cross',
        milkCapacity: parseFloat(c.milkCapacity) || 10,
        name: c.name.trim() || `Cow #${idx + 1} (${c.breed.trim() || 'Jersey Cross'})`,
      }));

      const created = addFarmer(
        {
          farmerIdCode: farmerIdCode.trim().toUpperCase(),
          name: name.trim(),
          mobileNumber: mobileNumber.trim().replace(/\D/g, ''),
          address: address.trim(),
          village: village.trim(),
          community: community.trim(),
          numberOfCows: cowEntries.length,
          assignedBoothId,
          verificationStatus: 'pending',
          bankAccountName: bankAccountName.trim() || undefined,
          bankName: bankName.trim() || undefined,
          bankAccountNumber: bankAccountNumber.trim() || undefined,
          bankIfsc: bankIfsc.trim().toUpperCase() || undefined,
          upiId: upiId.trim() || undefined,
        },
        initialCows
      );

      const societyName = booths.find(b => b.id === assignedBoothId)?.name || 'Society';

      Alert.alert(
        'Farmer & Cattle Enrolled Successfully!',
        `Society staff successfully enrolled farmer ${created.name} (${created.farmerIdCode}) and ${cowEntries.length} cattle passports with 12-digit Pashu Aadhaar RFID tags under ${societyName}.`,
        [
          {
            text: 'Return to Farmers Directory',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(booth)/farmers');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register farmer and cattle.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCow = cowEntries[activeCowSlide] || cowEntries[0];
  const isCurrentComplete = currentCow && currentCow.pashuAadhaar.length === 12 && !!currentCow.breed && parseFloat(currentCow.milkCapacity) > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <DemoHeader 
        title="New Farmer & Cattle Enrollment"
        subtitle={`Society Staff Intake • ${booths.find(b => b.id === assignedBoothId)?.name || 'Society'}`}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Operator Guidance Banner */}
        <View style={[styles.govBanner, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#93C5FD' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#1D4ED8" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[Typography.subhead, { color: '#1E40AF', fontWeight: '800' }]}>
              Society Staff Member Registration
            </Text>
            <Text style={[Typography.caption2, { color: '#1E3A8A', marginTop: 2, lineHeight: 16 }]}>
              Enter producer details and slide through the cattle passport cards to register 12-digit Pashu Aadhaar tags, breed, and milk capacity.
            </Text>
          </View>
        </View>

        {/* 1. Farmer Identity & Details Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="person" size={16} color="#15803D" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              1. Producer Identity & Contact
            </Text>
          </View>

          <TextField
            label="Full Name *"
            placeholder="e.g. K. Murugesan"
            value={name}
            onChangeText={(t) => { setName(t); setErrors({ ...errors, name: '' }); }}
            error={errors.name}
            icon="person-outline"
          />

          <TextField
            label="10-Digit Mobile Number *"
            placeholder="e.g. 9842000002"
            value={mobileNumber}
            onChangeText={(t) => { setMobileNumber(t); setErrors({ ...errors, mobileNumber: '' }); }}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.mobileNumber}
            icon="call-outline"
          />

          <TextField
            label="Farmer ID Code *"
            placeholder="e.g. FARM-MDU-105"
            value={farmerIdCode}
            onChangeText={(t) => { setFarmerIdCode(t); setErrors({ ...errors, farmerIdCode: '' }); }}
            autoCapitalize="characters"
            error={errors.farmerIdCode}
            icon="card-outline"
          />
        </Card>

        {/* 2. Cattle Passport Enrollment - SLIDER CAROUSEL */}
        <Card style={[styles.card, { borderColor: '#86EFAC', borderWidth: 1.5 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="paw" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                2. Cattle Passports Slider ({cowEntries.length} {cowEntries.length === 1 ? 'Cow' : 'Cows'})
              </Text>
              <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                Slide across tabs to configure 12-digit Pashu Aadhaar, breed & capacity
              </Text>
            </View>
          </View>

          {/* Slider Tabs Navigation */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.sliderTabsRow}
          >
            {cowEntries.map((c, idx) => {
              const isActive = idx === activeCowSlide;
              const isComplete = c.pashuAadhaar.length === 12 && !!c.breed && parseFloat(c.milkCapacity) > 0;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCowSlide(idx)}
                  style={[
                    styles.sliderTabPill,
                    {
                      backgroundColor: isActive ? colors.primary : (isDark ? '#0F172A' : '#F1F5F9'),
                      borderColor: isActive ? colors.primary : (isComplete ? '#86EFAC' : colors.border),
                    }
                  ]}
                >
                  <Ionicons 
                    name={isComplete ? "checkmark-circle" : "paw"} 
                    size={14} 
                    color={isActive ? "#FFFFFF" : (isComplete ? "#15803D" : colors.textSecondary)} 
                  />
                  <Text style={[
                    styles.sliderTabPillText, 
                    { color: isActive ? "#FFFFFF" : colors.text, fontWeight: isActive ? '800' : '600' }
                  ]}>
                    Cow #{idx + 1}
                  </Text>
                  {isComplete && !isActive && (
                    <View style={styles.tabGreenDot} />
                  )}
                </Pressable>
              );
            })}

            <Pressable 
              onPress={handleAddCow}
              style={[styles.sliderAddTabBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.sliderAddTabBtnText, { color: colors.primary }]}>
                + Add Cow
              </Text>
            </Pressable>
          </ScrollView>

          {/* Active Cow Slide Card */}
          {currentCow && (
            <View style={[styles.activeSlideCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
              {/* Slide Top Bar */}
              <View style={styles.slideHeader}>
                <View style={[styles.slideIndexBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.slideIndexBadgeText, { color: colors.primary }]}>
                    Cattle #{activeCowSlide + 1} of {cowEntries.length}
                  </Text>
                </View>

                {isCurrentComplete ? (
                  <View style={styles.tagVerifiedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                    <Text style={styles.tagVerifiedPillText}>READY</Text>
                  </View>
                ) : (
                  <View style={styles.tagPendingPill}>
                    <Text style={styles.tagPendingPillText}>
                      {currentCow.pashuAadhaar.length}/12 Digits
                    </Text>
                  </View>
                )}

                {cowEntries.length > 1 && (
                  <Pressable 
                    onPress={() => handleRemoveCow(currentCow.id)}
                    style={styles.removeSlideBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    <Text style={styles.removeSlideBtnText}>Remove</Text>
                  </Pressable>
                )}
              </View>

              {/* 1. Pashu Aadhaar 12-Digit Input (Mandatory *) */}
              <View style={{ marginBottom: 12 }}>
                <TextField
                  label={`Cow #${activeCowSlide + 1} Pashu Aadhaar Number (12 Digits) *`}
                  placeholder="e.g. 100100001055"
                  value={currentCow.pashuAadhaar}
                  onChangeText={(val) => {
                    const numericOnly = val.replace(/\D/g, '').slice(0, 12);
                    handleUpdateCow(currentCow.id, 'pashuAadhaar', numericOnly);
                  }}
                  keyboardType="number-pad"
                  maxLength={12}
                  error={errors[`cow_${currentCow.id}_pashuAadhaar`]}
                  icon="barcode-outline"
                />
                <View style={styles.aadhaarCounterRow}>
                  <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                    Official Govt. 12-digit RFID Tag
                  </Text>
                  <Text style={[
                    Typography.caption2, 
                    { 
                      fontWeight: '700', 
                      color: currentCow.pashuAadhaar.length === 12 ? '#15803D' : (currentCow.pashuAadhaar.length > 0 ? '#D97706' : colors.textMuted) 
                    }
                  ]}>
                    {currentCow.pashuAadhaar.length} / 12 digits {currentCow.pashuAadhaar.length === 12 ? '✓' : ''}
                  </Text>
                </View>
              </View>

              {/* 2. Cattle Type / Breed Selection (Mandatory *) */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                  Cattle Type / Breed *
                </Text>
                <View style={styles.breedChipsWrap}>
                  {POPULAR_BREEDS.map((breed) => {
                    const isSelected = currentCow.breed === breed;
                    return (
                      <Pressable
                        key={breed}
                        onPress={() => handleUpdateCow(currentCow.id, 'breed', breed)}
                        style={[
                          styles.breedChip,
                          {
                            backgroundColor: isSelected ? colors.primary : (isDark ? '#0F172A' : '#F1F5F9'),
                            borderColor: isSelected ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <Text style={[
                          styles.breedChipText,
                          { color: isSelected ? '#FFFFFF' : colors.text, fontWeight: isSelected ? '800' : '600' }
                        ]}>
                          {breed}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 3. Milk Capacity Slider (Mandatory *) */}
              <View style={{ marginBottom: 14 }}>
                <View style={styles.capacityHeaderRow}>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                    Daily Milk Capacity *
                  </Text>
                  <View style={styles.capacityValuePill}>
                    <Text style={styles.capacityValueText}>
                      {parseFloat(currentCow.milkCapacity || '0').toFixed(1)} L / day
                    </Text>
                  </View>
                </View>

                {/* Interactive Slider Bar with Steppers */}
                <View style={styles.sliderControlRow}>
                  <Pressable 
                    onPress={() => {
                      const current = parseFloat(currentCow.milkCapacity) || 10;
                      const nextVal = Math.max(1, current - 0.5);
                      handleUpdateCow(currentCow.id, 'milkCapacity', nextVal.toFixed(1));
                    }}
                    style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                    hitSlop={6}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </Pressable>

                  {/* Visual Slider Bar Track */}
                  <View style={[styles.sliderTrackContainer, { backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }]}>
                    <View 
                      style={[
                        styles.sliderTrackFill, 
                        { width: `${Math.min(100, Math.max(4, ((parseFloat(currentCow.milkCapacity) || 0) / 25) * 100))}%` }
                      ]} 
                    />
                  </View>

                  <Pressable 
                    onPress={() => {
                      const current = parseFloat(currentCow.milkCapacity) || 10;
                      const nextVal = Math.min(35, current + 0.5);
                      handleUpdateCow(currentCow.id, 'milkCapacity', nextVal.toFixed(1));
                    }}
                    style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </Pressable>
                </View>

                {/* Milk Capacity Presets */}
                <View style={styles.presetsRow}>
                  <Text style={[Typography.caption2, { color: colors.textMuted, marginRight: 6 }]}>
                    Presets:
                  </Text>
                  {MILK_PRESETS.map((preset) => {
                    const isPresetActive = parseFloat(currentCow.milkCapacity) === parseFloat(preset);
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => handleUpdateCow(currentCow.id, 'milkCapacity', preset)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isPresetActive ? '#DCFCE7' : (isDark ? '#0F172A' : '#F8FAFC'),
                            borderColor: isPresetActive ? '#16A34A' : colors.border,
                          }
                        ]}
                      >
                        <Text style={[
                          styles.presetChipText,
                          { color: isPresetActive ? '#15803D' : colors.textSecondary }
                        ]}>
                          {preset}L
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 4. Cow Nickname (Optional) */}
              <TextField
                label="Cattle Nickname (Optional)"
                placeholder="e.g. Lakshmi / Kamadhenu"
                value={currentCow.name}
                onChangeText={(val) => handleUpdateCow(currentCow.id, 'name', val)}
                icon="happy-outline"
              />

              {/* Slide Navigation Footer: Prev / Next */}
              <View style={styles.slideFooterNav}>
                <Button
                  title="< Prev Cow"
                  variant="outline"
                  size="sm"
                  disabled={activeCowSlide === 0}
                  onPress={() => setActiveCowSlide(prev => Math.max(0, prev - 1))}
                  style={{ flex: 1, marginRight: 6 }}
                />

                {activeCowSlide < cowEntries.length - 1 ? (
                  <Button
                    title="Next Cow >"
                    size="sm"
                    onPress={() => setActiveCowSlide(prev => Math.min(cowEntries.length - 1, prev + 1))}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                ) : (
                  <Button
                    title="+ Add Next Cow"
                    size="sm"
                    onPress={handleAddCow}
                    style={{ flex: 1, marginLeft: 6 }}
                  />
                )}
              </View>
            </View>
          )}
        </Card>

        {/* 3. Location & Society Assignment Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="business" size={16} color="#0284C7" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              3. Location & Primary Society
            </Text>
          </View>

          <TextField
            label="Residential Address *"
            placeholder="e.g. 14, South Street, Melur"
            value={address}
            onChangeText={(t) => { setAddress(t); setErrors({ ...errors, address: '' }); }}
            error={errors.address}
            icon="home-outline"
          />

          <TextField
            label="Village *"
            placeholder="e.g. Melur Rural"
            value={village}
            onChangeText={(t) => { setVillage(t); setErrors({ ...errors, village: '' }); }}
            error={errors.village}
            icon="location-outline"
          />

          <TextField
            label="Taluk / Community"
            placeholder="e.g. Melur Taluk"
            value={community}
            onChangeText={setCommunity}
            icon="map-outline"
          />

          <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 4 }]}>
            Assigned Collection Society *
          </Text>
          <View style={styles.boothPickerRow}>
            {booths.map((b) => {
              const isSelected = assignedBoothId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setAssignedBoothId(b.id)}
                  style={[
                    styles.boothOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryLight : colors.card,
                    },
                  ]}
                >
                  <Ionicons 
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'} 
                    size={18} 
                    color={isSelected ? colors.primary : colors.textMuted} 
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={[Typography.subhead, { color: colors.text, fontWeight: isSelected ? '800' : '500' }]}>
                      {b.name}
                    </Text>
                    <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                      Code: {b.code} • {b.taluk}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 4. Direct Benefit Transfer (Optional) Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="card" size={16} color="#D97706" />
            </View>
            <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 8 }]}>
              4. Direct Benefit Transfer (DBT / Bank)
            </Text>
          </View>

          <TextField
            label="Bank Account Holder Name"
            placeholder="e.g. K Murugesan"
            value={bankAccountName}
            onChangeText={setBankAccountName}
            icon="person-circle-outline"
          />

          <TextField
            label="Bank Name"
            placeholder="e.g. Canara Bank - Melur"
            value={bankName}
            onChangeText={setBankName}
            icon="business-outline"
          />

          <TextField
            label="Account Number"
            placeholder="e.g. 109283746501"
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            keyboardType="number-pad"
            icon="wallet-outline"
          />

          <TextField
            label="IFSC Code"
            placeholder="e.g. CNRB0001092"
            value={bankIfsc}
            onChangeText={setBankIfsc}
            autoCapitalize="characters"
            icon="barcode-outline"
          />

          <TextField
            label="UPI ID"
            placeholder="e.g. murugan@okhdfcbank"
            value={upiId}
            onChangeText={setUpiId}
            autoCapitalize="none"
            icon="phone-portrait-outline"
          />
        </Card>

        {/* Submit & Cancel Buttons */}
        <Button
          title={`Enroll Farmer & ${cowEntries.length} ${cowEntries.length === 1 ? 'Cow' : 'Cows'} Passports`}
          onPress={handleRegister}
          loading={submitting}
          size="lg"
          style={{ marginTop: 8 }}
        />

        <Button
          title="Cancel & Return to Farmers Directory"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 10, marginBottom: 36 }}
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
    paddingTop: 14,
  },
  govBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  sliderTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  sliderTabPillText: {
    fontSize: 12,
  },
  tabGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  sliderAddTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  sliderAddTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeSlideCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  slideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slideIndexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slideIndexBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tagVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  tagVerifiedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  tagPendingPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagPendingPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  removeSlideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  removeSlideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  aadhaarCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: 2,
  },
  breedChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  breedChipText: {
    fontSize: 12,
  },
  capacityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capacityValuePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  capacityValueText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  sliderControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrackContainer: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  sliderTrackFill: {
    height: 10,
    backgroundColor: '#16A34A',
    borderRadius: 5,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  slideFooterNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  boothPickerRow: {
    gap: 8,
  },
  boothOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
