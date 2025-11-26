import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Achievement, UserAchievement, AchievementProgress, DEFAULT_ACHIEVEMENTS } from '../types/achievements';

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);

  
  const initializeAchievements = async () => {
    try {
      
      const { data: existingAchievements, error } = await supabase
        .from('achievements')
        .select('*');

      if (error) {
        console.error('Error fetching achievements:', error);
        return;
      }

      
      if (existingAchievements.length === 0) {
        const { error: insertError } = await supabase
          .from('achievements')
          .insert(DEFAULT_ACHIEVEMENTS);

        if (insertError) {
          console.error('Error creating default achievements:', insertError);
        }
      }

      
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });

      if (allAchievements) {
        setAchievements(allAchievements);
      }
    } catch (error) {
      console.error('Error initializing achievements:', error);
    }
  };

  
  const fetchUserAchievements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching user achievements:', error);
        return;
      }

      setUserAchievements(data || []);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    }
  };

  
  const checkAchievement = async (achievementId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  };

  
  const awardAchievement = async (achievementId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      
      const alreadyEarned = await checkAchievement(achievementId);
      if (alreadyEarned) return false;

      
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId
        });

      if (error) {
        console.error('Error awarding achievement:', error);
        return false;
      }

      
      await fetchUserAchievements();
      return true;
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return false;
    }
  };

  
  const calculateProgress = async () => {
    if (!user || achievements.length === 0) return;

    try {
      
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id);

      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id);

      const { data: waterIntakes } = await supabase
        .from('water_intake')
        .select('*')
        .eq('user_id', user.id);

      const progress: AchievementProgress[] = achievements.map(achievement => {
        const isEarned = userAchievements.some(ua => ua.achievement_id === achievement.id);
        const earnedAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
        
        let currentValue = 0;
        
        
        switch (achievement.criteria.type) {
          case 'activity_count':
            // Tel het aantal activiteiten van een bepaald type, of alle activiteiten als geen type is opgegeven
            if (achievement.criteria.activity_type) {
              currentValue = (activities || []).filter(a => 
                a.type === achievement.criteria.activity_type
              ).length;
            } else {
              currentValue = (activities || []).length;
            }
            break;
            
          case 'meal_log':
            // Gewoon tellen hoeveel maaltijden er zijn gelogd
            currentValue = (meals || []).length;
            break;
            
          case 'water_intake':
            // Bereken totale waterinname voor vandaag, of alles bij elkaar als het niet dagelijks is
            if (achievement.criteria.timeframe === 'daily') {
              const today = new Date().toISOString().split('T')[0];
              currentValue = (waterIntakes || [])
                .filter(w => w.date === today)
                .reduce((sum, w) => sum + w.amount, 0);
            } else {
              currentValue = (waterIntakes || [])
                .reduce((sum, w) => sum + w.amount, 0);
            }
            break;
            
          default:
            currentValue = 0;
        }

        const progressPercentage = Math.min((currentValue / achievement.criteria.target_value) * 100, 100);

        return {
          achievement,
          current_value: currentValue,
          target_value: achievement.criteria.target_value,
          progress_percentage: progressPercentage,
          is_earned: isEarned,
          earned_at: earnedAchievement?.earned_at
        };
      });

      setAchievementProgress(progress);

      
      for (const prog of progress) {
        if (!prog.is_earned && prog.current_value >= prog.target_value) {
          const awarded = await awardAchievement(prog.achievement.id);
          if (awarded) {
            
            
            console.log(`🎉 Achievement Unlocked: ${prog.achievement.name}!`);
          }
        }
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
    }
  };

  
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await initializeAchievements();
      if (user) {
        await fetchUserAchievements();
      }
      setLoading(false);
    };

    initialize();
  }, [user]);

  
  useEffect(() => {
    if (achievements.length > 0) {
      calculateProgress();
    }
  }, [achievements, userAchievements]);

  return {
    achievements,
    userAchievements,
    achievementProgress,
    loading,
    checkAchievement,
    awardAchievement,
    calculateProgress,
    fetchUserAchievements
  };
};