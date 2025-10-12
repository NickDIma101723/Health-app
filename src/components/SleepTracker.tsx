import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';

interface SleepTrackerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (hours: number) => void;
  currentHours?: number;
}

const { width } = Dimensions.get('window');

export const SleepTracker: React.FC<SleepTrackerProps> = ({
  visible,
  onClose,
  onSave,
  currentHours = 0,
}) => {
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [selectedQuality, setSelectedQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');

  useEffect(() => {
    if (visible && currentHours) {
      const wholeHours = Math.floor(currentHours);
      const remainingMinutes = Math.round((currentHours - wholeHours) * 60);
      setHours(wholeHours.toString());
      setMinutes(remainingMinutes.toString());
    } else if (visible) {
      setHours('7');
      setMinutes('30');
    }
  }, [visible, currentHours]);

  const handleSave = () => {
    const hoursNum = parseInt(hours) || 0;
    const minutesNum = parseInt(minutes) || 0;

    if (hoursNum < 0 || hoursNum > 24) {
      Alert.alert('Invalid Input', 'Hours must be between 0 and 24');
      return;
    }

    if (minutesNum < 0 || minutesNum > 59) {
      Alert.alert('Invalid Input', 'Minutes must be between 0 and 59');
      return;
    }

    if (hoursNum === 0 && minutesNum === 0) {
      Alert.alert('Invalid Input', 'Please enter a valid sleep duration');
      return;
    }

    const totalHours = hoursNum + minutesNum / 60;
    onSave(totalHours);
    handleClose();
  };

  const handleClose = () => {
    setHours('0');
    setMinutes('0');
    setSelectedQuality('good');
    onClose();
  };

  const quickSelect = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    setHours(h.toString());
    setMinutes(m.toString());
  };

  const qualityOptions = [
    { value: 'poor', label: 'Poor', icon: 'sentiment-very-dissatisfied', color: colors.error },
    { value: 'fair', label: 'Fair', icon: 'sentiment-neutral', color: colors.orange },
    { value: 'good', label: 'Good', icon: 'sentiment-satisfied', color: colors.teal },
    { value: 'excellent', label: 'Excellent', icon: 'sentiment-very-satisfied', color: colors.success },
  ];

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
            <Text style={styles.modalTitle}>Sleep Tracker</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="bedtime" size={64} color={colors.purple} />
            </View>

            <Text style={styles.sectionTitle}>Sleep Duration</Text>
            
            <View style={styles.timeInputContainer}>
              <View style={styles.timeInput}>
                <TextInput
                  style={styles.timeValue}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.timeLabel}>hours</Text>
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.timeInput}>
                <TextInput
                  style={styles.timeValue}
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.timeLabel}>minutes</Text>
              </View>
            </View>

            <Text style={styles.quickSelectLabel}>Quick Select</Text>
            <View style={styles.quickSelectContainer}>
              {[
                { label: '6h', minutes: 360 },
                { label: '7h', minutes: 420 },
                { label: '7.5h', minutes: 450 },
                { label: '8h', minutes: 480 },
                { label: '9h', minutes: 540 },
              ].map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.quickSelectButton}
                  onPress={() => quickSelect(option.minutes)}
                >
                  <Text style={styles.quickSelectText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Sleep Quality</Text>
            <View style={styles.qualityContainer}>
              {qualityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityOption,
                    selectedQuality === option.value && styles.qualityOptionSelected,
                  ]}
                  onPress={() => setSelectedQuality(option.value as any)}
                >
                  <MaterialIcons
                    name={option.icon as any}
                    size={32}
                    color={selectedQuality === option.value ? option.color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.qualityLabel,
                      selectedQuality === option.value && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Sleep</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
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
  iconContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontFamily: 'Quicksand_600SemiBold',
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  timeInput: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    minWidth: 80,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  timeLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
    fontFamily: 'Poppins_700Bold',
  },
  quickSelectLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  quickSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickSelectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSelectText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  qualityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  qualityOption: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  qualityOptionSelected: {
    backgroundColor: colors.background,
  },
  qualityLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
