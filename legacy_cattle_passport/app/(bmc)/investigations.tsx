import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, Alert, Modal, Pressable } from 'react-native';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { DiscrepancyCase } from '../../types/aavin';

export default function BMCInvestigationsScreen() {
  const { user } = useAuth();
  const { 
    discrepancyCases, 
    bmcs, 
    addInvestigationNote, 
    resolveDiscrepancyCase, 
    escalateDiscrepancyCase 
  } = useAavinStore();
  const { colors } = useTheme();

  const bmcId = user?.associatedId || 'BMC001';
  const bmc = bmcs.find(b => b.id === bmcId) || bmcs[0];

  const myCases = discrepancyCases.filter(c => c.bmcId === bmc.id);

  const [selectedCase, setSelectedCase] = useState<DiscrepancyCase | null>(null);
  const [activeModal, setActiveModal] = useState<'note' | 'resolve' | 'escalate' | null>(null);

  // Form inputs
  const [newNote, setNewNote] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  const handleAddNote = () => {
    if (!selectedCase || !newNote.trim()) return;
    addInvestigationNote(
      selectedCase.id,
      newNote.trim(),
      user?.fullName || 'R. Sundar (BMC In-Charge)',
      evidenceRef.trim() || undefined
    );
    setNewNote('');
    setEvidenceRef('');
    setActiveModal(null);
    Alert.alert('Note Appended', 'Investigation note and evidence reference added to the case audit log.');
  };

  const handleResolveCase = () => {
    if (!selectedCase || !resolutionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a formal justification for resolving the discrepancy.');
      return;
    }
    resolveDiscrepancyCase(
      selectedCase.id,
      resolutionReason.trim(),
      user?.fullName || 'R. Sundar (BMC In-Charge)'
    );
    setResolutionReason('');
    setActiveModal(null);
    Alert.alert('Case Resolved', `Discrepancy case #${selectedCase.id} has been formally closed.`);
  };

  const handleEscalateCase = () => {
    if (!selectedCase || !escalationReason.trim()) {
      Alert.alert('Reason Required', 'Please explain why this case requires Union executive escalation.');
      return;
    }
    escalateDiscrepancyCase(selectedCase.id, escalationReason.trim());
    setEscalationReason('');
    setActiveModal(null);
    Alert.alert('Case Escalated', `Case #${selectedCase.id} escalated to Union GM for joint inquiry.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="Discrepancy Investigations"
        subtitle={`Audit Ledger • ${bmc.name}`}
        showBack
      />

      <FlatList
        data={myCases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Discrepancies"
            message="No quantity variances have been flagged for this BMC."
            icon="checkmark-done-circle-outline"
          />
        }
        renderItem={({ item }) => {
          const isOpen = item.status === 'open' || item.status === 'under_investigation';
          const isEscalated = item.status === 'escalated_to_union';
          const isResolved = item.status === 'resolved';

          const getStatusBadge = () => {
            if (isOpen) return { label: 'OPEN INVESTIGATION', bg: '#FEF2F2', color: '#DC2626' };
            if (isEscalated) return { label: 'ESCALATED TO UNION', bg: '#FAF5FF', color: '#9333EA' };
            return { label: 'RESOLVED & CLOSED', bg: '#DCFCE7', color: '#15803D' };
          };

          const badge = getStatusBadge();

          return (
            <Card style={[styles.card, isOpen && { borderColor: '#EF4444', borderWidth: 1.5 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[Typography.headline, { color: colors.text, fontWeight: '900' }]}>
                    Case #{item.id}
                  </Text>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                    Feeder: <Text style={{ color: colors.text, fontWeight: '600' }}>{item.boothName?.replace(/cooling booth/gi, 'Society').replace(/booth/gi, 'Society')}</Text> • Date: {item.collectionDate}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: badge.bg, flexShrink: 0 }]}>
                  <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </View>

              {/* Quantities & Difference Alert */}
              <View style={[styles.varianceBox, { backgroundColor: colors.background }]}>
                <View style={styles.varianceRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>Declared by Society:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>{item.declaredQuantity.toFixed(1)} L</Text>
                </View>
                <View style={styles.varianceRow}>
                  <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>Measured by BMC:</Text>
                  <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700', flexShrink: 0 }]}>{item.measuredQuantity.toFixed(1)} L</Text>
                </View>
                <View style={[styles.varianceRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6, marginTop: 4 }]}>
                  <Text style={[Typography.subhead, { color: '#DC2626', fontWeight: '800', flex: 1, minWidth: 0 }]}>Discrepancy / Variance:</Text>
                  <Text style={[Typography.headline, { color: '#DC2626', fontWeight: '900', flexShrink: 0 }]}>
                    -{item.differenceLitres.toFixed(1)} L ({item.differencePercent}%)
                  </Text>
                </View>
              </View>

              {/* Investigation Notes & Evidence Log */}
              <View style={styles.notesSection}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '800', marginBottom: 6 }]}>
                  Investigation Log ({item.investigationNotes.length} Notes)
                </Text>

                {item.investigationNotes.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <View style={styles.noteAuthorRow}>
                      <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '700' }]}>
                        {note.author?.replace(/booth staff/gi, 'Society Staff').replace(/booth/gi, 'Society')}
                      </Text>
                      <Text style={[Typography.caption2, { color: colors.textMuted }]}>{note.timestamp}</Text>
                    </View>
                    <Text style={[Typography.caption1, { color: colors.text, marginTop: 2 }]}>
                      {note.note?.replace(/booth weigh-scale/gi, 'Society weigh-scale').replace(/booth weigh scale/gi, 'Society weigh-scale').replace(/booth/gi, 'society')}
                    </Text>
                    {note.evidenceReference && (
                      <Text style={[Typography.caption2, { color: '#047857', fontWeight: '600', marginTop: 2 }]}>
                        📎 Evidence Tag: {note.evidenceReference}
                      </Text>
                    )}
                  </View>
                ))}

                {item.resolutionReason && (
                  <View style={[styles.resolutionBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                    <Text style={[Typography.caption1, { color: '#166534', fontWeight: '800' }]}>
                      ✓ RESOLUTION: {item.resolutionReason}
                    </Text>
                    <Text style={[Typography.caption2, { color: '#15803D', marginTop: 2 }]}>
                      Resolved by: {item.resolvedBy} on {item.resolvedAt?.split('T')[0]}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Button
                  title="+ Add Note"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setSelectedCase(item);
                    setActiveModal('note');
                  }}
                  style={{ flex: 1 }}
                />

                {isOpen && (
                  <>
                    <Button
                      title="Resolve Case"
                      size="sm"
                      onPress={() => {
                        setSelectedCase(item);
                        setActiveModal('resolve');
                      }}
                      style={{ flex: 1 }}
                    />

                    <Button
                      title="Escalate"
                      variant="destructive"
                      size="sm"
                      onPress={() => {
                        setSelectedCase(item);
                        setActiveModal('escalate');
                      }}
                      style={{ flex: 1 }}
                    />
                  </>
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Add Note Modal */}
      {activeModal === 'note' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>Add Investigation Note</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>Investigation Finding / Observation *</Text>
              <TextInput
                placeholder="e.g. Tanker valve seal re-inspected. Flow meter recalibration performed."
                placeholderTextColor={colors.textMuted}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4, marginTop: 10 }]}>Evidence Reference (Optional)</Text>
              <TextInput
                placeholder="e.g. Seal Tag #TN59-001, Dipstick Slip #9921"
                placeholderTextColor={colors.textMuted}
                value={evidenceRef}
                onChangeText={setEvidenceRef}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title="Save Note to Case Log" onPress={handleAddNote} style={{ marginTop: 14 }} />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Resolve Case Modal */}
      {activeModal === 'resolve' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>Resolve Discrepancy</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>Formal Resolution Justification *</Text>
              <TextInput
                placeholder="e.g. Variance within normal 0.5% temperature expansion allowance. Society records confirmed."
                placeholderTextColor={colors.textMuted}
                value={resolutionReason}
                onChangeText={setResolutionReason}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title="Close Discrepancy Case" onPress={handleResolveCase} style={{ marginTop: 14 }} />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Escalate Modal */}
      {activeModal === 'escalate' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveModal(null)}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>Escalate to Union GM</Text>
                <Pressable onPress={() => setActiveModal(null)}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
              </View>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 4 }]}>Escalation Directive / Concern *</Text>
              <TextInput
                placeholder="e.g. Tanker seal tampered during transit. Unexplained 30L shortfall requires Union inquiry."
                placeholderTextColor={colors.textMuted}
                value={escalationReason}
                onChangeText={setEscalationReason}
                multiline
                numberOfLines={3}
                style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              />
              <Button title="Escalate to Union Executive" variant="destructive" onPress={handleEscalateCase} style={{ marginTop: 14 }} />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  varianceBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  varianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  notesSection: {
    gap: 8,
    marginBottom: 12,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0072BC',
  },
  noteAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resolutionBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputField: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});
