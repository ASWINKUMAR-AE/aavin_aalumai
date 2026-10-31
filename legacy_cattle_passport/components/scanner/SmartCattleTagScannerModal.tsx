import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SmartCattleTagScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedTagId: string) => void;
  title?: string;
  subtitle?: string;
  userRoleLabel?: string;
}

type ScanStage = 'barcode_checking' | 'ocr_active' | 'analyzing' | 'confirming';

export const SmartCattleTagScannerModal: React.FC<SmartCattleTagScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Cattle Ear-Tag Scanner',
  subtitle = 'Dual-Mode: Barcode Fast-Track + Printed Numbers OCR',
  userRoleLabel,
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Scan state
  const [stage, setStage] = useState<ScanStage>('barcode_checking');
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [detectedTag, setDetectedTag] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [ocrLog, setOcrLog] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Animations
  const [scanAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Countdown timer for automatic barcode -> OCR fallback (2.5 seconds)
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(3);

  useEffect(() => {
    let timer: any = null;
    let countdownInterval: any = null;

    if (visible && !showManualInput && stage === 'barcode_checking') {
      setFallbackCountdown(3);
      setScannedValue(null);
      setDetectedTag('');
      setOcrLog('');

      // Laser animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Countdown ticker
      countdownInterval = setInterval(() => {
        setFallbackCountdown((prev) => (prev > 1 ? prev - 1 : 1));
      }, 900);

      // Auto-fallback to OCR after 2.5 seconds if barcode not picked up
      timer = setTimeout(() => {
        setStage('ocr_active');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
      }, 2700);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [visible, showManualInput, stage === 'barcode_checking']);

  // Handle Barcode Scan (active in both barcode checking and OCR stages)
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (stage === 'confirming' || stage === 'analyzing' || scannedValue) return;

    const cleaned = cleanTagNumber(data);
    if (cleaned) {
      setScannedValue(cleaned);
      setDetectedTag(cleaned);
      setOcrLog(`Barcode Decoded: #${cleaned}`);
      setStage('confirming');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
    }
  };

  /**
   * Smart parser for Indian cattle ear tags:
   * Formats:
   * - 12 contiguous digits: '106353486450'
   * - Two lines of 6 digits: '106353' + '486450' -> '106353486450'
   * - Ignores customer care toll-free numbers (1800-103-6565)
   */
  const cleanTagNumber = (rawText: string): string | null => {
    if (!rawText) return null;

    // Filter out 1800 customer care / toll-free numbers
    let text = rawText.replace(/1800[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, '');
    text = text.replace(/1800\d{6,8}/g, '');
    text = text.replace(/CUSTOMER\s*CARE[:\s]*1800[-.\s\d]+/gi, '');
    text = text.replace(/TOLL\s*FREE[:\s]*1800[-.\s\d]+/gi, '');

    // 1. Check for full 12 digits directly
    const direct12 = text.match(/\b\d{12}\b/);
    if (direct12) return direct12[0];

    // 2. Check for two blocks of 6 digits (stacked printed tag format: 106353 \n 486450)
    const split6 = text.match(/\b(\d{6})[^\d]{1,10}(\d{6})\b/);
    if (split6 && split6[1] && split6[2]) {
      return `${split6[1]}${split6[2]}`;
    }

    // 3. Fallback: extract all digits sequence if length is 12
    const digitsOnly = text.replace(/\D/g, '');
    if (digitsOnly.length === 12 && !digitsOnly.startsWith('1800')) {
      return digitsOnly;
    }
    if (digitsOnly.length > 12) {
      // Find 12-digit window not starting with 1800
      for (let i = 0; i <= digitsOnly.length - 12; i++) {
        const sub = digitsOnly.substring(i, i + 12);
        if (!sub.startsWith('1800')) {
          return sub;
        }
      }
    }

    return digitsOnly.length >= 8 ? digitsOnly.slice(0, 12) : null;
  };

  // Trigger OCR Snapshot Analysis
  const handleCaptureSnapshotOCR = async (presetTag?: string) => {
    setIsProcessing(true);
    setStage('analyzing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    try {
      // If preset test tag provided (e.g. from tag chips)
      if (presetTag) {
        setDetectedTag(presetTag);
        setOcrLog(`Selected Tag #${presetTag}`);
        setStage('confirming');
        setIsProcessing(false);
        return;
      }

      // Live camera frame capture and OCR
      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
          if (photo?.uri && typeof window !== 'undefined') {
            const Tesseract = await import('tesseract.js');
            const res = await Tesseract.default.recognize(photo.uri, 'eng');
            const rawText = res.data.text || '';
            const parsed = cleanTagNumber(rawText);
            if (parsed) {
              setDetectedTag(parsed);
              setOcrLog(`OCR Detected: #${parsed}`);
              setStage('confirming');
              setIsProcessing(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Snapshot OCR notice:', err);
        }
      }

      // If text could not be extracted cleanly from snapshot
      setOcrLog('Could not read digits from camera photo. Please hold steady or type manually via keypad.');
      setStage('ocr_active');
      setIsProcessing(false);
    } catch (e) {
      setIsProcessing(false);
      setStage('ocr_active');
      setOcrLog('OCR scanner error. Please try again or enter tag manually.');
    }
  };

  // Image upload handler for real dynamic OCR reading
  const handleFileUpload = async (e: any) => {
    if (e?.target?.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      setStage('analyzing');
      setOcrLog('Reading text from uploaded image via OCR...');

      try {
        const Tesseract = await import('tesseract.js');
        const result = await Tesseract.default.recognize(file, 'eng');
        const text = result.data.text || '';
        const parsed = cleanTagNumber(text);

        if (parsed) {
          setDetectedTag(parsed);
          setOcrLog(`OCR Recognized UID: #${parsed}`);
          setStage('confirming');
        } else {
          // If clean 12 digits wasn't found, find any sequence of numbers
          const anyDigits = text.replace(/\D/g, '').replace(/^1800\d*/, '').slice(0, 12);
          if (anyDigits.length >= 8) {
            setDetectedTag(anyDigits);
            setOcrLog(`Detected digits: #${anyDigits} • Verify or edit below:`);
            setStage('confirming');
          } else {
            setDetectedTag('');
            setOcrLog('Could not detect 12-digit number from photo. Please enter via keypad or choose another photo.');
            setStage('ocr_active');
          }
        }
      } catch (err: any) {
        setOcrLog(`OCR error: ${err.message || 'Could not process photo'}`);
        setStage('ocr_active');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleConfirmAndProceed = () => {
    const finalTag = detectedTag || manualInput.trim();
    if (finalTag) {
      onScan(finalTag);
      onClose();
    }
  };

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 140],
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: '#0B1120' }]}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} style={styles.iconCircleBtn} accessibilityLabel="Close scanner">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={stage === 'barcode_checking' ? 'barcode' : 'scan'}
                size={18}
                color={stage === 'barcode_checking' ? '#38BDF8' : '#F59E0B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[Typography.headline, { color: '#FFFFFF', fontWeight: '800' }]}>
                {title}
              </Text>
            </View>
            {userRoleLabel && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>AUTHORIZED: {userRoleLabel.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => setShowManualInput(!showManualInput)}
            style={styles.iconCircleBtn}
            accessibilityLabel="Toggle keypad input"
          >
            <Ionicons name={showManualInput ? 'camera' : 'keypad'} size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Body Content */}
        {!showManualInput ? (
          <View style={styles.cameraContainer}>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Ionicons name="scan-circle-outline" size={64} color="#38BDF8" />
                <Text style={[Typography.title3, { color: '#FFFFFF', textAlign: 'center', marginTop: 16 }]}>
                  Camera Access Required
                </Text>
                <Text style={[Typography.callout, { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8 }]}>
                  Camera permissions are required to scan cattle ear tags and extract 12-digit Pashu Aadhaar UIDs.
                </Text>
                <Button
                  title="Grant Camera Permission"
                  onPress={requestPermission}
                  style={{ marginTop: 20 }}
                />
                <Button
                  title="Enter 12-Digit Tag Manually"
                  variant="outline"
                  onPress={() => setShowManualInput(true)}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{
                    barcodeTypes: ['code128', 'code39', 'ean13', 'upc_a', 'itf14', 'qr'],
                  }}
                  onBarcodeScanned={stage !== 'confirming' && stage !== 'analyzing' ? handleBarcodeScanned : undefined}
                />

                <View style={styles.overlay}>
                  {/* Status Banner */}
                  <View style={styles.statusBanner}>
                    {stage === 'barcode_checking' ? (
                      <View style={[styles.stageBadge, { backgroundColor: '#0284C7' }]}>
                        <Ionicons name="barcode-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.stageBadgeText}>
                          CHECKING BARCODE ({fallbackCountdown}s)
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.stageBadge, { backgroundColor: '#D97706' }]}>
                        <Ionicons name="text-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.stageBadgeText}>
                          SCANNING 12-DIGIT PASHU AADHAR
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Dual Mode Viewfinder Reticle */}
                  <View style={[
                    styles.viewfinder,
                    stage === 'ocr_active' && { borderColor: '#F59E0B', height: 210 }
                  ]}>
                    {/* Corners */}
                    <View style={[styles.corner, styles.topLeft, stage === 'ocr_active' && { borderColor: '#F59E0B' }]} />
                    <View style={[styles.corner, styles.topRight, stage === 'ocr_active' && { borderColor: '#F59E0B' }]} />
                    <View style={[styles.corner, styles.bottomLeft, stage === 'ocr_active' && { borderColor: '#F59E0B' }]} />
                    <View style={[styles.corner, styles.bottomRight, stage === 'ocr_active' && { borderColor: '#F59E0B' }]} />

                    {/* Zone Partition Visuals */}
                    {stage === 'barcode_checking' ? (
                      <View style={styles.barcodeZone}>
                        <Text style={styles.zoneLabel}>|||| BARCODE RETICLE ||||</Text>
                        <Animated.View
                          style={[
                            styles.laserLine,
                            { transform: [{ translateY: laserTranslateY }] },
                          ]}
                        />
                      </View>
                    ) : (
                      <View style={styles.ocrZone}>
                        <View style={styles.ocrTagHeaderPill}>
                          <Text style={styles.ocrTagHeaderText}>🏷️ AIC CATTLE EAR-TAG NUMBERS</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Mode-switch Pill / Indicator */}
                  <View style={styles.modeToggleRow}>
                    <Pressable
                      onPress={() => setStage('barcode_checking')}
                      style={[
                        styles.modePill,
                        stage === 'barcode_checking' && styles.modePillActive,
                      ]}
                    >
                      <Ionicons name="barcode" size={14} color={stage === 'barcode_checking' ? '#FFFFFF' : '#94A3B8'} />
                      <Text style={[styles.modePillText, stage === 'barcode_checking' && { color: '#FFFFFF' }]}>
                        1. Barcode
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setStage('ocr_active')}
                      style={[
                        styles.modePill,
                        stage === 'ocr_active' && styles.modePillActiveAmber,
                      ]}
                    >
                      <Ionicons name="scan" size={14} color={stage === 'ocr_active' ? '#FFFFFF' : '#94A3B8'} />
                      <Text style={[styles.modePillText, stage === 'ocr_active' && { color: '#FFFFFF' }]}>
                        2. 12-Digit OCR
                      </Text>
                    </Pressable>
                  </View>

                  {/* Helper Prompts */}
                  <Text style={[Typography.callout, styles.promptText]}>
                    {stage === 'barcode_checking'
                      ? 'Align cattle ear-tag barcode. Barcode will scan instantly.'
                      : 'Align the 12 printed numbers (e.g. 106353 486450) and tap "Read Tag Digits".'}
                  </Text>

                  {/* Action Shutter for OCR reading */}
                  {stage === 'ocr_active' && (
                    <View style={styles.shutterRow}>
                      <Pressable
                        onPress={() => handleCaptureSnapshotOCR()}
                        style={styles.shutterBtn}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator color="#0B1120" />
                        ) : (
                          <View style={styles.shutterInner}>
                            <Ionicons name="camera" size={24} color="#0B1120" />
                          </View>
                        )}
                      </Pressable>
                      <Text style={styles.shutterLabel}>Read Tag Digits</Text>
                    </View>
                  )}

                  {/* Web Image File Upload Option */}
                  {Platform.OS === 'web' && (
                    <View style={styles.webUploadBox}>
                      <label style={styles.webUploadLabel as any}>
                        <Ionicons name="image-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                        <span style={{ color: '#38BDF8', fontSize: 13, fontWeight: '700' }}>
                          Upload Tag Photo to OCR
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          /* Manual 12-Digit Keypad Input View */
          <View style={[styles.manualContainer, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="keypad" size={26} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[Typography.title2, { color: colors.text, fontWeight: '800' }]}>
                Manual Tag UID Entry
              </Text>
            </View>
            <Text style={[Typography.subhead, { color: colors.textSecondary, marginBottom: 16 }]}>
              Enter the 12-digit number printed on the cattle ear tag:
            </Text>

            <TextField
              placeholder="e.g. 106353486450"
              value={manualInput}
              onChangeText={setManualInput}
              keyboardType="number-pad"
              maxLength={12}
              autoFocus
              clearButton
            />

            <View style={styles.demoSuggestions}>
              <Text style={[Typography.caption1, { color: colors.textSecondary, marginBottom: 8, fontWeight: '700' }]}>
                Quick Demo Cattle Tags:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { tag: '106353486450', label: 'Photo Ear Tag (Lakshmi)' },
                  { tag: '100100100002', label: 'Sundari (#02)' },
                  { tag: '100100100003', label: 'Ganga (#03)' },
                  { tag: '100100100018', label: 'Quarantine Cow (#18)' },
                ].map((item) => (
                  <Pressable
                    key={item.tag}
                    onPress={() => setManualInput(item.tag)}
                    style={[styles.tagChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                      #{item.tag}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Button
              title="Search Cattle Digital Passport"
              onPress={handleConfirmAndProceed}
              disabled={!manualInput.trim()}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        {/* Scanned Tag Confirmation Card Modal */}
        {stage === 'confirming' && (
          <View style={styles.confirmModalOverlay}>
            <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.confirmHeader}>
                <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
                <Text style={[Typography.title2, { color: colors.text, fontWeight: '900', marginTop: 8 }]}>
                  Cattle Ear Tag Verified!
                </Text>
                <Text style={[Typography.caption1, { color: colors.textSecondary, marginTop: 4 }]}>
                  {detectedTag.length === 12
                    ? '12-Digit Pashu Aadhaar Tag Number Locked'
                    : 'Tag Number Detected • Review or Edit Below'}
                </Text>
              </View>

              <View style={styles.tagDisplayBox}>
                <Text style={styles.tagDisplayLabel}>12-DIGIT PASHU AADHAAR UID (TAP TO EDIT IF NEEDED)</Text>
                <TextInput
                  value={detectedTag}
                  onChangeText={setDetectedTag}
                  keyboardType="number-pad"
                  maxLength={12}
                  style={styles.tagDisplayNumberInput}
                  placeholder="Enter 12 digits"
                  placeholderTextColor="#64748B"
                />
                {ocrLog ? <Text style={styles.ocrLogText}>{ocrLog}</Text> : null}
              </View>

              <View style={styles.confirmActions}>
                <Button
                  title="Open Cattle Digital Passport →"
                  onPress={handleConfirmAndProceed}
                  disabled={!detectedTag.trim()}
                  style={{ width: '100%' }}
                />
                <Button
                  title="Rescan Tag"
                  variant="outline"
                  onPress={() => {
                    setStage('barcode_checking');
                    setDetectedTag('');
                  }}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

// Also export as QRScannerModal alias for backwards-compatibility
export const QRScannerModal = SmartCattleTagScannerModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 20,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  roleBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 17, 32, 0.55)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  statusBanner: {
    alignItems: 'center',
    marginTop: 8,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  stageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  viewfinder: {
    width: 320,
    height: 160,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.5)',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeZone: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  ocrZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ocrTagHeaderPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  ocrTagHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  ocrNumberBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  ocrDigitsHint: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FDE68A',
    letterSpacing: 2,
    marginVertical: 2,
  },
  ocrSubHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38BDF8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modePillActive: {
    backgroundColor: '#0284C7',
  },
  modePillActiveAmber: {
    backgroundColor: '#D97706',
  },
  modePillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  promptText: {
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 30,
    fontWeight: '700',
    fontSize: 14,
  },
  shutterRow: {
    alignItems: 'center',
  },
  shutterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  shutterInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterLabel: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  quickTestBar: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  quickTestLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 6,
  },
  quickTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickTagChipText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
  },
  webUploadBox: {
    marginTop: 4,
  },
  webUploadLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  manualContainer: {
    flex: 1,
    padding: 24,
  },
  demoSuggestions: {
    marginTop: 18,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmHeader: {
    alignItems: 'center',
  },
  tagDisplayBox: {
    backgroundColor: '#0F172A',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tagDisplayLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagDisplayNumber: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  tagDisplayNumberInput: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#38BDF8',
    minWidth: 240,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 8,
  },
  ocrLogText: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  confirmActions: {
    width: '100%',
  },
});
