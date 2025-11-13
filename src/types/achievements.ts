export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_color: string;
  criteria: AchievementCriteria;
  points: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement: Achievement;
}

export interface AchievementCriteria {
  type: 'activity_count' | 'streak' | 'water_intake' | 'meal_log' | 'weight_goal' | 'steps' | 'workout_minutes';
  target_value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  activity_type?: string;
}

export interface AchievementProgress {
  achievement: Achievement;
  current_value: number;
  target_value: number;
  progress_percentage: number;
  is_earned: boolean;
  earned_at?: string;
}

export const ACHIEVEMENT_CATEGORIES = {
  FITNESS: 'fitness',
  NUTRITION: 'nutrition',
  CONSISTENCY: 'consistency',
  MILESTONES: 'milestones',
  SOCIAL: 'social'
} as const;

export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[keyof typeof ACHIEVEMENT_CATEGORIES];

// Predefined achievements
export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id' | 'created_at'>[] = [
  {
    name: "First Steps",
    description: "Complete your first workout activity",
    icon: "👟",
    badge_color: "#6FCF97",
    criteria: {
      type: 'activity_count',
      target_value: 1,
      timeframe: 'all_time',
      activity_type: 'workout'
    },
    points: 10
  },
  {
    name: "Hydration Hero",
    description: "Drink 8 glasses of water in a day",
    icon: "💧",
    badge_color: "#64C8FF",
    criteria: {
      type: 'water_intake',
      target_value: 2000, // 8 glasses = 2000ml
      timeframe: 'daily'
    },
    points: 15
  },
  {
    name: "Weekly Warrior",
    description: "Complete 5 workouts in a week",
    icon: "🔥",
    badge_color: "#FFB085",
    criteria: {
      type: 'activity_count',
      target_value: 5,
      timeframe: 'weekly',
      activity_type: 'workout'
    },
    points: 25
  },
  {
    name: "Streak Master",
    description: "Log activities for 7 consecutive days",
    icon: "⚡",
    badge_color: "#FFD97D",
    criteria: {
      type: 'streak',
      target_value: 7,
      timeframe: 'daily'
    },
    points: 30
  },
  {
    name: "Nutrition Expert",
    description: "Log 30 meals",
    icon: "🥗",
    badge_color: "#7BDCB5",
    criteria: {
      type: 'meal_log',
      target_value: 30,
      timeframe: 'all_time'
    },
    points: 20
  },
  {
    name: "Step Counter",
    description: "Take 10,000 steps in a day",
    icon: "👣",
    badge_color: "#9B87F5",
    criteria: {
      type: 'steps',
      target_value: 10000,
      timeframe: 'daily'
    },
    points: 20
  },
  {
    name: "Workout Warrior",
    description: "Complete 60 minutes of workouts in a day",
    icon: "💪",
    badge_color: "#FF8A94",
    criteria: {
      type: 'workout_minutes',
      target_value: 60,
      timeframe: 'daily'
    },
    points: 25
  }
];