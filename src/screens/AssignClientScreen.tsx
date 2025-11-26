import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { BackgroundDecorations } from '../components';

interface ClientUser {
  user_id: string;
  full_name: string | null;
  bio: string | null;
  fitness_level: string | null;
  goals: string | null;
  created_at: string;
  isAssigned?: boolean;
}

interface ManageClientsScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

export const AssignClientScreen: React.FC<ManageClientsScreenProps> = ({ onNavigate }) => {
  const { coachData } = useAuth();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAcceptedClients();
  }, []);

  const loadAcceptedClients = async () => {
    try {
      setLoading(true);
      console.log('[ManageClients] 🔍 Loading accepted clients...');

      if (!coachData?.id) {
        console.log('[ManageClients] ⚠️ No coach data available');
        setClients([]);
        return;
      }

      
      console.log('[ManageClients] � Fetching assigned clients for coach:', coachData.id);
      const { data: assignments, error: assignmentsError } = await supabase
        .from('coach_client_assignments')
        .select('client_user_id, assigned_at')
        .eq('coach_id', coachData.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('[ManageClients] ❌ Error loading assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('[ManageClients] ✅ Found', assignments?.length || 0, 'assigned clients');
      
      if (!assignments || assignments.length === 0) {
        console.log('[ManageClients] ℹ️ No clients assigned to this coach');
        setClients([]);
        return;
      }

      
      const clientIds = assignments.map(a => a.client_user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, bio, fitness_level, goals, age, height, weight, phone, created_at')
        .in('user_id', clientIds);

      if (profileError) {
        console.error('[ManageClients] ❌ Error loading profiles:', profileError);
        throw profileError;
      }

      
      const clientsData = (assignments || [])
        .map(assignment => {
          const profile = profiles?.find(p => p.user_id === assignment.client_user_id);
          
          return {
            user_id: assignment.client_user_id,
            full_name: profile?.full_name || 'Unknown Client',
            bio: profile?.bio || null,
            fitness_level: profile?.fitness_level || null,
            goals: profile?.goals || null,
            created_at: profile?.created_at || assignment.assigned_at,
            isAssigned: true, 
          };
        })
        .filter(client => client !== null) as ClientUser[];

      console.log('[ManageClients] ✅ Processed client data:', clientsData.length, 'clients');
      clientsData.forEach((client, index) => {
        console.log(`[ManageClients] Client ${index + 1}: ${client.full_name || 'No Name'} (Level: ${client.fitness_level || 'Not set'})`);
      });
      
      setClients(clientsData);
    } catch (error) {
      console.error('[ManageClients] ❌ Error loading clients:', error);
      Alert.alert(
        'Error Loading Clients', 
        `Failed to load your clients: ${(error as any)?.message || 'Unknown error'}\n\nPlease check the console for details.`
      );
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClientProfile = (client: ClientUser) => {
    onNavigate?.('coach-client-detail', { clientId: client.user_id });
  };

  const handleMessageClient = (client: ClientUser) => {
    onNavigate?.('chat', { clientId: client.user_id });
  };

  const handleRemoveClient = async (client: ClientUser) => {
    if (!coachData) return;

    Alert.alert(
      'Remove Client',
      `Remove ${client.full_name || 'this user'} from your client list? This will end your coaching relationship.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('coach_client_assignments')
                .update({ is_active: false })
                .eq('coach_id', coachData.id)
                .eq('client_user_id', client.user_id)
                .eq('is_active', true);

              if (error) throw error;

              Alert.alert('Success', `${client.full_name || 'Client'} has been removed from your list`);
              loadAcceptedClients();
            } catch (error) {
              console.error('[ManageClients] Error removing client:', error);
              Alert.alert('Error', 'Failed to remove client');
            }
          },
        },
      ]
    );
  };

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.full_name?.toLowerCase().includes(query) ||
      client.bio?.toLowerCase().includes(query) ||
      client.goals?.toLowerCase().includes(query)
    );
  });

    const renderClientItem = ({ item }: { item: ClientUser }) => (
    <TouchableOpacity
      key={item.user_id}
      style={[styles.clientCard]}
      onPress={() => handleViewClientProfile(item)}
    >
      <View style={styles.clientInfo}>
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{item.full_name || 'No Name'}</Text>
          <View style={styles.clientBadge}>
            <Ionicons name="person" size={14} color={colors.primary} />
            <Text style={styles.clientBadgeText}>Your Client</Text>
          </View>
        </View>
        
        {item.fitness_level && (
          <View style={styles.clientMetrics}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricText}>{item.fitness_level} level</Text>
            </View>
          </View>
        )}
        
        {item.goals && (
          <Text style={styles.goals} numberOfLines={2}>
            <Text style={styles.goalsLabel}>Goals: </Text>
            {item.goals}
          </Text>
        )}
        
        {item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}

        <View style={styles.clientActions}>
          <TouchableOpacity 
            style={styles.actionButtonSmall}
            onPress={() => handleMessageClient(item)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButtonSmall, styles.actionButtonSecondary]}
            onPress={() => handleRemoveClient(item)}
          >
            <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate?.('coach-dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerSubtitle}>Coach Portal</Text>
          <Text style={styles.headerTitle}>Manage Clients</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={loadAcceptedClients}
        >
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <FlatList
            data={filteredClients}
            renderItem={renderClientItem}
            keyExtractor={item => item.user_id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No clients match your search' : 'No users found'}
                </Text>
                {!searchQuery && (
                  <View style={styles.emptyHelpContainer}>
                    <Text style={styles.emptySubtext}>To see clients here:</Text>
                    <Text style={styles.emptyHelpText}>1. Users need to register accounts</Text>
                    <Text style={styles.emptyHelpText}>2. They must complete profile setup</Text>
                    <Text style={styles.emptyHelpText}>3. Email verification may be required</Text>
                    <TouchableOpacity 
                      style={styles.refreshButton}
                      onPress={loadAcceptedClients}
                    >
                      <Ionicons name="refresh" size={20} color={colors.primary} />
                      <Text style={styles.refreshText}>Refresh List</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {searchQuery && (
                  <Text style={styles.emptySubtext}>Try adjusting your search</Text>
                )}
              </View>
            }
          />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerRefreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  clientCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  assignedCard: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
  },
  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  clientBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  clientMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metricBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  metricText: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  goalsLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  actionButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  actionButtonSecondary: {
    backgroundColor: colors.error + '15',
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: colors.error,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  clientInfo: {
    flex: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clientName: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  goals: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  bio: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyHelpContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emptyHelpText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
