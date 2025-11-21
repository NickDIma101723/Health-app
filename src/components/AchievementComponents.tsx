import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { Achievement, AchievementProgress } from '../types/achievements';

interface AchievementCardProps {
  progress: AchievementProgress;
  onPress?: () => void;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ 
  progress, 
  onPress 
}) => {
  const { achievement, current_value, target_value, progress_percentage, is_earned } = progress;

  const getIconColor = () => {
    if (is_earned) return colors.gold || '#FFD700';
    if (progress_percentage > 50) return colors.primary;
    return colors.textSecondary;
  };

  const getBadgeGradient = (): [string, string, ...string[]] => {
    if (is_earned) {
      return ['#FFD700', '#FFA500', '#FF8C00']; // Gold gradient
    } else if (progress_percentage > 75) {
      return [colors.primary, colors.secondary]; // Close to completion
    } else {
      return [colors.border || '#E5E5E5', colors.textSecondary]; // Not close
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.cardContainer}>
      <LinearGradient
        colors={getBadgeGradient()}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={achievement.icon as any} 
            size={32} 
            color={is_earned ? colors.textLight : colors.textPrimary} 
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[
            styles.title, 
            { color: is_earned ? colors.textLight : colors.textPrimary }
          ]}>
            {achievement.name}
          </Text>
          
          <Text style={[
            styles.description,
            { color: is_earned ? colors.textLight : colors.textSecondary }
          ]}>
            {achievement.description}
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress_percentage}%`,
                    backgroundColor: is_earned ? colors.textLight : colors.primary
                  }
                ]} 
              />
            </View>
            
            <Text style={[
              styles.progressText,
              { color: is_earned ? colors.textLight : colors.textPrimary }
            ]}>
              {current_value}/{target_value}
            </Text>
          </View>

          <View style={styles.pointsContainer}>
            <MaterialIcons 
              name="stars" 
              size={16} 
              color={is_earned ? colors.textLight : colors.textSecondary} 
            />
            <Text style={[
              styles.points,
              { color: is_earned ? colors.textLight : colors.textSecondary }
            ]}>
              {achievement.points} points
            </Text>
          </View>
        </View>

        {is_earned && (
          <View style={styles.earnedBadge}>
            <MaterialIcons name="check-circle" size={20} color={colors.textLight} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

interface AchievementGridProps {
  achievementProgress: AchievementProgress[];
  onAchievementPress?: (achievement: Achievement) => void;
}

export const AchievementGrid: React.FC<AchievementGridProps> = ({
  achievementProgress,
  onAchievementPress
}) => {
  const earnedAchievements = achievementProgress.filter(p => p.is_earned);
  const inProgressAchievements = achievementProgress
    .filter(p => !p.is_earned)
    .sort((a, b) => b.progress_percentage - a.progress_percentage);

  return (
    <ScrollView style={styles.gridContainer} showsVerticalScrollIndicator={false}>
      {earnedAchievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Earned Achievements</Text>
          <View style={styles.grid}>
            {earnedAchievements.map((progress) => (
              <AchievementCard
                key={progress.achievement.id}
                progress={progress}
                onPress={() => onAchievementPress?.(progress.achievement)}
              />
            ))}
          </View>
        </View>
      )}

      {inProgressAchievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 In Progress</Text>
          <View style={styles.grid}>
            {inProgressAchievements.map((progress) => (
              <AchievementCard
                key={progress.achievement.id}
                progress={progress}
                onPress={() => onAchievementPress?.(progress.achievement)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

interface AchievementSummaryProps {
  achievementProgress: AchievementProgress[];
}

export const AchievementSummary: React.FC<AchievementSummaryProps> = ({
  achievementProgress
}) => {
  const earnedCount = achievementProgress.filter(p => p.is_earned).length;
  const totalPoints = achievementProgress
    .filter(p => p.is_earned)
    .reduce((sum, p) => sum + p.achievement.points, 0);

  return (
    <View style={styles.summaryContainer}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.summaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.summaryItem}>
          <MaterialIcons name="emoji-events" size={24} color={colors.textLight} />
          <Text style={styles.summaryNumber}>{earnedCount}</Text>
          <Text style={styles.summaryLabel}>Achievements</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <MaterialIcons name="stars" size={24} color={colors.textLight} />
          <Text style={styles.summaryNumber}>{totalPoints}</Text>
          <Text style={styles.summaryLabel}>Total Points</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  card: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 100,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  earnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  grid: {
    gap: 12,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textLight,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
    opacity: 0.9,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
});