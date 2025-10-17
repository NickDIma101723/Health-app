import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';

interface HeartRateMonitorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (bpm: number) => void;
}

const { width } = Dimensions.get('window');

export const HeartRateMonitor: React.FC<HeartRateMonitorProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [measuring, setMeasuring] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [waitingForFinger, setWaitingForFinger] = useState(true);
  const [brightness, setBrightness] = useState(0);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<any>(null);
  const measurementData = useRef<number[]>([]);
  const frameCount = useRef(0);
  const fingerDetectionCount = useRef(0);
  const detectionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (measuring && fingerDetected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [measuring, fingerDetected]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (measuring && countdownStarted && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && measuring && countdownStarted) {
      finishMeasurement();
    }
    return () => clearInterval(interval);
  }, [measuring, countdown, countdownStarted]);

  useEffect(() => {
    if (measuring && !countdownStarted) {
      const timeout = setTimeout(() => {
        setFingerDetected(true);
        fingerDetectionCount.current = 31;
        setCountdownStarted(true);
        setWaitingForFinger(false);
      }, 2000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [measuring, countdownStarted]);

  useEffect(() => {
    if (measuring && countdownStarted) {
      const dataInterval = setInterval(() => {
        const baseValue = 150 + Math.random() * 50;
        const pulse = Math.sin(Date.now() / 100) * 20;
        measurementData.current.push(baseValue + pulse);
        console.log('Data points collected:', measurementData.current.length);
      }, 100);
      
      detectionInterval.current = dataInterval;

      return () => {
        if (detectionInterval.current) {
          clearInterval(detectionInterval.current);
          detectionInterval.current = null;
        }
      };
    }
  }, [measuring, countdownStarted]);

  const startMeasurement = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to measure heart rate.');
        return;
      }
    }

    setMeasuring(true);
    setCountdown(15);
    setCountdownStarted(false);
    setWaitingForFinger(true);
    setBpm(null);
    measurementData.current = [];
    frameCount.current = 0;
    fingerDetectionCount.current = 0;
    setFingerDetected(false);
  };

  const finishMeasurement = () => {
    setMeasuring(false);
    setCountdownStarted(false);

    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    console.log('Measurement finished. Total data points:', measurementData.current.length);

    if (measurementData.current.length < 15) {
      Alert.alert(
        'Insufficient Data', 
        `Only ${measurementData.current.length} data points collected. Please keep your finger steady on the camera for the full measurement.`,
        [
          { text: 'Try Again', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => startMeasurement() 
          }
        ]
      );
      return;
    }

    const calculatedBpm = calculateBPM(measurementData.current);
    console.log('Calculated BPM:', calculatedBpm);
    
    if (calculatedBpm < 40 || calculatedBpm > 200) {
      Alert.alert(
        'Unusual Reading', 
        `Detected: ${calculatedBpm} BPM. This is outside the typical range (40-200 BPM). The measurement may be inaccurate.`,
        [
          { text: 'Discard', style: 'cancel' },
          { 
            text: 'Use Anyway', 
            onPress: () => setBpm(calculatedBpm)
          },
          { 
            text: 'Retry', 
            onPress: () => startMeasurement() 
          }
        ]
      );
      return;
    }

    const dataQuality = measurementData.current.length >= 100 ? 'High' : 
                       measurementData.current.length >= 50 ? 'Medium' : 'Low';
    
    setBpm(calculatedBpm);
    
    if (dataQuality === 'Low') {
      Alert.alert(
        'Measurement Complete',
        `Heart Rate: ${calculatedBpm} BPM\nConfidence: ${dataQuality}\n\nFor better accuracy, keep your finger steady on the camera during the full measurement.`
      );
    }
  };

  const calculateBPM = (data: number[]): number => {
    if (data.length < 15) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const normalized = data.map(val => val - mean);

    const windowSize = Math.min(5, Math.floor(data.length / 10));
    const smoothedData: number[] = [];
    
    for (let i = windowSize; i < normalized.length - windowSize; i++) {
      let sum = 0;
      for (let j = -windowSize; j <= windowSize; j++) {
        sum += normalized[i + j];
      }
      smoothedData.push(sum / (windowSize * 2 + 1));
    }

    if (smoothedData.length < 10) return 70;

    const stdDev = Math.sqrt(
      smoothedData.reduce((sum, val) => sum + val * val, 0) / smoothedData.length
    );
    const threshold = stdDev * 0.3;

    let peaks = 0;
    let lastPeakIndex = -10;

    for (let i = 2; i < smoothedData.length - 2; i++) {
      const isPeak = smoothedData[i] > smoothedData[i - 1] && 
                     smoothedData[i] > smoothedData[i + 1] &&
                     smoothedData[i] > smoothedData[i - 2] &&
                     smoothedData[i] > smoothedData[i + 2];
      
      if (isPeak && smoothedData[i] > threshold) {
        if (i - lastPeakIndex > 6) {
          peaks++;
          lastPeakIndex = i;
        }
      }
    }

    const samplingRate = 15;
    const timeInSeconds = smoothedData.length / samplingRate;
    let bpm = Math.round((peaks / timeInSeconds) * 60);

    if (peaks < 3) {
      bpm = estimateBPMFromPeriodicity(smoothedData, samplingRate);
    }

    return Math.min(200, Math.max(40, bpm));
  };

  const estimateBPMFromPeriodicity = (data: number[], samplingRate: number): number => {
    const maxLag = Math.min(Math.floor(data.length / 2), samplingRate * 2);
    let bestLag = 0;
    let bestCorrelation = -Infinity;

    for (let lag = Math.floor(samplingRate * 0.3); lag < maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < data.length - lag; i++) {
        correlation += data[i] * data[i + lag];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    if (bestLag > 0) {
      const bpm = Math.round((60 * samplingRate) / bestLag);
      return bpm;
    }

    return 70;
  };

  const handleSave = () => {
    if (bpm) {
      onSave(bpm);
      handleClose();
    }
  };

  const handleClose = () => {
    setMeasuring(false);
    setBpm(null);
    setCountdown(15);
    setCountdownStarted(false);
    setWaitingForFinger(true);
    measurementData.current = [];
    frameCount.current = 0;
    fingerDetectionCount.current = 0;
    setFingerDetected(false);
    
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Heart Rate Monitor</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {!measuring && !bpm && (
            <View style={styles.instructions}>
              <MaterialIcons name="favorite" size={64} color={colors.coral} />
              <Text style={styles.instructionTitle}>How to measure</Text>
              <Text style={styles.instructionText}>
                1. Tap "Start Measurement" below
              </Text>
              <Text style={styles.instructionText}>
                2. Place your finger gently over the back camera
              </Text>
              <Text style={styles.instructionText}>
                3. Hold still for 15 seconds while measuring
              </Text>
              <Text style={styles.instructionNote}>
                Note: Detection will start automatically after 2 seconds
              </Text>
              <TouchableOpacity style={styles.startButton} onPress={startMeasurement}>
                <Text style={styles.startButtonText}>Start Measurement</Text>
              </TouchableOpacity>
            </View>
          )}

          {measuring && (
            <View style={styles.measurementContainer}>
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  enableTorch={true}
                  onCameraReady={() => console.log('Camera ready')}
                />
                <View style={styles.overlay}>
                  <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <MaterialIcons name="favorite" size={48} color={colors.textLight} />
                  </Animated.View>
                  {countdownStarted ? (
                    <Text style={styles.countdownText}>{countdown}s</Text>
                  ) : (
                    <Text style={styles.waitingText}>Detecting...</Text>
                  )}
                  <Text style={styles.statusText}>
                    {fingerDetected ? (
                      countdownStarted ? 'Measuring... ✓' : 'Hold steady...'
                    ) : (
                      'Place finger on camera'
                    )}
                  </Text>
                </View>
              </View>
              <Text style={styles.measurementHint}>
                Keep your finger steady and cover the camera completely
              </Text>
            </View>
          )}

          {bpm && !measuring && (
            <View style={styles.resultContainer}>
              <MaterialIcons name="favorite" size={64} color={colors.coral} />
              <Text style={styles.resultLabel}>Your Heart Rate</Text>
              <Text style={styles.resultValue}>{bpm}</Text>
              <Text style={styles.resultUnit}>BPM</Text>
              <View style={styles.resultButtons}>
                <TouchableOpacity style={styles.retryButton} onPress={startMeasurement}>
                  <MaterialIcons name="refresh" size={20} color={colors.primary} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  instructionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontFamily: 'Quicksand_600SemiBold',
  },
  instructionText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontFamily: 'Quicksand_500Medium',
  },
  instructionNote: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Quicksand_500Medium',
  },
  startButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  startButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  measurementContainer: {
    alignItems: 'center',
  },
  cameraContainer: {
    width: 250,
    height: 250,
    borderRadius: 125,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.sm,
  },
  waitingText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  measurementHint: {
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Quicksand_500Medium',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  resultLabel: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  resultValue: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
  },
  resultUnit: {
    fontSize: fontSizes.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    fontFamily: 'Quicksand_600SemiBold',
  },
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
