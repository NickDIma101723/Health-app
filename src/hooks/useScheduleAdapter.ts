import { useActivities } from './useActivities';
import { Activity as ContextActivity, ActivityTemplate as ContextTemplate, WeeklyGoals as ContextGoals, ActivityStatus, ActivityType } from '../contexts/ScheduleContext';
import { Database } from '../types/database.types';

type DBActivity = Database['public']['Tables']['activities']['Row'];
type DBTemplate = Database['public']['Tables']['activity_templates']['Row'];
type DBWeeklyGoals = Database['public']['Tables']['weekly_goals']['Row'];

export const useScheduleAdapter = () => {
  const {
    activities: dbActivities,
    templates: dbTemplates,
    weeklyGoals: dbWeeklyGoals,
    loading,
    error,
    addActivity: dbAddActivity,
    updateActivity: dbUpdateActivity,
    deleteActivity: dbDeleteActivity,
    toggleActivityStatus: dbToggleActivityStatus,
    getActivitiesForDate: dbGetActivitiesForDate,
    getActivitiesForWeek: dbGetActivitiesForWeek,
    updateWeeklyGoals: dbUpdateWeeklyGoals,
    refetch,
  } = useActivities();

  const convertActivity = (dbActivity: DBActivity): ContextActivity => ({
    id: dbActivity.id,
    title: dbActivity.title,
    description: dbActivity.description || undefined,
    time: dbActivity.time,
    duration: dbActivity.duration,
    type: dbActivity.activity_type as ActivityType,
    color: dbActivity.color,
    icon: dbActivity.icon,
    status: dbActivity.status as ActivityStatus,
    date: dbActivity.date,
    createdAt: dbActivity.created_at,
    updatedAt: dbActivity.updated_at,
    userId: dbActivity.user_id,
    tags: dbActivity.tags || undefined,
  });

  const convertTemplate = (dbTemplate: DBTemplate): ContextTemplate => {
    return {
      id: dbTemplate.id,
      title: dbTemplate.title,
      description: dbTemplate.description || undefined,
      duration: dbTemplate.duration,
      type: dbTemplate.type as ActivityType,
      color: dbTemplate.color,
      icon: dbTemplate.icon,
      defaultTime: dbTemplate.default_time || undefined,
    };
  };

  const convertWeeklyGoals = (dbGoals: DBWeeklyGoals | null): ContextGoals => {
    if (!dbGoals) {
      return {
        workouts: { current: 0, target: 3 },
        meals: { current: 0, target: 21 },
        meditation: { current: 0, target: 7 },
        habits: { current: 0, target: 7 },
      };
    }

    return {
      workouts: { current: dbGoals.workouts_current, target: dbGoals.workouts_target },
      meals: { current: dbGoals.meals_current, target: dbGoals.meals_target },
      meditation: { current: dbGoals.meditation_current, target: dbGoals.meditation_target },
      habits: { current: dbGoals.habits_current, target: dbGoals.habits_target },
    };
  };

  const activities = dbActivities.map(convertActivity);
  const uniqueTemplatesMap = new Map();
  dbTemplates.forEach(template => {
    if (!uniqueTemplatesMap.has(template.id)) {
      uniqueTemplatesMap.set(template.id, template);
    }
  });
  const templates = Array.from(uniqueTemplatesMap.values()).map(convertTemplate);
  const weeklyGoals = convertWeeklyGoals(dbWeeklyGoals);

  const addActivity = async (activity: Omit<ContextActivity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const insertData: any = {
      title: activity.title,
      time: activity.time,
      duration: activity.duration,
      activity_type: activity.type,
      color: activity.color,
      icon: activity.icon,
      status: activity.status,
      date: activity.date,
    };

    if (activity.description) insertData.description = activity.description;
    if (activity.tags) insertData.tags = activity.tags;

    const result = await dbAddActivity(insertData);
    return result;
  };

  const updateActivity = async (id: string, updates: Partial<ContextActivity>) => {
    const dbUpdates: any = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.type !== undefined) dbUpdates.activity_type = updates.type;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

    return await dbUpdateActivity(id, dbUpdates);
  };

  const deleteActivity = async (id: string) => {
    return await dbDeleteActivity(id);
  };

  const toggleActivityStatus = async (id: string) => {
    await dbToggleActivityStatus(id);
  };

  const getActivitiesForDate = (date: string): ContextActivity[] => {
    return dbGetActivitiesForDate(date).map(convertActivity);
  };

  const getWeekActivities = (startDate: string): ContextActivity[] => {
    return dbGetActivitiesForWeek(startDate).map(convertActivity);
  };

  const updateWeeklyGoals = async (goals: Partial<ContextGoals>) => {
    const dbUpdates: any = {};
    
    if (goals.workouts) {
      dbUpdates.workouts_current = goals.workouts.current;
      dbUpdates.workouts_target = goals.workouts.target;
    }
    if (goals.meals) {
      dbUpdates.meals_current = goals.meals.current;
      dbUpdates.meals_target = goals.meals.target;
    }
    if (goals.meditation) {
      dbUpdates.meditation_current = goals.meditation.current;
      dbUpdates.meditation_target = goals.meditation.target;
    }
    if (goals.habits) {
      dbUpdates.habits_current = goals.habits.current;
      dbUpdates.habits_target = goals.habits.target;
    }

    return await dbUpdateWeeklyGoals(dbUpdates);
  };

  return {
    activities,
    templates,
    weeklyGoals,
    loading,
    error,
    addActivity,
    updateActivity,
    deleteActivity,
    toggleActivityStatus,
    getActivitiesForDate,
    getWeekActivities,
    updateWeeklyGoals,
    refetch,
  };
};
