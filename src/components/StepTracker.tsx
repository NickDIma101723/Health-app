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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../constants/theme';

interface StepTrackerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (steps: number) => void;
  currentSteps: number;
}

const { width } = Dimensions.get('window');

export const StepTracker: React.FC<StepTrackerProps> = ({
  visible,
  onClose,
  onSave,
  currentSteps,
}) => {
  const [steps, setSteps] = useState('0');
  const [mode, setMode] = useState<'add' | 'set'>('add');

  useEffect(() => {
    if (visible) {
      setSteps('0');
      setMode('add');
    }
  }, [visible]);

  const handleSave = () => {
    const stepsNum = parseInt(steps) || 0;

    if (stepsNum < 0) {
      Alert.alert('Invalid Input', 'Steps must be a positive number');
      return;
    }

    if (stepsNum === 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of steps');
      return;
    }

    if (mode === 'add') {
      onSave(currentSteps + stepsNum);
    } else {
      onSave(stepsNum);
    }
    
    handleClose();
  };

  const handleClose = () => {
    setSteps('0');
    setMode('add');
    onClose();
  };

  const quickAdd = (amount: number) => {
    if (mode === 'add') {
      setSteps(amount.toString());
    } else {
      setSteps((currentSteps + amount).toString());
    }
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
            <Text style={styles.modalTitle}>Step Tracker</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.iconContainer}>
            <MaterialIcons name="directions-walk" size={64} color={colors.primary} />
          </View>

          <Text style={styles.currentStepsLabel}>Current Steps Today</Text>
          <Text style={styles.currentStepsValue}>{currentSteps.toLocaleString()}</Text>

          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'add' && styles.modeButtonActive]}
              onPress={() => setMode('add')}
            >
              <Text style={[styles.modeButtonText, mode === 'add' && styles.modeButtonTextActive]}>
                Add Steps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'set' && styles.modeButtonActive]}
              onPress={() => setMode('set')}
            >
              <Text style={[styles.modeButtonText, mode === 'set' && styles.modeButtonTextActive]}>
                Set Total
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>
            {mode === 'add' ? 'Steps to Add' : 'Total Steps'}
          </Text>
          <TextInput
            style={styles.stepsInput}
            value={steps}
            onChangeText={setSteps}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            selectTextOnFocus
          />

          <Text style={styles.quickAddLabel}>Quick Add</Text>
          <View style={styles.quickAddContainer}>
            {[100, 500, 1000, 2500, 5000].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.quickAddButton}
                onPress={() => quickAdd(amount)}
              >
                <Text style={styles.quickAddText}>+{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {mode === 'add' ? 'Add Steps' : 'Update Steps'}
              </Text>
            </TouchableOpacity>
          </View>
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  currentStepsLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  currentStepsValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: 'Poppins_700Bold',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  modeButtonTextActive: {
    color: colors.primary,
  },
  inputLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  stepsInput: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickAddLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: 'Quicksand_500Medium',
  },
  quickAddContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAddButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickAddText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
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
