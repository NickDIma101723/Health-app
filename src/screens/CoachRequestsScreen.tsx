import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { BackgroundDecorations } from '../components';
import { useCoachRequests } from '../hooks/useCoachRequests';

interface CoachRequestsScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

export const CoachRequestsScreen: React.FC<CoachRequestsScreenProps> = ({ onNavigate }) => {
  const { 
    requests, 
    loading, 
    acceptRequest, 
    rejectRequest, 
    loadCoachRequests,
    getPendingRequestsCount 
  } = useCoachRequests();
  
  const [processing, setProcessing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('[CoachRequestsScreen] Loading coach requests...');
    loadCoachRequests();
  }, []);

  useEffect(() => {
    console.log('[CoachRequestsScreen] Requests state updated:', {
      requestsCount: requests.length,
      loading,
      requests: requests.map(r => ({ id: r.id, status: r.status, client: r.client_profile?.full_name }))
    });
  }, [requests, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCoachRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId: string, clientName: string) => {
    console.log('[CoachRequestsScreen] 🟢 Accept button pressed for:', { requestId, clientName });
    
    // For web compatibility, let's directly process the request
    console.log('[CoachRequestsScreen] 🟢 Processing accept request directly...');
    setProcessing(requestId);
    
    try {
      const result = await acceptRequest(requestId);
      console.log('[CoachRequestsScreen] 🟢 Accept result:', result);
      
      if (result.error) {
        console.error('[CoachRequestsScreen] 🟢 Accept failed:', result.error);
        Alert.alert('Error', result.error);
      } else {
        console.log('[CoachRequestsScreen] 🟢 Accept succeeded! Client is now assigned.');
        Alert.alert(
          'Success!',
          `${clientName} is now your client. You can start chatting with them and manage their progress.`,
          [
            { 
              text: 'View Clients',
              onPress: () => {
                console.log('[CoachRequestsScreen] 🟢 Navigating to manage clients');
                onNavigate?.('assign-client');
              }
            },
            { 
              text: 'Go to Chat',
              onPress: () => {
                console.log('[CoachRequestsScreen] 🟢 Navigating to chat list');
                onNavigate?.('chat');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('[CoachRequestsScreen] 🟢 Accept exception:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async (requestId: string, clientName: string) => {
    console.log('[CoachRequestsScreen] 🔴 Decline button pressed for:', { requestId, clientName });
    
    // For web compatibility, let's directly process the request  
    console.log('[CoachRequestsScreen] 🔴 Processing decline request directly...');
    setProcessing(requestId);
    
    try {
      const result = await rejectRequest(requestId);
      console.log('[CoachRequestsScreen] 🔴 Decline result:', result);
      
      if (result.error) {
        console.error('[CoachRequestsScreen] 🔴 Decline failed:', result.error);
        Alert.alert('Error', result.error);
      } else {
        console.log('[CoachRequestsScreen] 🔴 Decline succeeded!');
        Alert.alert(
          'Request Declined', 
          `${clientName}'s request has been declined.`,
          [{ 
            text: 'OK',
            onPress: () => {
              console.log('[CoachRequestsScreen] 🔴 Decline alert dismissed');
              // Refresh the requests list
              loadCoachRequests();
            }
          }]
        );
      }
    } catch (error) {
      console.error('[CoachRequestsScreen] 🔴 Decline exception:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setProcessing(null);
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderRequestCard = (request: any, isPending: boolean = true) => (
    <View key={request.id} style={[styles.requestCard, shadows.sm]}>
      <View style={styles.requestHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>
            {request.client_profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.clientName}>
            {request.client_profile?.full_name || 'Unknown Client'}
          </Text>
          <Text style={styles.requestDate}>{formatDate(request.requested_at)}</Text>
          {request.client_profile?.fitness_level && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{request.client_profile.fitness_level}</Text>
            </View>
          )}
        </View>
        {!isPending && (
          <View style={[styles.statusBadge, request.status === 'accepted' ? styles.acceptedBadge : styles.rejectedBadge]}>
            <MaterialIcons 
              name={request.status === 'accepted' ? 'check-circle' : 'cancel'} 
              size={16} 
              color={request.status === 'accepted' ? colors.success : colors.error} 
            />
            <Text style={[styles.statusText, request.status === 'accepted' ? styles.acceptedText : styles.rejectedText]}>
              {request.status === 'accepted' ? 'Accepted' : 'Declined'}
            </Text>
          </View>
        )}
      </View>

      {request.client_profile?.goals && (
        <Text style={styles.clientGoals} numberOfLines={2}>
          <Text style={styles.goalsLabel}>Goals: </Text>
          {request.client_profile.goals}
        </Text>
      )}

      {request.client_profile?.bio && (
        <Text style={styles.clientBio} numberOfLines={2}>
          {request.client_profile.bio}
        </Text>
      )}

      {request.message && (
        <View style={styles.messageContainer}>
          <MaterialIcons name="format-quote" size={16} color={colors.textSecondary} />
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      {isPending && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(request.id, request.client_profile?.full_name || 'Client')}
            disabled={processing === request.id}
          >
            {processing === request.id ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <MaterialIcons name="close" size={18} color={colors.error} />
                <Text style={styles.rejectButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(request.id, request.client_profile?.full_name || 'Client')}
            disabled={processing === request.id}
          >
            {processing === request.id ? (
              <ActivityIndicator size="small" color={colors.textLight} />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color={colors.textLight} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!isPending && request.responded_at && (
        <Text style={styles.responseDate}>
          Responded on {formatDate(request.responded_at)}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate?.('coach-dashboard')}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Client Requests</Text>
          {getPendingRequestsCount() > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{getPendingRequestsCount()}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={loading}>
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={loading ? colors.textSecondary : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <>
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="schedule" size={20} color={colors.warning} />
                  <Text style={styles.sectionTitle}>
                    Pending Requests ({pendingRequests.length})
                  </Text>
                </View>
                {pendingRequests.map(request => renderRequestCard(request, true))}
              </>
            )}

            {/* Recent Activity Section */}
            {processedRequests.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: pendingRequests.length > 0 ? spacing.xl : 0 }]}>
                  <MaterialIcons name="history" size={20} color={colors.textSecondary} />
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                {processedRequests.slice(0, 10).map(request => renderRequestCard(request, false))}
              </>
            )}

            {/* Empty State */}
            {requests.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inbox" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No Requests Yet</Text>
                <Text style={styles.emptyText}>
                  Client requests will appear here when users want you as their coach.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  pendingBadge: {
    backgroundColor: colors.warning,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: 'Poppins_700Bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  clientAvatarText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'Poppins_700Bold',
  },
  requestInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: spacing.xs,
  },
  requestDate: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.xs,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'Quicksand_600SemiBold',
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  acceptedBadge: {
    backgroundColor: colors.success + '20',
  },
  rejectedBadge: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Quicksand_600SemiBold',
  },
  acceptedText: {
    color: colors.success,
  },
  rejectedText: {
    color: colors.error,
  },
  clientGoals: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  goalsLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clientBio: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.sm,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryPale,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  messageText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  rejectButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
  },
  acceptButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
  rejectButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.error,
    fontFamily: 'Quicksand_600SemiBold',
  },
  responseDate: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 22,
  },
});