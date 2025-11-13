import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BackgroundDecorations, CoachBottomNavigation } from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useCoachRequests } from '../hooks/useCoachRequests';
import { supabase } from '../lib/supabase';

interface CoachDashboardScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

interface ClientData {
  user_id: string;
  full_name: string;
  email: string;
  age: number | null;
  fitness_level: string;
  assigned_at: string;
  last_activity: string | null;
  weekly_workouts: number;
  weekly_goal: number;
}

export const CoachDashboardScreen: React.FC<CoachDashboardScreenProps> = ({ onNavigate }) => {
  const { user, signOut, coachData } = useAuth();
  const { getPendingRequestsCount, loadCoachRequests } = useCoachRequests();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeToday: 0,
    needsAttention: 0,
  });

  useEffect(() => {
    if (coachData) {
      loadClients();
      loadCoachRequests(); // Load pending requests
    }
  }, [coachData]);

  const loadClients = async () => {
    if (!coachData) {
      console.log('[CoachDashboard] ⚠️ No coach data available');
      return;
    }

    console.log('[CoachDashboard] Loading clients for coach:', {
      coachId: coachData.id,
      coachName: coachData.full_name
    });

    try {
      setLoading(true);

      console.log('[CoachDashboard] Querying coach_client_assignments...');
      const { data: assignments, error: assignError } = await supabase
        .from('coach_client_assignments')
        .select('client_user_id, assigned_at, notes')
        .eq('coach_id', coachData.id)
        .eq('is_active', true);

      console.log('[CoachDashboard] Assignments query result:', {
        count: assignments?.length || 0,
        assignments,
        error: assignError
      });

      if (assignError) throw assignError;

      if (!assignments || assignments.length === 0) {
        console.log('[CoachDashboard] No active assignments found');
        setClients([]);
        setStats({ totalClients: 0, activeToday: 0, needsAttention: 0 });
        return;
      }

      const clientIds = assignments.map(a => a.client_user_id);
      console.log('[CoachDashboard] Fetching profiles for client IDs:', clientIds);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', clientIds);

      console.log('[CoachDashboard] Profiles query result:', {
        count: profiles?.length || 0,
        error: profileError
      });

      if (profileError) throw profileError;

      console.log('[CoachDashboard] Fetching weekly goals...');
      const { data: weeklyGoals, error: goalsError } = await supabase
        .from('weekly_goals')
        .select('*')
        .in('user_id', clientIds);

      console.log('[CoachDashboard] Weekly goals query result:', {
        count: weeklyGoals?.length || 0,
        error: goalsError
      });

      if (goalsError) throw goalsError;

      const clientsData: ClientData[] = assignments.map(assignment => {
        const profile = profiles?.find(p => p.user_id === assignment.client_user_id);
        const goals = weeklyGoals?.find(g => g.user_id === assignment.client_user_id);

        return {
          user_id: assignment.client_user_id,
          full_name: profile?.full_name || 'Unknown Client',
          email: '',
          age: profile?.age || null,
          fitness_level: profile?.fitness_level || 'beginner',
          assigned_at: assignment.assigned_at,
          last_activity: null,
          weekly_workouts: goals?.workouts_current || 0,
          weekly_goal: goals?.workouts_goal || 0,
        };
      });

      console.log('[CoachDashboard] ✅ Loaded clients:', {
        count: clientsData.length,
        clients: clientsData.map(c => ({ id: c.user_id, name: c.full_name }))
      });

      setClients(clientsData);

      const { data: allCoaches } = await supabase
        .from('coaches')
        .select('user_id')
        .eq('is_active', true);
      
      const coachUserIds = new Set(allCoaches?.map(c => c.user_id) || []);
      
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id');
      
      const totalPotentialClients = allProfiles?.filter(p => !coachUserIds.has(p.user_id)).length || 0;
      const unassignedClients = totalPotentialClients - clientsData.length;

      const today = new Date().toISOString().split('T')[0];
      setStats({
        totalClients: clientsData.length,
        activeToday: clientsData.filter(c => c.weekly_workouts > 0).length,
        needsAttention: unassignedClients,
      });

    } catch (error) {
      console.error('[CoachDashboard] ❌ Error loading clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleLogout = () => {
    signOut();
  };

  const handleAssignClient = async () => {
    if (onNavigate) {
      onNavigate('assign-client');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Coach Portal</Text>
          <Text style={styles.headerTitle}>{coachData?.full_name || 'Coach'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
            style={styles.statCard}
          >
            <MaterialIcons name="people" size={32} color={colors.textLight} />
            <Text style={styles.statValue}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
          </LinearGradient>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <MaterialIcons name="fitness-center" size={32} color={colors.success} />
            <Text style={[styles.statValue, styles.statValueDark]}>{stats.activeToday}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Active Today</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWhite]}>
            <MaterialIcons name="warning" size={32} color={colors.warning} />
            <Text style={[styles.statValue, styles.statValueDark]}>{stats.needsAttention}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Needs Attention</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Clients</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.requestsButton}
              onPress={() => onNavigate?.('coach-requests')}
            >
              <MaterialIcons name="inbox" size={20} color={colors.primary} />
              {getPendingRequestsCount() > 0 && (
                <View style={styles.requestsBadge}>
                  <Text style={styles.requestsBadgeText}>{getPendingRequestsCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAssignClient}
            >
              <MaterialIcons name="person-add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Clients Yet</Text>
            <Text style={styles.emptyStateText}>
              Clients will appear here when they are assigned to you.
            </Text>
          </View>
        ) : (
          <View style={styles.clientsList}>
            {clients.map((client) => (
              <TouchableOpacity
                key={client.user_id}
                style={styles.clientCard}
                onPress={() => onNavigate?.('coach-client-detail', { clientId: client.user_id })}
              >
                <View style={styles.clientCardLeft}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight] as [string, string, ...string[]]}
                    style={styles.clientAvatar}
                  >
                    <Text style={styles.clientAvatarText}>
                      {client.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    <View style={styles.clientMeta}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {client.fitness_level.charAt(0).toUpperCase() + client.fitness_level.slice(1)}
                        </Text>
                      </View>
                      {client.age && (
                        <Text style={styles.clientAge}>{client.age} years</Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.clientCardRight}>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                      {client.weekly_workouts}/{client.weekly_goal}
                    </Text>
                    <Text style={styles.progressLabel}>Workouts</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      
      <CoachBottomNavigation 
        activeTab="coach-dashboard" 
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
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...shadows.md,
  },
  statCardWhite: {
    backgroundColor: colors.surface,
  },
  statValue: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  statValueDark: {
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statLabelDark: {
    color: colors.textSecondary,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  requestsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    position: 'relative',
  },
  requestsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  requestsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  clientsList: {
    gap: spacing.md,
  },
  clientCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  clientCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textLight,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSizes.md,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  clientAge: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  clientCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  progressLabel: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
});
