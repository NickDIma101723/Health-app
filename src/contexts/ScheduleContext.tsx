import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ActivityStatus = 'incomplete' | 'completed' | 'failed';

export type ActivityType = 'workout' | 'meal' | 'mindfulness' | 'appointment' | 'habit' | 'custom';

export interface Activity {
  id: string;
  title: string;
  description?: string;
  time: string;
  duration: number;
  type: ActivityType;
  color: string;
  icon: string;
  status: ActivityStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    endDate?: string;
  };
  tags?: string[];
  notes?: string;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  description?: string;
  duration: number;
  type: ActivityType;
  color: string;
  icon: string;
  defaultTime?: string;
}

export interface WeeklyGoals {
  workouts: { current: number; target: number };
  meals: { current: number; target: number };
  meditation: { current: number; target: number };
  habits: { current: number; target: number };
}

interface ScheduleContextType {
  activities: Activity[];
  templates: ActivityTemplate[];
  weeklyGoals: WeeklyGoals;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  toggleActivityStatus: (id: string) => void;
  getActivitiesForDate: (date: string) => Activity[];
  getWeekActivities: (startDate: string) => Activity[];
  updateWeeklyGoals: (goals: Partial<WeeklyGoals>) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const defaultTemplates: ActivityTemplate[] = [
  {
    id: 'template-1',
    title: 'Morning Run',
    description: 'Start your day with a refreshing run',
    duration: 30,
    type: 'workout',
    color: '#6FCF97',
    icon: 'directions-run',
    defaultTime: '07:00',
  },
  {
    id: 'template-2',
    title: 'Yoga Session',
    description: 'Gentle stretching and flexibility',
    duration: 45,
    type: 'workout',
    color: '#9B59B6',
    icon: 'self-improvement',
    defaultTime: '12:00',
  },
  {
    id: 'template-3',
    title: 'Morning Meditation',
    description: 'Mindful breathing and reflection',
    duration: 15,
    type: 'mindfulness',
    color: '#9B59B6',
    icon: 'spa',
    defaultTime: '06:30',
  },
  {
    id: 'template-4',
    title: 'Healthy Breakfast',
    description: 'Nutritious meal to fuel your day',
    duration: 20,
    type: 'meal',
    color: '#F39C12',
    icon: 'restaurant',
    defaultTime: '08:00',
  },
  {
    id: 'template-5',
    title: 'Lunch',
    description: 'Balanced midday meal',
    duration: 30,
    type: 'meal',
    color: '#F39C12',
    icon: 'lunch-dining',
    defaultTime: '13:00',
  },
  {
    id: 'template-6',
    title: 'Dinner',
    description: 'Evening meal',
    duration: 30,
    type: 'meal',
    color: '#F39C12',
    icon: 'dinner-dining',
    defaultTime: '19:00',
  },
  {
    id: 'template-7',
    title: 'Coach Check-in',
    description: 'Virtual session with your coach',
    duration: 30,
    type: 'appointment',
    color: '#3498DB',
    icon: 'video-call',
    defaultTime: '15:00',
  },
  {
    id: 'template-8',
    title: 'Water Intake',
    description: 'Stay hydrated',
    duration: 5,
    type: 'habit',
    color: '#3498DB',
    icon: 'local-drink',
    defaultTime: '10:00',
  },
  {
    id: 'template-9',
    title: 'Evening Walk',
    description: 'Light cardio before bed',
    duration: 20,
    type: 'workout',
    color: '#6FCF97',
    icon: 'directions-walk',
    defaultTime: '20:00',
  },
  {
    id: 'template-10',
    title: 'Strength Training',
    description: 'Build muscle and strength',
    duration: 60,
    type: 'workout',
    color: '#6FCF97',
    icon: 'fitness-center',
    defaultTime: '17:00',
  },
];

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getInitialActivities = (): Activity[] => {
  const today = formatDate(new Date());
  const now = new Date().toISOString();

  return [
    {
      id: '1',
      title: 'Morning Run',
      time: '07:00',
      duration: 30,
      type: 'workout',
      color: '#6FCF97',
      icon: 'directions-run',
      status: 'completed',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '2',
      title: 'Healthy Breakfast',
      time: '08:00',
      duration: 20,
      type: 'meal',
      color: '#F39C12',
      icon: 'restaurant',
      status: 'completed',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '3',
      title: 'Yoga Session',
      time: '12:00',
      duration: 45,
      type: 'workout',
      color: '#9B59B6',
      icon: 'self-improvement',
      status: 'incomplete',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '4',
      title: 'Lunch',
      time: '13:00',
      duration: 30,
      type: 'meal',
      color: '#F39C12',
      icon: 'lunch-dining',
      status: 'incomplete',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '5',
      title: 'Coach Check-in',
      time: '15:00',
      duration: 30,
      type: 'appointment',
      color: '#3498DB',
      icon: 'video-call',
      status: 'incomplete',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '6',
      title: 'Evening Meditation',
      time: '19:00',
      duration: 15,
      type: 'mindfulness',
      color: '#9B59B6',
      icon: 'spa',
      status: 'incomplete',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '7',
      title: 'Dinner',
      time: '19:30',
      duration: 30,
      type: 'meal',
      color: '#F39C12',
      icon: 'dinner-dining',
      status: 'incomplete',
      date: today,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const ScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>(getInitialActivities());
  const [templates] = useState<ActivityTemplate[]>(defaultTemplates);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoals>({
    workouts: { current: 5, target: 7 },
    meals: { current: 12, target: 21 },
    meditation: { current: 6, target: 7 },
    habits: { current: 8, target: 14 },
  });

  const addActivity = (activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    setActivities(prev => [...prev, newActivity]);
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === id
          ? { ...activity, ...updates, updatedAt: new Date().toISOString() }
          : activity
      )
    );
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
  };

  const toggleActivityStatus = (id: string) => {
    setActivities(prev =>
      prev.map(activity => {
        if (activity.id === id) {
          let newStatus: ActivityStatus;
          if (activity.status === 'incomplete') {
            newStatus = 'completed';
          } else if (activity.status === 'completed') {
            newStatus = 'failed';
          } else {
            newStatus = 'incomplete';
          }
          return {
            ...activity,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return activity;
      })
    );
  };

  const getActivitiesForDate = (date: string): Activity[] => {
    return activities
      .filter(activity => activity.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getWeekActivities = (startDate: string): Activity[] => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= start && activityDate < end;
    });
  };

  const updateWeeklyGoals = (goals: Partial<WeeklyGoals>) => {
    setWeeklyGoals(prev => ({ ...prev, ...goals }));
  };

  const value: ScheduleContextType = {
    activities,
    templates,
    weeklyGoals,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleActivityStatus,
    getActivitiesForDate,
    getWeekActivities,
    updateWeeklyGoals,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
