import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useCoaches } from '../hooks';
import { BackgroundDecorations } from '../components';

interface CoachSelectionScreenProps {
  onNavigate?: (screen: string) => void;
  onSelectCoach?: (coachId: string) => void;
}

export const CoachSelectionScreen: React.FC<CoachSelectionScreenProps> = ({ 
  onNavigate, 
  onSelectCoach 
}) => {
  const { coaches, loading, assignCoach, fetchCoaches } = useCoaches();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [showCoachDetail, setShowCoachDetail] = useState(false);

  // Fetch coaches when screen mounts
  useEffect(() => {
    console.log('[CoachSelectionScreen] Fetching coaches on mount');
    fetchCoaches();
  }, []);

  const specializations = ['Nutrition', 'Fitness', 'Mental Health', 'Weight Loss', 'Sports', 'General'];

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = 
      coach.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coach.specialization || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialization = 
      !selectedSpecialization || 
      coach.specialization === selectedSpecialization;
    
    return matchesSearch && matchesSpecialization && coach.is_active;
  });

  const handleSelectCoach = async (coach: any) => {
    setSelectedCoach(coach);
    setShowCoachDetail(true);
  };

  const handleAssignCoach = async (coachId: string, coachName: string) => {
    setShowCoachDetail(false);
    Alert.alert(
      'Assign Coach',
      `Assign ${coachName} as your personal health coach?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setAssigning(coachId);
            try {
              console.log('[CoachSelection] Assigning coach:', coachId, coachName);
              const result = await assignCoach(coachId);
              if (result.error) {
                console.error('[CoachSelection] Assignment error:', result.error);
                Alert.alert('Error', result.error);
              } else {
                console.log('[CoachSelection] ✅ Coach assigned successfully');
                // Force refresh of coach data before navigating
                await fetchCoaches();
                // Navigate to chat
                console.log('[CoachSelection] Navigating to chat...');
                onNavigate?.('chat');
              }
            } catch (error) {
              console.error('[CoachSelection] Exception during assignment:', error);
              Alert.alert('Error', 'Failed to assign coach');
            } finally {
              setAssigning(null);
            }
          },
        },
      ]
    );
  };

  const getSpecializationIcon = (specialization: string | null) => {
    switch (specialization) {
      case 'Nutrition': return 'restaurant';
      case 'Fitness': return 'fitness-center';
      case 'Mental Health': return 'psychology';
      case 'Weight Loss': return 'monitor-weight';
      case 'Sports': return 'sports';
      default: return 'person';
    }
  };

  const getSpecializationColor = (specialization: string | null) => {
    switch (specialization) {
      case 'Nutrition': return colors.accent;
      case 'Fitness': return colors.primary;
      case 'Mental Health': return colors.purple;
      case 'Weight Loss': return colors.secondary;
      case 'Sports': return colors.success;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => onNavigate?.('home')}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerSubtitle}>Find Your</Text>
          <Text style={styles.headerTitle}>Health Coach</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.searchContainer, shadows.sm]}>
          <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coaches..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedSpecialization && styles.filterChipActive,
            ]}
            onPress={() => setSelectedSpecialization(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !selectedSpecialization && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec}
              style={[
                styles.filterChip,
                selectedSpecialization === spec && styles.filterChipActive,
              ]}
              onPress={() => setSelectedSpecialization(spec)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSpecialization === spec && styles.filterChipTextActive,
                ]}
              >
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.coachList}
          contentContainerStyle={styles.coachListContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading coaches...</Text>
            </View>
          ) : filteredCoaches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-search" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No coaches found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'No coaches available in this category'}
              </Text>
            </View>
          ) : (
            filteredCoaches.map((coach) => (
              <TouchableOpacity
                key={coach.id}
                style={[styles.coachCard, shadows.md]}
                onPress={() => handleSelectCoach(coach)}
                disabled={assigning === coach.id}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.coachAvatar,
                    { backgroundColor: getSpecializationColor(coach.specialization) + '20' },
                  ]}
                >
                  <MaterialIcons
                    name={getSpecializationIcon(coach.specialization) as any}
                    size={40}
                    color={getSpecializationColor(coach.specialization)}
                  />
                </View>

                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>{coach.full_name}</Text>
                  {coach.specialization && (
                    <View style={[styles.specializationBadge, { backgroundColor: getSpecializationColor(coach.specialization) + '15' }]}>
                      <MaterialIcons
                        name="star"
                        size={12}
                        color={getSpecializationColor(coach.specialization)}
                      />
                      <Text
                        style={[
                          styles.specializationText,
                          { color: getSpecializationColor(coach.specialization) },
                        ]}
                      >
                        {coach.specialization}
                      </Text>
                    </View>
                  )}
                  {coach.bio && (
                    <Text style={styles.coachBio} numberOfLines={2}>
                      {coach.bio}
                    </Text>
                  )}
                  
                  <View style={styles.coachFooter}>
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={14} color={colors.accent} />
                      <Text style={styles.ratingText}>4.9</Text>
                    </View>
                    <View style={styles.clientsContainer}>
                      <MaterialIcons name="people" size={14} color={colors.textSecondary} />
                      <Text style={styles.clientsText}>150+ clients</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.arrowContainer}>
                  {assigning === coach.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    // Quick assign & chat button
                    <TouchableOpacity
                      style={styles.arrowButton}
                      onPress={() => handleAssignCoach(coach.id, coach.full_name)}
                      activeOpacity={0.7}
                      disabled={assigning === coach.id}
                    >
                      <MaterialIcons name="chat" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.becomeCoachSection}>
            <View style={[styles.becomeCoachCard, shadows.md]}>
              <View style={styles.becomeCoachIcon}>
                <MaterialIcons name="workspace-premium" size={32} color={colors.primary} />
              </View>
              <Text style={styles.becomeCoachTitle}>Want to become a coach?</Text>
              <Text style={styles.becomeCoachText}>
                Help others achieve their health goals and share your expertise
              </Text>
              <TouchableOpacity
                style={styles.becomeCoachButton}
                onPress={() => onNavigate?.('become-coach')}
              >
                <Text style={styles.becomeCoachButtonText}>Learn More</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={showCoachDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCoachDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <TouchableOpacity 
              style={styles.closeModal}
              onPress={() => setShowCoachDetail(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            {selectedCoach && (
              <>
                <View
                  style={[
                    styles.modalAvatar,
                    { backgroundColor: getSpecializationColor(selectedCoach.specialization) + '20' },
                  ]}
                >
                  <MaterialIcons
                    name={getSpecializationIcon(selectedCoach.specialization) as any}
                    size={48}
                    color={getSpecializationColor(selectedCoach.specialization)}
                  />
                </View>

                <Text style={styles.modalName}>{selectedCoach.full_name}</Text>
                
                {selectedCoach.specialization && (
                  <View style={styles.modalSpecializationBadge}>
                    <MaterialIcons
                      name="star"
                      size={16}
                      color={getSpecializationColor(selectedCoach.specialization)}
                    />
                    <Text
                      style={[
                        styles.modalSpecializationText,
                        { color: getSpecializationColor(selectedCoach.specialization) },
                      ]}
                    >
                      {selectedCoach.specialization} Specialist
                    </Text>
                  </View>
                )}

                {selectedCoach.bio && (
                  <Text style={styles.modalBio}>{selectedCoach.bio}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.assignButton]}
                    onPress={() => handleAssignCoach(selectedCoach.id, selectedCoach.full_name)}
                  >
                    <MaterialIcons name="how-to-reg" size={20} color={colors.textLight} />
                    <Text style={styles.assignButtonText}>Assign as My Coach</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
    paddingVertical: spacing.xs,
  },
  filterScroll: {
    marginBottom: spacing.md,
    maxHeight: 44,
  },
  filterScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  filterChipTextActive: {
    color: colors.textLight,
  },
  coachList: {
    flex: 1,
  },
  coachListContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(100, 150, 255, 0.08)',
  },
  coachAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  coachName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  specializationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  specializationText: {
    fontSize: 11,
    fontFamily: 'Quicksand_600SemiBold',
    fontWeight: '600',
  },
  coachBio: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  coachFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  clientsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clientsText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  becomeCoachSection: {
    marginTop: spacing.lg,
  },
  becomeCoachCard: {
    backgroundColor: colors.primaryPale,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  becomeCoachIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  becomeCoachTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  becomeCoachText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  becomeCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  becomeCoachButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
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
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeModal: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
    zIndex: 1,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  modalName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSpecializationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modalSpecializationText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
  },
  modalBio: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalActions: {
    width: '100%',
    gap: spacing.sm,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  assignButton: {
    backgroundColor: colors.primary,
  },
  assignButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
