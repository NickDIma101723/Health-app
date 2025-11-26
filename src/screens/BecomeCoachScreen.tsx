import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { BackgroundDecorations } from '../components';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BecomeCoachScreenProps {
  onNavigate?: (screen: string) => void;
}

export const BecomeCoachScreen: React.FC<BecomeCoachScreenProps> = ({ onNavigate }) => {
  const { user, refreshCoachStatus, switchToCoachMode, canBeCoach } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const isProfileComplete = profile && profile.full_name && profile.bio && profile.fitness_level;

  const missingFields: string[] = [];
  if (!profile?.full_name) missingFields.push('Full Name');
  if (!profile?.bio) missingFields.push('Bio/About');
  if (!profile?.fitness_level) missingFields.push('Fitness Level');

    const handleBecomeCoach = async () => {
    console.log('[BecomeCoach] Button clicked!', { isProfileComplete, profile });
    
    if (!isProfileComplete) {
      console.log('[BecomeCoach] Profile incomplete:', missingFields);
      Alert.alert(
        'Complete Your Profile First',
        `To become a coach, please complete your profile with:\n${missingFields.map(field => `• ${field}`).join('\n')}\n\nGo to your profile to update these fields.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => onNavigate?.('profile') }
        ]
      );
      return;
    }

    if (!user) {
      console.log('[BecomeCoach] No user found!');
      Alert.alert('Error', 'You must be logged in to become a coach');
      return;
    }

    // Add confirmation popup before proceeding
    setShowConfirmModal(true);
  };

  const confirmBecomeCoach = async () => {
    setShowConfirmModal(false);
    console.log('[BecomeCoach] Starting coach creation for user:', user!.id);
    setSubmitting(true);

    try {
      // Check if already a coach
      console.log('[BecomeCoach] Checking existing coach status...');
      const { data: existingCoach, error: checkError } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      console.log('[BecomeCoach] Existing coach check result:', { existingCoach, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.log('[BecomeCoach] Database error:', checkError);
        throw checkError;
      }

      if (existingCoach) {
        if (existingCoach.is_active) {
          console.log('[BecomeCoach] User is already an active coach, refreshing status...');
          console.log('[BecomeCoach] Available functions:', { 
            refreshCoachStatus: !!refreshCoachStatus, 
            switchToCoachMode: !!switchToCoachMode,
            onNavigate: !!onNavigate
          });
          
          // Refresh coach status to update AuthContext
          if (refreshCoachStatus) {
            console.log('[BecomeCoach] Calling refreshCoachStatus...');
            await refreshCoachStatus();
            console.log('[BecomeCoach] refreshCoachStatus completed');
          } else {
            console.log('[BecomeCoach] WARNING: refreshCoachStatus not available!');
          }
          
          // Switch to coach mode if available
          if (switchToCoachMode) {
            console.log('[BecomeCoach] Calling switchToCoachMode...');
            await switchToCoachMode();
            console.log('[BecomeCoach] switchToCoachMode completed');
          } else {
            console.log('[BecomeCoach] WARNING: switchToCoachMode not available!');
          }
          
          console.log('[BecomeCoach] Showing alert...');
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('✅ You\'re Already a Coach! Great news! You\'re already certified as a health coach. Navigating to your coach dashboard now...');
            // Force navigate to coach dashboard
            if (onNavigate) {
              onNavigate('coach-dashboard');
            }
          } else {
            Alert.alert(
              '✅ You\'re Already a Coach!', 
              'Great news! You\'re already certified as a health coach. Navigating to your coach dashboard now...',
              [
                {
                  text: 'Go to Coach Dashboard',
                  onPress: () => {
                    console.log('[BecomeCoach] Alert button pressed, navigating to coach dashboard...');
                    console.log('[BecomeCoach] Current auth state:', { isCoach: canBeCoach, currentMode: 'should be coach' });
                    
                    // Force navigate to coach dashboard
                    if (onNavigate) {
                      onNavigate('coach-dashboard');
                    } else {
                      console.log('[BecomeCoach] ERROR: onNavigate is not available!');
                    }
                  }
                }
              ]
            );
          }
          return;
        }
        // Reactivate existing coach
        console.log('[BecomeCoach] Reactivating existing coach...');
        const { error: updateError } = await supabase
          .from('coaches')
          .update({ is_active: true })
          .eq('user_id', user!.id);

        if (updateError) {
          console.log('[BecomeCoach] Error reactivating coach:', updateError);
          throw updateError;
        }
        console.log('[BecomeCoach] ✅ Coach reactivated successfully');
      } else {
        // Create new coach
        console.log('[BecomeCoach] Creating new coach with data:', {
          user_id: user!.id,
          full_name: profile.full_name,
          email: user!.email || '',
          specialization: profile.fitness_level,
          bio: profile.bio,
        });
        
        const { error: insertError } = await supabase
          .from('coaches')
          .insert({
            user_id: user!.id,
            full_name: profile.full_name,
            email: user!.email || '',
            specialization: profile.fitness_level,
            bio: profile.bio,
            is_active: true,
          });

        if (insertError) {
          console.log('[BecomeCoach] Error creating coach:', insertError);
          throw insertError;
        }
        console.log('[BecomeCoach] ✅ New coach created successfully');
      }

      // Enhanced success experience with direct navigation
      console.log('[BecomeCoach] New coach - activating coach mode and navigating...');
      
      // Switch to coach mode (it will refresh internally)
      if (switchToCoachMode) {
        console.log('[BecomeCoach] Switching to coach mode...');
        await switchToCoachMode();
      }
      
      // Navigate directly to coach dashboard
      console.log('[BecomeCoach] Navigating to coach dashboard...');
      onNavigate?.('coach-dashboard');
    } catch (error) {
      console.error('Error becoming coach:', error);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Failed to become a coach. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to become a coach. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate?.('coach-selection')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach Qualification</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="school" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Coach Qualification Check</Text>
          <Text style={styles.heroText}>
            Let's ensure you're ready to inspire and guide others on their health journey
          </Text>
        </View>

        {/* Profile Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialIcons 
              name={isProfileComplete ? "verified" : "warning"} 
              size={24} 
              color={isProfileComplete ? colors.success : colors.warning} 
            />
            <Text style={[styles.statusTitle, { color: isProfileComplete ? colors.success : colors.warning }]}>
              Profile {isProfileComplete ? 'Complete' : 'Incomplete'}
            </Text>
          </View>
          
          {/* Requirements List */}
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <MaterialIcons 
                name={profile?.full_name ? "check-circle" : "radio-button-unchecked"} 
                size={20} 
                color={profile?.full_name ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, profile?.full_name && styles.requirementCompleted]}>
                Full Name: {profile?.full_name || 'Not set'}
              </Text>
            </View>
            
            <View style={styles.requirementItem}>
              <MaterialIcons 
                name={profile?.bio ? "check-circle" : "radio-button-unchecked"} 
                size={20} 
                color={profile?.bio ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, profile?.bio && styles.requirementCompleted]}>
                Bio/About: {profile?.bio ? 'Complete' : 'Missing'}
              </Text>
            </View>
            
            <View style={styles.requirementItem}>
              <MaterialIcons 
                name={profile?.fitness_level ? "check-circle" : "radio-button-unchecked"} 
                size={20} 
                color={profile?.fitness_level ? colors.success : colors.textSecondary} 
              />
              <Text style={[styles.requirementText, profile?.fitness_level && styles.requirementCompleted]}>
                Fitness Level: {profile?.fitness_level || 'Not set'}
              </Text>
            </View>
          </View>

          {!isProfileComplete && (
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => onNavigate?.('profile')}
            >
              <MaterialIcons name="edit" size={20} color={colors.primary} />
              <Text style={styles.profileButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coach Benefits */}
        <View style={styles.benefitsCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="stars" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>What You'll Get as a Coach</Text>
          </View>
          <View style={styles.benefitsList}>
            {[
              { icon: 'trending-up', text: 'Track client progress & goals' },
              { icon: 'chat', text: 'Secure messaging platform' },
              { icon: 'schedule', text: 'Flexible coaching schedule' },
              { icon: 'favorite', text: 'Make a real difference' },
              { icon: 'people', text: 'Build meaningful connections' }
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitWidget}>
                <View style={styles.benefitIconContainer}>
                  <MaterialIcons name={benefit.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.responsibilitiesCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="assignment" size={24} color={colors.warning} />
            <Text style={styles.cardTitle}>Coach Responsibilities</Text>
          </View>
          <View style={styles.responsibilityList}>
            {[
              { icon: 'support', text: 'Provide supportive and professional guidance' },
              { icon: 'shield', text: 'Respect client privacy and boundaries' },
              { icon: 'message', text: 'Maintain regular communication' },
              { icon: 'school', text: 'Stay updated with best practices' },
              { icon: 'emoji-events', text: 'Encourage and motivate clients' }
            ].map((item, index) => (
              <View key={index} style={styles.responsibilityWidget}>
                <View style={styles.responsibilityIconContainer}>
                  <MaterialIcons name={item.icon as any} size={16} color={colors.warning} />
                </View>
                <Text style={styles.responsibilityText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton, 
            !isProfileComplete && styles.submitButtonDisabled
          ]}
          onPress={handleBecomeCoach}
          disabled={!isProfileComplete || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textLight} />
          ) : (
            <LinearGradient
              colors={isProfileComplete ? [colors.primary, colors.primaryDark] : [colors.textSecondary, colors.textSecondary]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons 
                name={isProfileComplete ? "local-fire-department" : "warning"} 
                size={20} 
                color={colors.textLight} 
              />
              <Text style={styles.submitButtonText}>
                {isProfileComplete ? "Become a Coach" : "Complete Profile First"}
              </Text>
              {isProfileComplete && (
                <MaterialIcons name="arrow-forward" size={20} color={colors.textLight} />
              )}
            </LinearGradient>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Become Coach Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="emoji-events" size={48} color={colors.primary} />
            <Text style={styles.modalTitle}>Become a Health Coach</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to become a health coach? This will unlock coach features and allow you to help others with their fitness goals.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmBecomeCoach}
              >
                <Text style={styles.modalConfirmText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
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
  benefitsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    flex: 1,
  },
  benefitsList: {
    gap: spacing.sm,
  },
  benefitWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryPale,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  benefitIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    flex: 1,
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
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    fontFamily: 'Quicksand_700Bold',
  },
  requirementsList: {
    gap: spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  requirementCompleted: {
    color: colors.success,
    fontWeight: '600',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryPale,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  profileButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  responsibilitiesCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  responsibilityList: {
    gap: spacing.sm,
  },
  responsibilityWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  responsibilityIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  responsibilityText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
    flex: 1,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
  },
});


