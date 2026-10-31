import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  TextInput, 
  Alert, 
  Modal, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { Farmer, Cow } from '../../types/aavin';

export default function BoothFarmersScreen() {
  const { user } = useAuth();
  const { farmers, booths, cows, verifyFarmer, updateFarmer, addFarmer } = useAavinStore();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const boothId = user?.associatedId || 'BOOTH001';
  const booth = booths.find(b => b.id === boothId) || booths[0];

  // New Farmer & Cattle Registration Modal State (Booth Operator Flow)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regIdCode, setRegIdCode] = useState('');
  const [regVillage, setRegVillage] = useState('Melur Rural');
  const [regAddress, setRegAddress] = useState('');
  const [regCommunity, setRegCommunity] = useState('Melur Taluk');
  const [regBankAccName, setRegBankAccName] = useState('');
  const [regBankName, setRegBankName] = useState('Canara Bank - Melur');
  const [regBankAccNum, setRegBankAccNum] = useState('');
  const [regBankIfsc, setRegBankIfsc] = useState('CNRB0001092');
  const [regUpiId, setRegUpiId] = useState('');
  const [regCows, setRegCows] = useState<Array<{
    id: string;
    pashuAadhaar: string;
    breed: string;
    milkCapacity: string;
    name: string;
  }>>([
    { id: 'cow_1', pashuAadhaar: '', breed: 'Jersey Cross', milkCapacity: '12.0', name: '' }
  ]);
  const [activeRegCowSlide, setActiveRegCowSlide] = useState(0);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'assigned' | 'all'>('assigned');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');

  // Edit Modal State
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formIdCode, setFormIdCode] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCommunity, setFormCommunity] = useState('');
  const [formBoothId, setFormBoothId] = useState('');
  const [formCowsCount, setFormCowsCount] = useState('1');
  const [formStatus, setFormStatus] = useState<'verified' | 'pending'>('verified');
  const [formBankAccName, setFormBankAccName] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccNum, setFormBankAccNum] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formUpiId, setFormUpiId] = useState('');
  const [editingFarmerCows, setEditingFarmerCows] = useState<Array<{
    id: string;
    cowId: string;
    tagId: string;
    breed: string;
    name: string;
    dailyMilkYield: number;
    originalCow: Cow | null;
  }>>([]);
  const [activeEditCowSlide, setActiveEditCowSlide] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // List of farmers matching current scope
  const baseFarmers = filterScope === 'assigned' 
    ? farmers.filter(f => f.assignedBoothId === booth.id)
    : farmers;

  const filtered = baseFarmers.filter(f => {
    // Status filter
    if (statusFilter !== 'all' && f.verificationStatus !== statusFilter) {
      return false;
    }
    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) || 
      f.farmerIdCode.toLowerCase().includes(q) || 
      f.mobileNumber.includes(q) ||
      f.village.toLowerCase().includes(q) ||
      (f.community && f.community.toLowerCase().includes(q))
    );
  });

  const handleToggleVerification = (farmerId: string, currentStatus: 'verified' | 'pending') => {
    const nextStatus = currentStatus === 'verified' ? 'pending' : 'verified';
    verifyFarmer(farmerId, nextStatus);
    Alert.alert('KYC Updated', `Farmer status set to ${nextStatus.toUpperCase()}.`);
  };

  const handleOpenEditModal = (farmer: Farmer) => {
    setEditingFarmer(farmer);
    setFormName(farmer.name);
    setFormPhone(farmer.mobileNumber);
    setFormIdCode(farmer.farmerIdCode);
    setFormVillage(farmer.village);
    setFormAddress(farmer.address);
    setFormCommunity(farmer.community || 'Melur Taluk');
    setFormBoothId(farmer.assignedBoothId || booth.id);
    setFormCowsCount(String(farmer.numberOfCows || 1));
    setFormStatus(farmer.verificationStatus);
    setFormBankAccName(farmer.bankAccountName || farmer.name);
    setFormBankName(farmer.bankName || 'Canara Bank - Melur');
    setFormBankAccNum(farmer.bankAccountNumber || '');
    setFormBankIfsc(farmer.bankIfsc || 'CNRB0001092');
    setFormUpiId(farmer.upiId || '');

    // Load cows belonging to this farmer so the operator can edit cow name and capacity
    const farmerCows = cows.filter(c => c.farmerId === farmer.id);
    if (farmerCows.length > 0) {
      setEditingFarmerCows(farmerCows.map(c => ({
        id: c.id,
        cowId: c.cowId,
        tagId: c.tagId,
        breed: c.breed,
        name: c.name || `Cow (${c.breed})`,
        dailyMilkYield: c.dailyMilkYield || 10,
        originalCow: c,
      })));
    } else {
      setEditingFarmerCows([{
        id: `COW_DRAFT_${farmer.id}_1`,
        cowId: `COW-${farmer.farmerIdCode}-01`,
        tagId: `10010000${Math.floor(1000 + Math.random() * 9000)}`,
        breed: 'Jersey Cross',
        name: 'Lakshmi',
        dailyMilkYield: 12,
        originalCow: null,
      }]);
    }
    setActiveEditCowSlide(0);
    setErrors({});
  };

  const handleUpdateEditingCow = (cowId: string, field: 'name' | 'dailyMilkYield', value: any) => {
    setEditingFarmerCows(prev => prev.map(c => {
      if (c.id === cowId) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleCloseModal = () => {
    setEditingFarmer(null);
    setEditingFarmerCows([]);
    setErrors({});
  };

  const handleOpenRegisterModal = () => {
    setRegName('');
    setRegPhone('');
    setRegIdCode(`FARM-MDU-${Math.floor(105 + Math.random() * 800)}`);
    setRegVillage('Melur Rural');
    setRegAddress('');
    setRegCommunity('Melur Taluk');
    setRegBankAccName('');
    setRegBankName('Canara Bank - Melur');
    setRegBankAccNum('');
    setRegBankIfsc('CNRB0001092');
    setRegUpiId('');
    setRegCows([
      { id: `cow_${Date.now()}`, pashuAadhaar: '', breed: 'Jersey Cross', milkCapacity: '12.0', name: '' },
    ]);
    setActiveRegCowSlide(0);
    setRegErrors({});
    setIsRegisterModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setRegErrors({});
  };

  const handleAddRegCowSlide = () => {
    const newCow = {
      id: `cow_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pashuAadhaar: '',
      breed: 'Jersey Cross',
      milkCapacity: '12.0',
      name: '',
    };
    setRegCows(prev => [...prev, newCow]);
    setActiveRegCowSlide(regCows.length);
  };

  const handleRemoveRegCowSlide = (id: string) => {
    if (regCows.length <= 1) {
      Alert.alert('Cannot Remove', 'Every farmer must have at least one cow registered.');
      return;
    }
    const idxToRemove = regCows.findIndex(c => c.id === id);
    setRegCows(prev => prev.filter(c => c.id !== id));
    if (activeRegCowSlide >= idxToRemove && activeRegCowSlide > 0) {
      setActiveRegCowSlide(prev => prev - 1);
    }
  };

  const handleUpdateRegCowSlide = (id: string, field: 'pashuAadhaar' | 'breed' | 'milkCapacity' | 'name', value: string) => {
    setRegCows(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    const errKey = `cow_${id}_${field}`;
    if (regErrors[errKey]) {
      setRegErrors(prev => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const handleSaveNewFarmer = async () => {
    const errs: Record<string, string> = {};

    if (!regName.trim()) errs.name = 'Farmer name is required.';

    const cleanPhone = regPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      errs.phone = 'Mobile phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!regVillage.trim()) errs.village = 'Village name is required.';
    if (!regAddress.trim()) errs.address = 'Street/Door address is required.';

    const seenTags = new Set<string>();
    regCows.forEach((cow, idx) => {
      const cowNum = idx + 1;
      const cleanTag = cow.pashuAadhaar.trim().replace(/\D/g, '');
      if (!cleanTag) {
        errs[`cow_${cow.id}_pashuAadhaar`] = `Cow #${cowNum}: 12-digit Pashu Aadhaar is required.`;
      } else if (cleanTag.length !== 12) {
        errs[`cow_${cow.id}_pashuAadhaar`] = `Cow #${cowNum}: Pashu Aadhaar must be 12 digits (currently ${cleanTag.length}).`;
      } else if (seenTags.has(cleanTag)) {
        errs[`cow_${cow.id}_pashuAadhaar`] = `Cow #${cowNum}: Duplicate Pashu Aadhaar #${cleanTag} entered.`;
      } else if (cows.some(c => c.tagId === cleanTag)) {
        errs[`cow_${cow.id}_pashuAadhaar`] = `Cow #${cowNum}: Pashu Aadhaar #${cleanTag} already exists in database.`;
      }
      seenTags.add(cleanTag);

      if (!cow.breed.trim()) {
        errs[`cow_${cow.id}_breed`] = `Cow #${cowNum}: Cattle type is required.`;
      }
      const milkNum = parseFloat(cow.milkCapacity);
      if (isNaN(milkNum) || milkNum <= 0) {
        errs[`cow_${cow.id}_milkCapacity`] = `Cow #${cowNum}: Enter valid daily milk capacity (L).`;
      }
    });

    setRegErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('Validation Error', Object.values(errs)[0]);
      return;
    }

    setIsRegistering(true);
    try {
      const initialCows = regCows.map((c, idx) => ({
        pashuAadhaar: c.pashuAadhaar.trim().replace(/\D/g, ''),
        breed: c.breed.trim() || 'Jersey Cross',
        milkCapacity: parseFloat(c.milkCapacity) || 10,
        name: c.name.trim() || `Cow #${idx + 1} (${c.breed.trim() || 'Jersey Cross'})`,
      }));

      const created = addFarmer({
        farmerIdCode: regIdCode.trim().toUpperCase() || `FARM-MDU-${Math.floor(105 + Math.random() * 800)}`,
        name: regName.trim(),
        mobileNumber: cleanPhone,
        address: regAddress.trim(),
        village: regVillage.trim(),
        community: regCommunity.trim(),
        numberOfCows: regCows.length,
        assignedBoothId: booth.id,
        verificationStatus: 'verified',
        bankAccountName: regBankAccName.trim() || undefined,
        bankName: regBankName.trim() || undefined,
        bankAccountNumber: regBankAccNum.trim() || undefined,
        bankIfsc: regBankIfsc.trim().toUpperCase() || undefined,
        upiId: regUpiId.trim() || undefined,
      }, initialCows);

      setIsRegistering(false);
      handleCloseRegisterModal();

      Alert.alert(
        'Producer & Cattle Passports Enrolled!',
        `Successfully enrolled ${created.name} (${created.farmerIdCode}) and ${regCows.length} cattle passports with 12-digit Pashu Aadhaar RFID tags at ${booth.name}.`
      );
    } catch (err: any) {
      setIsRegistering(false);
      Alert.alert('Enrollment Error', err?.message || 'Failed to register farmer.');
    }
  };

  const handleSaveFarmer = async () => {
    const newErrors: Record<string, string> = {};

    if (!formName.trim()) {
      newErrors.name = 'Farmer name is required.';
    }

    const cleanPhone = formPhone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Mobile phone number is required.';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit Indian phone number.';
    }

    if (!formVillage.trim()) {
      newErrors.village = 'Village / Hamlet name is required.';
    }
    if (!formAddress.trim()) {
      newErrors.address = 'Street / Door address is required.';
    }

    const parsedCows = parseInt(formCowsCount, 10);
    if (isNaN(parsedCows) || parsedCows < 0) {
      newErrors.cows = 'Enter a valid number of cattle (0 or more).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please correct the highlighted fields before saving.');
      return;
    }

    if (!editingFarmer) return;

    setIsSaving(true);
    try {
      const updatedFarmerData: Farmer = {
        ...editingFarmer,
        name: formName.trim(),
        mobileNumber: cleanPhone,
        farmerIdCode: formIdCode.trim() || editingFarmer.farmerIdCode,
        village: formVillage.trim(),
        address: formAddress.trim(),
        community: formCommunity.trim() || 'Melur Taluk',
        assignedBoothId: formBoothId,
        numberOfCows: editingFarmerCows.length || parsedCows,
        verificationStatus: formStatus,
        bankAccountName: formBankAccName.trim() || undefined,
        bankName: formBankName.trim() || undefined,
        bankAccountNumber: formBankAccNum.trim() || undefined,
        bankIfsc: formBankIfsc.trim() || undefined,
        upiId: formUpiId.trim() || undefined,
      };

      const updatedCowsToSave: Cow[] = editingFarmerCows.map((ec, idx) => {
        if (ec.originalCow) {
          return {
            ...ec.originalCow,
            name: ec.name.trim() || ec.originalCow.name,
            dailyMilkYield: typeof ec.dailyMilkYield === 'number' ? ec.dailyMilkYield : parseFloat(String(ec.dailyMilkYield)) || 10,
          };
        } else {
          return {
            id: `COW${String(cows.length + idx + 1).padStart(3, '0')}`,
            cowId: ec.cowId,
            tagId: ec.tagId,
            farmerId: editingFarmer.id,
            farmerName: formName.trim(),
            breed: ec.breed,
            name: ec.name.trim() || `Cow (${ec.breed})`,
            dateOfBirth: '2023-04-15',
            approxAgeMonths: 36,
            sex: 'female' as const,
            currentStatus: 'lactating' as const,
            dailyMilkYield: typeof ec.dailyMilkYield === 'number' ? ec.dailyMilkYield : parseFloat(String(ec.dailyMilkYield)) || 10,
            healthStatus: 'healthy' as const,
            lactationStage: 'peak' as const,
            identificationMarks: 'Govt 12-digit RFID Tag',
            verificationStatus: 'verified' as const,
            medicalHistory: [],
            vaccinationHistory: [],
            inseminationHistory: [],
            treatmentRecords: [],
            createdAt: new Date().toISOString(),
          };
        }
      });

      updateFarmer(updatedFarmerData, updatedCowsToSave);
      setIsSaving(false);
      handleCloseModal();

      Alert.alert(
        'Farmer & Cattle Data Updated',
        `Successfully updated profile for ${updatedFarmerData.name} and ${updatedCowsToSave.length} cattle passports. Changes have been saved to the society database.`
      );
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Error', err?.message || 'Failed to update farmer data. Please try again.');
    }
  };

  const assignedCount = farmers.filter(f => f.assignedBoothId === booth.id).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Farmers Directory"
        subtitle={`${assignedCount} Member Farmers • ${booth.name}`}
        showBack
      />

      {/* Top Search & Filter Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search Name, Farmer ID, Phone, Village..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Button
          title="+ Register Farmer"
          size="sm"
          onPress={handleOpenRegisterModal}
        />
      </View>

      {/* Filter Chips Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.filterChipGroup}>
          <Pressable
            onPress={() => setFilterScope('assigned')}
            style={[
              styles.filterChip,
              filterScope === 'assigned'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterScope === 'assigned' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              This Society ({assignedCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterScope('all')}
            style={[
              styles.filterChip,
              filterScope === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.background, borderColor: colors.border }
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: filterScope === 'all' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              All Network ({farmers.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.filterChipGroup}>
          <Pressable
            onPress={() => setStatusFilter(statusFilter === 'all' ? 'verified' : statusFilter === 'verified' ? 'pending' : 'all')}
            style={[
              styles.statusChip,
              { borderColor: colors.border, backgroundColor: colors.background }
            ]}
          >
            <Ionicons 
              name={statusFilter === 'verified' ? 'checkmark-circle' : statusFilter === 'pending' ? 'time' : 'funnel-outline'} 
              size={12} 
              color={statusFilter === 'verified' ? '#16A34A' : statusFilter === 'pending' ? '#D97706' : colors.textSecondary} 
            />
            <Text style={[styles.statusChipText, { color: colors.textSecondary }]}>
              {statusFilter === 'all' ? 'All Status' : statusFilter === 'verified' ? 'Verified Only' : 'Pending Only'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Farmers List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Farmers Found"
            message={searchQuery ? `No farmers match "${searchQuery}".` : 'No farmers available under selected filters.'}
            icon="people-outline"
          />
        }
        renderItem={({ item }) => {
          const farmerCows = cows.filter(c => c.farmerId === item.id);
          const cowsWithHold = farmerCows.filter(c => c.activeWithdrawal?.hasActiveWithdrawal);
          const isVerified = item.verificationStatus === 'verified';
          const assignedBoothObj = booths.find(b => b.id === item.assignedBoothId);

          return (
            <Card style={[styles.farmerCard, { borderColor: colors.border }]}>
              {/* 1. Header Zone: Avatar, Identification & Verification */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarCircle, { backgroundColor: isVerified ? '#E0F2FE' : '#FEF3C7' }]}>
                    <Text style={{ fontSize: 22 }}>👨‍🌾</Text>
                  </View>
                  {isVerified && (
                    <View style={styles.verifiedCheckBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    </View>
                  )}
                </View>

                <View style={styles.farmerTitleCol}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <View style={styles.subMetaRow}>
                    <View style={[styles.idBadge, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="barcode-outline" size={12} color={colors.primary} />
                      <Text style={[styles.idBadgeText, { color: colors.primary }]}>
                        {item.farmerIdCode}
                      </Text>
                    </View>

                    <View style={styles.phoneChip}>
                      <Ionicons name="call" size={11} color={colors.textSecondary} />
                      <Text style={[styles.phoneChipText, { color: colors.textSecondary }]}>
                        +91 {item.mobileNumber}
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleToggleVerification(item.id, item.verificationStatus)}
                  style={[
                    styles.statusPill,
                    { 
                      backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7',
                      borderColor: isVerified ? '#86EFAC' : '#FDE68A'
                    }
                  ]}
                >
                  <Ionicons 
                    name={isVerified ? 'checkmark-circle' : 'time'} 
                    size={12} 
                    color={isVerified ? '#15803D' : '#B45309'} 
                  />
                  <Text style={[styles.statusPillText, { color: isVerified ? '#15803D' : '#B45309' }]}>
                    {isVerified ? 'VERIFIED' : 'PENDING'}
                  </Text>
                </Pressable>
              </View>

              {/* 2. Key Metrics Strip (3 Easy-to-Scan Tiles) */}
              <View style={styles.metricsStrip}>
                <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.metricIconRow}>
                    <Text style={{ fontSize: 16 }}>🐄</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                      {farmerCows.length} <Text style={{ fontSize: 11, fontWeight: '600' }}>Cows</Text>
                    </Text>
                  </View>
                  <Text style={[styles.metricLabel, { color: cowsWithHold.length > 0 ? '#DC2626' : colors.textSecondary }]}>
                    {cowsWithHold.length > 0 ? '⚠️ Withdrawal Hold' : 'Registered Cattle'}
                  </Text>
                </View>

                <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.metricIconRow}>
                    <Text style={{ fontSize: 16 }}>📍</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
                      {item.village}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.community || 'Melur Taluk'}
                  </Text>
                </View>

                <View style={[styles.metricTile, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.metricIconRow}>
                    <Text style={{ fontSize: 16 }}>🏦</Text>
                    <Text style={[styles.metricValue, { color: item.bankName ? '#16A34A' : '#D97706' }]}>
                      {item.bankName ? 'Linked' : 'Pending'}
                    </Text>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary }]} numberOfLines={1}>
                    DBT Bank Account
                  </Text>
                </View>
              </View>

              {/* 3. Structured Information Box */}
              <View style={[styles.infoBox, { backgroundColor: isDark ? '#162032' : '#F1F5F9', borderColor: colors.border }]}>
                {/* Location row */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconCol}>
                    <Ionicons name="home-outline" size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      RESIDENTIAL ADDRESS & SOCIETY
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', marginTop: 1 }]}>
                      {item.address}, {item.village} • {assignedBoothObj?.name || item.assignedBoothId}
                    </Text>
                  </View>
                </View>

                {/* Registered Cattle row */}
                <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={styles.infoIconCol}>
                    <Ionicons name="git-network-outline" size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      REGISTERED CATTLE PASSPORT ({farmerCows.length})
                    </Text>
                    {farmerCows.length > 0 ? (
                      <View style={styles.cowsPillRow}>
                        {farmerCows.map(cow => {
                          const hasHold = cow.activeWithdrawal?.hasActiveWithdrawal;
                          return (
                            <View 
                              key={cow.id} 
                              style={[
                                styles.cowTag, 
                                { 
                                  backgroundColor: hasHold ? '#FEE2E2' : (isDark ? '#1E293B' : '#FFFFFF'), 
                                  borderColor: hasHold ? '#EF4444' : colors.border 
                                }
                              ]}
                            >
                              <Text style={[styles.cowTagText, { color: hasHold ? '#B91C1C' : colors.text }]}>
                                {hasHold ? '⚠️ ' : '🐄 '}{cow.name} ({cow.breed})
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={[Typography.caption1, { color: colors.textMuted, marginTop: 1 }]}>
                        No cows registered under digital passport yet.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Banking & DBT row */}
                <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <View style={styles.infoIconCol}>
                    <Ionicons name="card-outline" size={15} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.caption2, { color: colors.textSecondary, fontWeight: '700' }]}>
                      DBT DIRECT BENEFIT TRANSFER ACCOUNT
                    </Text>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '600', marginTop: 1 }]}>
                      {item.bankName || 'Canara Bank'} • A/C: {item.bankAccountNumber ? `•••• •••• ${item.bankAccountNumber.slice(-4)}` : 'Linked'} • IFSC: {item.bankIfsc || 'CNRB0001092'}
                    </Text>
                    {item.upiId ? (
                      <Text style={[Typography.caption2, { color: colors.primary, fontWeight: '700', marginTop: 2 }]}>
                        UPI ID: {item.upiId}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* 4. Action Command Bar: Record Milk | Edit Details | Verify KYC */}
              <View style={styles.cardActionsRow}>
                <Pressable
                  onPress={() => router.push({ pathname: '/(booth)/record-milk', params: { farmerId: item.id } })}
                  style={[styles.recordMilkBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="water" size={14} color="#FFFFFF" />
                  <Text style={styles.recordMilkBtnText}>
                    + Record Milk
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleOpenEditModal(item)}
                  style={[styles.editFarmerBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                >
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={[styles.editFarmerBtnText, { color: colors.primary }]}>
                    Edit Details
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleToggleVerification(item.id, item.verificationStatus)}
                  style={[
                    styles.kycToggleBtn,
                    { 
                      borderColor: isVerified ? '#FCA5A5' : '#86EFAC',
                      backgroundColor: isVerified ? '#FEF2F2' : '#F0FDF4'
                    }
                  ]}
                >
                  <Ionicons 
                    name={isVerified ? 'alert-circle-outline' : 'checkmark-done'} 
                    size={14} 
                    color={isVerified ? '#DC2626' : '#16A34A'} 
                  />
                  <Text style={[styles.kycToggleBtnText, { color: isVerified ? '#DC2626' : '#16A34A' }]}>
                    {isVerified ? 'Flag' : 'Verify'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      {/* Edit Farmer Modal */}
      <Modal
        visible={!!editingFarmer}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                  Edit Farmer Data
                </Text>
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                  {editingFarmer?.farmerIdCode} • ID: {editingFarmer?.id}
                </Text>
              </View>

              <Pressable
                onPress={handleCloseModal}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Section 1: Personal & Contact */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Farmer Profile & Contact
                  </Text>
                </View>

                <TextField
                  label="Full Name *"
                  value={formName}
                  onChangeText={(val) => {
                    setFormName(val);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. K. Murugesan"
                  error={errors.name}
                  icon="person-outline"
                />

                <TextField
                  label="Mobile Phone Number (10 digits) *"
                  value={formPhone}
                  onChangeText={(val) => {
                    setFormPhone(val);
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="e.g. 9842000002"
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={errors.phone}
                  icon="call-outline"
                />

                <TextField
                  label="Farmer ID Code"
                  value={formIdCode}
                  onChangeText={setFormIdCode}
                  placeholder="e.g. FARM-MDU-101"
                  icon="barcode-outline"
                  helperText="Official Aavin member identification code"
                />
              </View>

              {/* Section 2: Location & Address */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Residential & Village Location
                  </Text>
                </View>

                <TextField
                  label="Village / Hamlet *"
                  value={formVillage}
                  onChangeText={(val) => {
                    setFormVillage(val);
                    if (errors.village) setErrors(prev => ({ ...prev, village: '' }));
                  }}
                  placeholder="e.g. Melur Rural"
                  error={errors.village}
                  icon="home-outline"
                />

                <TextField
                  label="Street / Door Address *"
                  value={formAddress}
                  onChangeText={(val) => {
                    setFormAddress(val);
                    if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                  }}
                  placeholder="e.g. 14, South Street"
                  error={errors.address}
                  icon="location-outline"
                />

                <TextField
                  label="Taluk / District"
                  value={formCommunity}
                  onChangeText={setFormCommunity}
                  placeholder="e.g. Melur Taluk"
                  icon="navigate-outline"
                />
              </View>

              {/* Section 3: Booth Assignment, KYC & Cattle */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Society Assignment & KYC Status
                  </Text>
                </View>

                {/* Booth Selector */}
                <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }]}>
                  Assigned Collection Society:
                </Text>
                <View style={styles.boothChipsRow}>
                  {booths.map(b => (
                    <Pressable
                      key={b.id}
                      onPress={() => setFormBoothId(b.id)}
                      style={[
                        styles.boothChoiceChip,
                        formBoothId === b.id
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.background, borderColor: colors.border }
                      ]}
                    >
                      <Text style={[
                        styles.boothChoiceText,
                        { color: formBoothId === b.id ? '#FFFFFF' : colors.text }
                      ]}>
                        {b.name} ({b.code})
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* KYC Verification Status Segment */}
                <Text style={[Typography.subhead, { color: colors.textSecondary, marginTop: 14, marginBottom: 8, fontWeight: '600' }]}>
                  KYC Verification Status:
                </Text>
                <View style={styles.statusSegmentRow}>
                  <Pressable
                    onPress={() => setFormStatus('verified')}
                    style={[
                      styles.statusSegmentBtn,
                      formStatus === 'verified'
                        ? { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }
                        : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={formStatus === 'verified' ? '#15803D' : colors.textMuted} 
                    />
                    <Text style={[
                      styles.statusSegmentText,
                      { color: formStatus === 'verified' ? '#15803D' : colors.textMuted }
                    ]}>
                      Verified Member
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFormStatus('pending')}
                    style={[
                      styles.statusSegmentBtn,
                      formStatus === 'pending'
                        ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' }
                        : { backgroundColor: colors.background, borderColor: colors.border }
                    ]}
                  >
                    <Ionicons 
                      name="time" 
                      size={16} 
                      color={formStatus === 'pending' ? '#B45309' : colors.textMuted} 
                    />
                    <Text style={[
                      styles.statusSegmentText,
                      { color: formStatus === 'pending' ? '#B45309' : colors.textMuted }
                    ]}>
                      Pending Review
                    </Text>
                  </Pressable>
                </View>

                {/* Section 4: Registered Cattle Passports (Edit Name & Capacity Only) */}
                <View style={[styles.editCowsSection, { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', borderColor: '#86EFAC' }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="paw" size={18} color="#15803D" />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={[Typography.headline, { color: colors.text, fontWeight: '800' }]}>
                        Registered Cattle Passports ({editingFarmerCows.length} Cattle)
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textSecondary }]}>
                        RFID Tag & Breed are locked permanent records. Change Name & Milk Capacity below:
                      </Text>
                    </View>
                  </View>

                  {/* Cattle Slide Tabs if multiple cows */}
                  {editingFarmerCows.length > 1 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.sliderTabsRow}
                    >
                      {editingFarmerCows.map((c, idx) => {
                        const isActive = idx === activeEditCowSlide;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => setActiveEditCowSlide(idx)}
                            style={[
                              styles.sliderTabPill,
                              {
                                backgroundColor: isActive ? colors.primary : (isDark ? '#1E293B' : '#FFFFFF'),
                                borderColor: isActive ? colors.primary : colors.border,
                              }
                            ]}
                          >
                            <Ionicons 
                              name="paw" 
                              size={13} 
                              color={isActive ? "#FFFFFF" : colors.textSecondary} 
                            />
                            <Text style={[
                              styles.sliderTabPillText, 
                              { color: isActive ? "#FFFFFF" : colors.text, fontWeight: isActive ? '800' : '600' }
                            ]}>
                              {c.name || `Cow #${idx + 1}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Active Cow Slide Card */}
                  {editingFarmerCows[activeEditCowSlide] && (() => {
                    const cow = editingFarmerCows[activeEditCowSlide];
                    return (
                      <View style={[styles.activeSlideCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                        {/* Immutable Identity Header (Locked) */}
                        <View style={styles.slideHeader}>
                          <View style={[styles.slideIndexBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.slideIndexBadgeText, { color: colors.primary }]}>
                              {cow.cowId || `Cattle #${activeEditCowSlide + 1}`}
                            </Text>
                          </View>

                          <View style={styles.lockedPill}>
                            <Ionicons name="lock-closed" size={11} color="#15803D" />
                            <Text style={styles.lockedPillText}>RFID IMMUTABLE</Text>
                          </View>
                        </View>

                        {/* Locked RFID Tag & Breed info row */}
                        <View style={styles.lockedFieldsRow}>
                          <View style={[styles.lockedInfoChip, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                            <Ionicons name="barcode-outline" size={14} color={colors.textSecondary} />
                            <View style={{ marginLeft: 6 }}>
                              <Text style={[Typography.caption2, { color: colors.textMuted }]}>Pashu Aadhaar (Tag)</Text>
                              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                                {cow.tagId}
                              </Text>
                            </View>
                            <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                          </View>

                          <View style={[styles.lockedInfoChip, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
                            <Ionicons name="fitness-outline" size={14} color="#0284C7" />
                            <View style={{ marginLeft: 6 }}>
                              <Text style={[Typography.caption2, { color: colors.textMuted }]}>Registered Breed</Text>
                              <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                                {cow.breed}
                              </Text>
                            </View>
                            <Ionicons name="lock-closed" size={12} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                          </View>
                        </View>

                        {/* Editable Field 1: Cow Name / Call Name */}
                        <View style={{ marginBottom: 12 }}>
                          <TextField
                            label="Cattle Call Name / Nickname (Editable)"
                            value={cow.name}
                            onChangeText={(val) => handleUpdateEditingCow(cow.id, 'name', val)}
                            placeholder="e.g. Lakshmi / Kamadhenu"
                            icon="happy-outline"
                          />
                        </View>

                        {/* Editable Field 2: Daily Milk Capacity */}
                        <View style={{ marginBottom: 10 }}>
                          <View style={styles.capacityHeaderRow}>
                            <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                              Daily Milk Capacity (Editable) *
                            </Text>
                            <View style={styles.capacityValuePill}>
                              <Text style={styles.capacityValueText}>
                                {Number(cow.dailyMilkYield || 0).toFixed(1)} L / day
                              </Text>
                            </View>
                          </View>

                          {/* Steppers & Interactive Track */}
                          <View style={styles.sliderControlRow}>
                            <Pressable 
                              onPress={() => {
                                const nextVal = Math.max(1, Number(cow.dailyMilkYield || 10) - 0.5);
                                handleUpdateEditingCow(cow.id, 'dailyMilkYield', nextVal);
                              }}
                              style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                              hitSlop={6}
                            >
                              <Ionicons name="remove" size={16} color={colors.text} />
                            </Pressable>

                            <View style={[styles.sliderTrackContainer, { backgroundColor: isDark ? '#0F172A' : '#E2E8F0' }]}>
                              <View 
                                style={[
                                  styles.sliderTrackFill, 
                                  { width: `${Math.min(100, Math.max(4, (Number(cow.dailyMilkYield || 0) / 25) * 100))}%` }
                                ]} 
                              />
                            </View>

                            <Pressable 
                              onPress={() => {
                                const nextVal = Math.min(35, Number(cow.dailyMilkYield || 10) + 0.5);
                                handleUpdateEditingCow(cow.id, 'dailyMilkYield', nextVal);
                              }}
                              style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                              hitSlop={6}
                            >
                              <Ionicons name="add" size={16} color={colors.text} />
                            </Pressable>
                          </View>

                          {/* Presets */}
                          <View style={styles.presetsRow}>
                            {['6', '8', '10', '12', '15', '18', '22'].map((preset) => {
                              const isPresetActive = Math.abs(Number(cow.dailyMilkYield) - parseFloat(preset)) < 0.1;
                              return (
                                <Pressable
                                  key={preset}
                                  onPress={() => handleUpdateEditingCow(cow.id, 'dailyMilkYield', parseFloat(preset))}
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

                        {/* Slide Navigation if multiple cows */}
                        {editingFarmerCows.length > 1 && (
                          <View style={styles.slideFooterNav}>
                            <Button
                              title="< Prev Cow"
                              variant="outline"
                              size="sm"
                              disabled={activeEditCowSlide === 0}
                              onPress={() => setActiveEditCowSlide(prev => Math.max(0, prev - 1))}
                              style={{ flex: 1, marginRight: 6 }}
                            />
                            <Button
                              title="Next Cow >"
                              size="sm"
                              disabled={activeEditCowSlide === editingFarmerCows.length - 1}
                              onPress={() => setActiveEditCowSlide(prev => Math.min(editingFarmerCows.length - 1, prev + 1))}
                              style={{ flex: 1, marginLeft: 6 }}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* Section 4: Direct Benefit Transfer (DBT) & Banking */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    Direct Benefit Transfer (DBT) Account
                  </Text>
                </View>

                <TextField
                  label="Account Holder Name"
                  value={formBankAccName}
                  onChangeText={setFormBankAccName}
                  placeholder="e.g. K. Murugesan"
                  icon="person-outline"
                />

                <TextField
                  label="Bank Name & Branch"
                  value={formBankName}
                  onChangeText={setFormBankName}
                  placeholder="e.g. Canara Bank - Melur"
                  icon="business-outline"
                />

                <TextField
                  label="Bank Account Number"
                  value={formBankAccNum}
                  onChangeText={setFormBankAccNum}
                  placeholder="e.g. 109283746501"
                  keyboardType="numeric"
                  icon="card-outline"
                />

                <TextField
                  label="IFSC Code"
                  value={formBankIfsc}
                  onChangeText={setFormBankIfsc}
                  placeholder="e.g. CNRB0001092"
                  autoCapitalize="characters"
                  icon="key-outline"
                />

                <TextField
                  label="UPI ID (Optional)"
                  value={formUpiId}
                  onChangeText={setFormUpiId}
                  placeholder="e.g. murugan@okhdfcbank"
                  icon="qr-code-outline"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={handleCloseModal}
                style={{ flex: 1 }}
              />
              <Button
                title={isSaving ? "Saving..." : "Save Changes"}
                size="md"
                onPress={handleSaveFarmer}
                loading={isSaving}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Register New Farmer & Cattle Slider Modal (Booth Operator Flow) */}
      <Modal
        visible={isRegisterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseRegisterModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '800' }]}>
                  Enroll New Producer & Cattle
                </Text>
                <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '600' }]}>
                  Booth Operator Intake • {booth.name}
                </Text>
              </View>

              <Pressable
                onPress={handleCloseRegisterModal}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Body */}
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Section 1: Producer Identity */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    1. Producer Identity & Contact
                  </Text>
                </View>

                <TextField
                  label="Full Name *"
                  value={regName}
                  onChangeText={(val) => {
                    setRegName(val);
                    if (regErrors.name) setRegErrors(prev => ({ ...prev, name: '' }));
                  }}
                  error={regErrors.name}
                  placeholder="e.g. K. Murugesan"
                  icon="person-outline"
                />

                <TextField
                  label="10-Digit Mobile Number *"
                  value={regPhone}
                  onChangeText={(val) => {
                    setRegPhone(val);
                    if (regErrors.phone) setRegErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  error={regErrors.phone}
                  placeholder="e.g. 9842000002"
                  keyboardType="phone-pad"
                  maxLength={10}
                  icon="call-outline"
                />

                <TextField
                  label="Farmer ID Code *"
                  value={regIdCode}
                  onChangeText={setRegIdCode}
                  placeholder="e.g. FARM-MDU-108"
                  autoCapitalize="characters"
                  icon="card-outline"
                />

                <TextField
                  label="Village / Hamlet *"
                  value={regVillage}
                  onChangeText={(val) => {
                    setRegVillage(val);
                    if (regErrors.village) setRegErrors(prev => ({ ...prev, village: '' }));
                  }}
                  error={regErrors.village}
                  placeholder="e.g. Melur Rural"
                  icon="location-outline"
                />

                <TextField
                  label="Street / Door Address *"
                  value={regAddress}
                  onChangeText={(val) => {
                    setRegAddress(val);
                    if (regErrors.address) setRegErrors(prev => ({ ...prev, address: '' }));
                  }}
                  error={regErrors.address}
                  placeholder="e.g. 14, South Street"
                  icon="home-outline"
                />
              </View>

              {/* Section 2: Cattle Passports Slider */}
              <View style={[styles.formSection, { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#86EFAC' }]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="paw" size={18} color="#15803D" />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6, flex: 1 }]}>
                    2. Cattle Passports Slider ({regCows.length} {regCows.length === 1 ? 'Cow' : 'Cows'})
                  </Text>
                </View>

                {/* Slider Tabs */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.sliderTabsRow}
                >
                  {regCows.map((c, idx) => {
                    const isActive = idx === activeRegCowSlide;
                    const isComplete = c.pashuAadhaar.length === 12 && !!c.breed && parseFloat(c.milkCapacity) > 0;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setActiveRegCowSlide(idx)}
                        style={[
                          styles.sliderTabPill,
                          {
                            backgroundColor: isActive ? colors.primary : (isDark ? '#1E293B' : '#FFFFFF'),
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
                    onPress={handleAddRegCowSlide}
                    style={[styles.sliderAddTabBtn, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.sliderAddTabBtnText, { color: colors.primary }]}>
                      + Add Cow
                    </Text>
                  </Pressable>
                </ScrollView>

                {/* Active Cow Slide Card */}
                {regCows[activeRegCowSlide] && (() => {
                  const currentCow = regCows[activeRegCowSlide];
                  const tagErr = regErrors[`cow_${currentCow.id}_pashuAadhaar`];
                  const isTagComplete = currentCow.pashuAadhaar.length === 12;

                  return (
                    <View style={[styles.activeSlideCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      {/* Slide Top Bar */}
                      <View style={styles.slideHeader}>
                        <View style={[styles.slideIndexBadge, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.slideIndexBadgeText, { color: colors.primary }]}>
                            Cattle #{activeRegCowSlide + 1} of {regCows.length}
                          </Text>
                        </View>

                        {isTagComplete ? (
                          <View style={styles.tagVerifiedPill}>
                            <Ionicons name="checkmark-circle" size={12} color="#15803D" />
                            <Text style={styles.tagVerifiedPillText}>12/12 DIGITS</Text>
                          </View>
                        ) : (
                          <View style={styles.tagPendingPill}>
                            <Text style={styles.tagPendingPillText}>
                              {currentCow.pashuAadhaar.length}/12 Digits
                            </Text>
                          </View>
                        )}

                        {regCows.length > 1 && (
                          <Pressable 
                            onPress={() => handleRemoveRegCowSlide(currentCow.id)}
                            style={styles.removeSlideBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                            <Text style={styles.removeSlideBtnText}>Remove</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* 1. Pashu Aadhaar Input (Mandatory *) */}
                      <View style={{ marginBottom: 12 }}>
                        <TextField
                          label={`Cow #${activeRegCowSlide + 1} Pashu Aadhaar (12 Digits) *`}
                          placeholder="e.g. 100100001055"
                          value={currentCow.pashuAadhaar}
                          onChangeText={(val) => {
                            const numericOnly = val.replace(/\D/g, '').slice(0, 12);
                            handleUpdateRegCowSlide(currentCow.id, 'pashuAadhaar', numericOnly);
                          }}
                          keyboardType="number-pad"
                          maxLength={12}
                          error={tagErr}
                          icon="barcode-outline"
                        />
                        <View style={styles.aadhaarCounterRow}>
                          <Text style={[Typography.caption2, { color: colors.textMuted }]}>
                            Official 12-digit RFID Tag
                          </Text>
                          <Text style={[
                            Typography.caption2, 
                            { 
                              fontWeight: '700', 
                              color: isTagComplete ? '#15803D' : (currentCow.pashuAadhaar.length > 0 ? '#D97706' : colors.textMuted) 
                            }
                          ]}>
                            {currentCow.pashuAadhaar.length} / 12 digits {isTagComplete ? '✓' : ''}
                          </Text>
                        </View>
                      </View>

                      {/* 2. Cattle Type / Breed Selection (Mandatory *) */}
                      <View style={{ marginBottom: 14 }}>
                        <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', marginBottom: 6 }]}>
                          Cattle Type / Breed *
                        </Text>
                        <View style={styles.breedChipsWrap}>
                          {['Jersey Cross', 'HF Cross', 'Kangeyam', 'Murrah Buffalo', 'Umblachery', 'Sindhi Cross'].map((breed) => {
                            const isSelected = currentCow.breed === breed;
                            return (
                              <Pressable
                                key={breed}
                                onPress={() => handleUpdateRegCowSlide(currentCow.id, 'breed', breed)}
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
                              handleUpdateRegCowSlide(currentCow.id, 'milkCapacity', nextVal.toFixed(1));
                            }}
                            style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                            hitSlop={6}
                          >
                            <Ionicons name="remove" size={16} color={colors.text} />
                          </Pressable>

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
                              handleUpdateRegCowSlide(currentCow.id, 'milkCapacity', nextVal.toFixed(1));
                            }}
                            style={[styles.stepperBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                            hitSlop={6}
                          >
                            <Ionicons name="add" size={16} color={colors.text} />
                          </Pressable>
                        </View>

                        {/* Presets */}
                        <View style={styles.presetsRow}>
                          {['6', '8', '10', '12', '15', '18', '22'].map((preset) => {
                            const isPresetActive = parseFloat(currentCow.milkCapacity) === parseFloat(preset);
                            return (
                              <Pressable
                                key={preset}
                                onPress={() => handleUpdateRegCowSlide(currentCow.id, 'milkCapacity', preset)}
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
                        placeholder="e.g. Lakshmi / Cow #1"
                        value={currentCow.name}
                        onChangeText={(val) => handleUpdateRegCowSlide(currentCow.id, 'name', val)}
                        icon="happy-outline"
                      />

                      {/* Slide Navigation Footer: Prev / Next */}
                      <View style={styles.slideFooterNav}>
                        <Button
                          title="< Prev Cow"
                          variant="outline"
                          size="sm"
                          disabled={activeRegCowSlide === 0}
                          onPress={() => setActiveRegCowSlide(prev => Math.max(0, prev - 1))}
                          style={{ flex: 1, marginRight: 6 }}
                        />

                        {activeRegCowSlide < regCows.length - 1 ? (
                          <Button
                            title="Next Cow >"
                            size="sm"
                            onPress={() => setActiveRegCowSlide(prev => Math.min(regCows.length - 1, prev + 1))}
                            style={{ flex: 1, marginLeft: 6 }}
                          />
                        ) : (
                          <Button
                            title="+ Add Next Cow"
                            size="sm"
                            onPress={handleAddRegCowSlide}
                            style={{ flex: 1, marginLeft: 6 }}
                          />
                        )}
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* Section 3: DBT / Banking (Optional) */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="card-outline" size={18} color={colors.primary} />
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '800', marginLeft: 6 }]}>
                    3. Direct Benefit Transfer (DBT)
                  </Text>
                </View>

                <TextField
                  label="Account Holder Name"
                  value={regBankAccName}
                  onChangeText={setRegBankAccName}
                  placeholder="e.g. K. Murugesan"
                  icon="person-outline"
                />

                <TextField
                  label="Bank Name & Branch"
                  value={regBankName}
                  onChangeText={setRegBankName}
                  placeholder="e.g. Canara Bank - Melur"
                  icon="business-outline"
                />

                <TextField
                  label="Bank Account Number"
                  value={regBankAccNum}
                  onChangeText={setRegBankAccNum}
                  placeholder="e.g. 109283746501"
                  keyboardType="number-pad"
                  icon="wallet-outline"
                />

                <TextField
                  label="IFSC Code"
                  value={regBankIfsc}
                  onChangeText={setRegBankIfsc}
                  placeholder="e.g. CNRB0001092"
                  autoCapitalize="characters"
                  icon="barcode-outline"
                />

                <TextField
                  label="UPI ID"
                  value={regUpiId}
                  onChangeText={setRegUpiId}
                  placeholder="e.g. murugan@okhdfcbank"
                  autoCapitalize="none"
                  icon="phone-portrait-outline"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={handleCloseRegisterModal}
                style={{ flex: 1 }}
              />
              <Button
                title={`Enroll (${regCows.length} Cows)`}
                onPress={handleSaveNewFarmer}
                loading={isRegistering}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterChipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 96,
  },
  farmerCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  farmerTitleCol: {
    flex: 1,
    gap: 3,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  phoneChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // Metrics Strip
  metricsStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  metricTile: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Structured Info Box
  infoBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 4,
  },
  infoIconCol: {
    marginTop: 2,
  },
  cowsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  cowTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  cowTagText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Action Row
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  recordMilkBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  recordMilkBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  editFarmerBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  editFarmerBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  kycToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  kycToggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    gap: 20,
  },
  formSection: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  boothChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boothChoiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  boothChoiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSegmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statusSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  sliderTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
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
  editCowsSection: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  lockedFieldsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  lockedInfoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  lockedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
});
