import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { BackgroundDecorations } from '../components';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BecomeCoachScreenProps {
  onNavigate?: (screen: string) => void;
}

export const BecomeCoachScreen: React.FC<BecomeCoachScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const specializations = ['Nutrition', 'Fitness', 'Mental Health', 'Weight Loss', 'Sports', 'General'];

  const handleSubmit = async () => {
    if (!fullName || !email || !specialization) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to become a coach');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('coaches')
        .insert({
          user_id: user.id,
          full_name: fullName,
          email: email,
          specialization: specialization,
          bio: bio || null,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your application has been submitted. You are now a coach!',
        [
          {
            text: 'OK',
            onPress: () => onNavigate?.('home'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error becoming coach:', error);
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate?.('coach-selection')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Coach</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="workspace-premium" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Share Your Expertise</Text>
          <Text style={styles.heroText}>
            Help others achieve their health goals while building a rewarding coaching practice
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Coach Benefits</Text>
          {[
            'Connect with motivated clients',
            'Flexible coaching schedule',
            'Track client progress',
            'Secure messaging platform',
            'Make a real difference',
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <MaterialIcons name="check-circle" size={20} color={colors.primary} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Application Form</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Specialization <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.specializationScroll}
            >
              {specializations.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.specializationChip,
                    specialization === spec && styles.specializationChipActive,
                  ]}
                  onPress={() => setSpecialization(spec)}
                >
                  <Text
                    style={[
                      styles.specializationChipText,
                      specialization === spec && styles.specializationChipTextActive,
                    ]}
                  >
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about your experience and coaching philosophy..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Application</Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.textLight} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
  },
  heroText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  benefitsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  specializationScroll: {
    marginTop: spacing.xs,
  },
  specializationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  specializationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specializationChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  specializationChipTextActive: {
    color: colors.textLight,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    marginTop: spacing.md,
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Quicksand_700Bold',
  },
});
