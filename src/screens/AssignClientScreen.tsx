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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

interface ClientUser {
  user_id: string;
  full_name: string | null;
  bio: string | null;
  fitness_level: string | null;
  goals: string | null;
  created_at: string;
  isAssigned?: boolean;
}

interface AssignClientScreenProps {
  onNavigate?: (screen: string) => void;
}

export const AssignClientScreen: React.FC<AssignClientScreenProps> = ({ onNavigate }) => {
  const { coachData } = useAuth();
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableClients();
  }, []);

  const loadAvailableClients = async () => {
    try {
      setLoading(true);
      console.log('[AssignClient] Loading available clients...');

      const { data: coaches, error: coachesError } = await supabase
        .from('coaches')
        .select('user_id')
        .eq('is_active', true);

      if (coachesError) {
        console.error('[AssignClient] Error loading coaches:', coachesError);
      }

      const coachUserIds = new Set(coaches?.map(c => c.user_id) || []);
      console.log('[AssignClient] Found', coachUserIds.size, 'coach user IDs to exclude:', Array.from(coachUserIds));

      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, bio, fitness_level, goals, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!allProfiles) {
        setClients([]);
        return;
      }

      console.log('[AssignClient] Found', allProfiles.length, 'total profiles:', allProfiles.map(p => ({ id: p.user_id, name: p.full_name })));

      const nonCoachProfiles = allProfiles.filter(profile => !coachUserIds.has(profile.user_id));
      console.log('[AssignClient] Filtered to', nonCoachProfiles.length, 'non-coach profiles:', nonCoachProfiles.map(p => ({ id: p.user_id, name: p.full_name })));

      const { data: assignments, error: assignmentsError } = await supabase
        .from('coach_client_assignments')
        .select('client_user_id')
        .eq('coach_id', coachData?.id)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('[AssignClient] Error loading assignments:', assignmentsError);
      }

      const assignedUserIds = new Set(assignments?.map(a => a.client_user_id) || []);

      const clientsWithStatus = nonCoachProfiles.map(profile => ({
        ...profile,
        isAssigned: assignedUserIds.has(profile.user_id),
      }));

      console.log('[AssignClient] Loaded', clientsWithStatus.length, 'clients:', clientsWithStatus.map(c => ({ id: c.user_id, name: c.full_name, isAssigned: c.isAssigned })));
      setClients(clientsWithStatus);
    } catch (error) {
      console.error('[AssignClient] Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClient = async (client: ClientUser) => {
    if (!coachData) {
      Alert.alert('Error', 'Coach data not available');
      return;
    }

    if (client.isAssigned) {
      Alert.alert(
        'Already Assigned',
        'This client is already assigned to you. Go to your dashboard to view them.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Assign Client',
      `Assign ${client.full_name || 'this user'} to your client list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              setAssigning(client.user_id);
              console.log('[AssignClient] Assigning client:', client.user_id);

              const { error } = await supabase
                .from('coach_client_assignments')
                .insert({
                  coach_id: coachData.id,
                  client_user_id: client.user_id,
                  is_active: true,
                  assigned_at: new Date().toISOString(),
                  notes: 'Assigned from coach dashboard',
                });

              if (error) throw error;

              console.log('[AssignClient] ✅ Client assigned successfully');
              Alert.alert('Success', `${client.full_name || 'Client'} has been added to your client list!`);

              loadAvailableClients();
            } catch (error) {
              console.error('[AssignClient] Error assigning client:', error);
              Alert.alert('Error', 'Failed to assign client');
            } finally {
              setAssigning(null);
            }
          },
        },
      ]
    );
  };

  const handleUnassignClient = async (client: ClientUser) => {
    if (!coachData) return;

    Alert.alert(
      'Unassign Client',
      `Remove ${client.full_name || 'this user'} from your client list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssigning(client.user_id);

              const { error } = await supabase
                .from('coach_client_assignments')
                .update({ is_active: false })
                .eq('coach_id', coachData.id)
                .eq('client_user_id', client.user_id)
                .eq('is_active', true);

              if (error) throw error;

              Alert.alert('Success', `${client.full_name || 'Client'} has been removed from your list`);
              loadAvailableClients();
            } catch (error) {
              console.error('[AssignClient] Error unassigning client:', error);
              Alert.alert('Error', 'Failed to unassign client');
            } finally {
              setAssigning(null);
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
      style={[styles.clientCard, item.isAssigned && styles.assignedCard]}
      onPress={() => item.isAssigned ? handleUnassignClient(item) : handleAssignClient(item)}
      disabled={assigning === item.user_id}
    >
      <View style={styles.clientInfo}>
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{item.full_name || 'No Name'}</Text>
          {item.isAssigned && (
            <View style={styles.assignedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.assignedText}>Assigned</Text>
            </View>
          )}
        </View>
        
        {item.fitness_level && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.fitness_level}</Text>
          </View>
        )}
        
        {item.goals && (
          <Text style={styles.goals} numberOfLines={2}>
            Goals: {item.goals}
          </Text>
        )}
        
        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {item.bio}
          </Text>
        )}
      </View>

      <View style={styles.actionButton}>
        {assigning === item.user_id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={item.isAssigned ? 'remove-circle-outline' : 'add-circle-outline'}
            size={32}
            color={item.isAssigned ? colors.error : colors.primary}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate?.('coach-dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Clients</Text>
        <View style={styles.placeholder} />
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
              <Text style={styles.emptyText}>No clients found</Text>
              {searchQuery && (
                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  clientCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  assignedCard: {
    borderColor: colors.success,
    backgroundColor: '#f0fdf4',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
