import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomNavigation,
  BackgroundDecorations,
} from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { Activity, ActivityTemplate, ActivityType } from '../contexts/ScheduleContext';
import { useScheduleAdapter } from '../hooks/useScheduleAdapter';

const { width } = Dimensions.get('window');

interface DayData {
  date: string;
  dayName: string;
  dayNum: number;
  month: number;
  year: number;
  isToday: boolean;
}

interface ScheduleScreenProps {
  onNavigate?: (screen: string) => void;
}

const formatTime = (time: string): string => {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
};

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onNavigate }) => {
  const {
    activities,
    templates,
    weeklyGoals,
    addActivity,
    deleteActivity,
    toggleActivityStatus,
    getActivitiesForDate,
  } = useScheduleAdapter();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState('30');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  useEffect(() => {
    const generateWeekDays = () => {
      const days: DayData[] = [];
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const current = new Date(today);
      current.setDate(current.getDate() + (currentWeekOffset * 7)); 
      const dayOfWeek = current.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      current.setDate(current.getDate() + diff);

      for (let i = 0; i < 7; i++) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        
        days.push({
          date: dateStr,
          dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: current.getDate(),
          month: current.getMonth(),
          year: current.getFullYear(),
          isToday,
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      setWeekDays(days);
    };

    generateWeekDays();
  }, [currentWeekOffset]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const formatDateString = (day: DayData): string => {
    return `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.dayNum).padStart(2, '0')}`;
  };

  const dayActivities = getActivitiesForDate(selectedDate);
  const completedCount = dayActivities.filter(a => a.status === 'completed').length;
  const failedCount = dayActivities.filter(a => a.status === 'failed').length;
  const totalCount = dayActivities.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddFromTemplate = async (template: ActivityTemplate) => {
    const existingActivity = activities.find(
      (activity) => activity.title === template.title && activity.date === selectedDate
    );
    if (existingActivity) {
      Alert.alert('Duplicate Activity', 'An activity with this title already exists for this date.');
      return;
    }
    await addActivity({
      title: template.title,
      description: template.description,
      time: template.defaultTime || '12:00',
      duration: template.duration,
      type: template.type,
      color: template.color,
      icon: template.icon,
      status: 'incomplete',
      date: selectedDate,
    });
    setShowQuickAdd(false);
  };

  const handleAddCustomActivity = async () => {
    if (!customTitle.trim() || !customTime.trim()) {
      Alert.alert('Missing Information', 'Please enter a title and time for the activity.');
      return;
    }
    const existingActivity = activities.find(
      (activity) => activity.title === customTitle.trim() && activity.date === selectedDate
    );
    if (existingActivity) {
      Alert.alert('Duplicate Activity', 'An activity with this title already exists for this date.');
      return;
    }

    await addActivity({
      title: customTitle,
      time: customTime,
      duration: parseInt(customDuration) || 30,
      type: 'custom',
      color: colors.primary,
      icon: 'event',
      status: 'incomplete',
      date: selectedDate,
    });

    setCustomTitle('');
    setCustomTime('');
    setCustomDuration('30');
    setShowAddCustom(false);
    setShowQuickAdd(false);
  };

  const handleActivityPress = (activity: Activity) => {
    toggleActivityStatus(activity.id);
  };

  const handleActivityLongPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityDetail(true);
  };

  const handleDeleteActivity = () => {
    if (selectedActivity) {
      Alert.alert(
        'Delete Activity',
        `Are you sure you want to delete "${selectedActivity.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteActivity(selectedActivity.id);
              setShowActivityDetail(false);
              setSelectedActivity(null);
            },
          },
        ]
      );
    }
  };

  const renderDayCard = (day: DayData) => {
    const dateStr = formatDateString(day);
    const isSelected = dateStr === selectedDate;
    const dayActivities = getActivitiesForDate(dateStr);
    const hasActivities = dayActivities.length > 0;
    
    return (
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.dayCard,
          isSelected && styles.dayCardSelected,
          day.isToday && !isSelected && styles.dayCardToday,
        ]}
        onPress={() => setSelectedDate(dateStr)}
        activeOpacity={0.7}
      >
        {isSelected && (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.dayCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={styles.dayCardContent}>
          <Text style={[
            styles.dayDate,
            isSelected && styles.dayDateSelected,
          ]}>
            {day.dayName}
          </Text>
          <Text style={[
            styles.dayNum,
            isSelected && styles.dayNumSelected,
          ]}>
            {day.dayNum}
          </Text>
          {hasActivities && !isSelected && (
            <View style={styles.activityDot} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusIcon = (status: Activity['status']) => {
    if (status === 'completed') return 'check-circle';
    if (status === 'failed') return 'cancel';
    return 'radio-button-unchecked';
  };

  const getStatusColor = (status: Activity['status'], activityColor: string) => {
    if (status === 'completed') return activityColor;
    if (status === 'failed') return colors.error;
    return colors.border;
  };

  const renderActivity = (activity: Activity) => {
    return (
      <TouchableOpacity
        key={activity.id}
        style={[
          styles.activityCard,
          activity.status === 'failed' && styles.activityCardFailed,
        ]}
        onPress={() => handleActivityPress(activity)}
        onLongPress={() => handleActivityLongPress(activity)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.activityIndicator,
          { backgroundColor: activity.status === 'failed' ? colors.error : activity.color }
        ]} />
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <View style={[
              styles.activityIconContainer,
              { backgroundColor: `${(activity.status === 'failed' ? colors.error : activity.color)}20` }
            ]}>
              <MaterialIcons
                name={activity.icon as any}
                size={20}
                color={activity.status === 'failed' ? colors.error : activity.color}
              />
            </View>
            <View style={styles.activityInfo}>
              <Text style={[
                styles.activityTitle,
                activity.status === 'completed' && styles.activityTitleCompleted,
                activity.status === 'failed' && styles.activityTitleFailed,
              ]}>
                {activity.title}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.time)} · {activity.duration} min</Text>
            </View>
          </View>
        </View>

        <View style={styles.activityStatusIcon}>
          <MaterialIcons
            name={getStatusIcon(activity.status) as any}
            size={28}
            color={getStatusColor(activity.status, activity.color)}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Your Schedule</Text>
          <Text style={styles.headerTitle}>
            {weekDays.length > 0 
              ? new Date(weekDays[0].year, weekDays[0].month).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })
              : new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowQuickAdd(true)}
        >
          <MaterialIcons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.calendarSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekDaysContainer}
            >
              {weekDays.map(renderDayCard)}
            </ScrollView>
          </View>

          <View style={styles.progressSection}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryPale]}
              style={styles.progressCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>Today's Progress</Text>
                  <Text style={styles.progressSubtitle}>
                    {completedCount} completed · {failedCount} failed · {totalCount - completedCount - failedCount} pending
                  </Text>
                </View>
                <View style={styles.progressPercentage}>
                  <Text style={styles.progressPercentageText}>
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>

              <Text style={styles.progressHint}>
                Tap to mark complete, twice for failed, three times to reset
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activities</Text>
              <Text style={styles.sectionCount}>{dayActivities.length}</Text>
            </View>

            {dayActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-available" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No activities scheduled</Text>
                <Text style={styles.emptyStateSubtext}>Tap the + button to add one</Text>
              </View>
            ) : (
              <View style={styles.activitiesList}>
                {dayActivities.map(renderActivity)}
              </View>
            )}
          </View>

          <View style={styles.goalsSection}>
            <Text style={styles.sectionTitle}>Weekly Goals</Text>
            
            <View style={styles.goalsGrid}>
              <View style={styles.goalCard}>
                <View style={[styles.goalIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <MaterialIcons name="fitness-center" size={24} color={colors.primary} />
                </View>
                <Text style={styles.goalValue}>{weeklyGoals.workouts.current}/{weeklyGoals.workouts.target}</Text>
                <Text style={styles.goalLabel}>Workouts</Text>
              </View>

              <View style={styles.goalCard}>
                <View style={[styles.goalIcon, { backgroundColor: `${colors.accent}20` }]}>
                  <MaterialIcons name="restaurant" size={24} color={colors.accent} />
                </View>
                <Text style={styles.goalValue}>{weeklyGoals.meals.current}/{weeklyGoals.meals.target}</Text>
                <Text style={styles.goalLabel}>Meals</Text>
              </View>

              <View style={styles.goalCard}>
                <View style={[styles.goalIcon, { backgroundColor: `${colors.purple}20` }]}>
                  <MaterialIcons name="spa" size={24} color={colors.purple} />
                </View>
                <Text style={styles.goalValue}>{weeklyGoals.meditation.current}/{weeklyGoals.meditation.target}</Text>
                <Text style={styles.goalLabel}>Meditation</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showQuickAdd}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Activity</Text>
              <TouchableOpacity onPress={() => setShowQuickAdd(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.templatesScroll}>
              <View style={styles.quickAddGrid}>
                {templates.slice(0, 6).map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.quickAddOption}
                    onPress={() => handleAddFromTemplate(template)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[`${template.color}20`, `${template.color}10`]}
                      style={styles.quickAddIconContainer}
                    >
                      <MaterialIcons name={template.icon as any} size={32} color={template.color} />
                    </LinearGradient>
                    <Text style={styles.quickAddLabel} numberOfLines={2} ellipsizeMode="tail">{template.title}</Text>
                    <Text style={styles.quickAddDuration}>{template.duration} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.customActivityButton}
                onPress={() => setShowAddCustom(true)}
              >
                <MaterialIcons name="add-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.customActivityButtonText}>Create Custom Activity</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddCustom}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCustom(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Activity</Text>
              <TouchableOpacity onPress={() => setShowAddCustom(false)}>
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.customForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Activity name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.formLabel}>Time</Text>
                  <TextInput
                    style={styles.formInput}
                    value={customTime}
                    onChangeText={setCustomTime}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Duration (min)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    placeholder="30"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCustomActivity}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.addButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.addButtonText}>Add Activity</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showActivityDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActivityDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {selectedActivity && (
              <>
                <View style={[
                  styles.detailHeader,
                  { backgroundColor: `${selectedActivity.color}20` }
                ]}>
                  <MaterialIcons
                    name={selectedActivity.icon as any}
                    size={48}
                    color={selectedActivity.color}
                  />
                  <Text style={styles.detailTitle}>{selectedActivity.title}</Text>
                  <Text style={styles.detailTime}>
                    {formatTime(selectedActivity.time)} · {selectedActivity.duration} minutes
                  </Text>
                </View>

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.detailActionButton}
                    onPress={() => {
                      toggleActivityStatus(selectedActivity.id);
                      setShowActivityDetail(false);
                    }}
                  >
                    <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                    <Text style={styles.detailActionText}>Toggle Status</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.deleteButton]}
                    onPress={handleDeleteActivity}
                  >
                    <MaterialIcons name="delete" size={24} color={colors.error} />
                    <Text style={[styles.detailActionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeDetailButton}
                  onPress={() => setShowActivityDetail(false)}
                >
                  <Text style={styles.closeDetailText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BottomNavigation
        activeTab="schedule"
        onTabChange={(tab) => onNavigate?.(tab)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  weekNavButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  monthYearText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  calendarSection: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDaysContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dayCard: {
    width: 70,
    height: 90,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  dayDate: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dayDateSelected: {
    color: colors.textLight,
  },
  dayNum: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  dayNumSelected: {
    color: colors.textLight,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  progressPercentage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  progressPercentageText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    lineHeight: fontSizes.lg * 1.2,
    textAlignVertical: 'center',
  },
  progressBarContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressHint: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activitiesSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  activitiesList: {
    gap: spacing.sm,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  activityCardFailed: {
    opacity: 0.7,
  },
  activityIndicator: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  activityTitleFailed: {
    color: colors.error,
  },
  activityTime: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  activityStatusIcon: {
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  goalsSection: {
    paddingHorizontal: spacing.lg,
  },
  goalsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  goalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  goalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalValue: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  goalLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  templatesScroll: {
    maxHeight: '60%',
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: 0,
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  quickAddOption: {
    flexBasis: '30%',
    minHeight: 110,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  quickAddIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickAddLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickAddDuration: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: 2,
  },
  customActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryPale,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  customActivityButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  customForm: {
    paddingHorizontal: 0,
    paddingBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  addButtonGradient: {
    padding: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  detailModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    margin: spacing.lg,
    marginTop: 'auto',
    marginBottom: 'auto',
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  detailHeader: {
    padding: spacing.xl,
    alignItems: 'center',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
  },
  detailTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  detailTime: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  detailActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  deleteButton: {
    backgroundColor: `${colors.error}10`,
  },
  detailActionText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  closeDetailButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  closeDetailText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
});
