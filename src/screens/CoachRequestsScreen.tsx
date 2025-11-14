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
    error,
    processingRequests,
    acceptRequest, 
    rejectRequest, 
    loadCoachRequests,
    getPendingRequestsCount 
  } = useCoachRequests();
  
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'accept' | 'decline' | null;
    requestId: string | null;
    clientName: string | null;
  }>({ visible: false, type: null, requestId: null, clientName: null });

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
    
    // Show confirmation modal
    setConfirmModal({
      visible: true,
      type: 'accept',
      requestId,
      clientName,
    });
  };

  const confirmAcceptRequest = async () => {
    const { requestId, clientName } = confirmModal;
    if (!requestId || !clientName) return;
    
    setConfirmModal({ visible: false, type: null, requestId: null, clientName: null });
    
    try {
      console.log('[CoachRequestsScreen] 🟢 Processing accept request...');
      
      const result = await acceptRequest(requestId);
      console.log('[CoachRequestsScreen] 🟢 Accept result:', result);
      
      if (result.error) {
        console.error('[CoachRequestsScreen] 🟢 Accept failed:', result.error);
        Alert.alert(
          'Failed to Accept Request',
          result.error,
          [
            { text: 'Try Again', onPress: () => handleAcceptRequest(requestId, clientName) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        console.log('[CoachRequestsScreen] 🟢 Accept succeeded! Client is now assigned.');
        Alert.alert(
          'Request Accepted! 🎉',
          `${clientName} is now your client. You can start chatting with them and managing their progress.`,
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
            },
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('[CoachRequestsScreen] 🟢 Accept exception:', error);
      Alert.alert(
        'Unexpected Error',
        'An unexpected error occurred. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleAcceptRequest(requestId, clientName) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleRejectRequest = async (requestId: string, clientName: string) => {
    console.log('[CoachRequestsScreen] 🔴 Decline button pressed for:', { requestId, clientName });
    
    // Show confirmation modal
    setConfirmModal({
      visible: true,
      type: 'decline',
      requestId,
      clientName,
    });
  };

  const confirmRejectRequest = async () => {
    const { requestId, clientName } = confirmModal;
    if (!requestId || !clientName) return;
    
    setConfirmModal({ visible: false, type: null, requestId: null, clientName: null });
    
    try {
      console.log('[CoachRequestsScreen] 🔴 Processing decline request...');
      
      const result = await rejectRequest(requestId);
      console.log('[CoachRequestsScreen] 🔴 Decline result:', result);
      
      if (result.error) {
        console.error('[CoachRequestsScreen] 🔴 Decline failed:', result.error);
        Alert.alert(
          'Failed to Decline Request',
          result.error,
          [
            { text: 'Try Again', onPress: () => handleRejectRequest(requestId, clientName) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        console.log('[CoachRequestsScreen] 🔴 Decline succeeded!');
        Alert.alert(
          'Request Declined',
          `${clientName}'s request has been declined. They have been notified.`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('[CoachRequestsScreen] 🔴 Decline exception:', error);
      Alert.alert(
        'Unexpected Error',
        'An unexpected error occurred. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleRejectRequest(requestId, clientName) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
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
            style={[styles.actionButton, styles.rejectButton, processingRequests.has(request.id) && styles.disabledButton]}
            onPress={() => {
              console.log('[CoachRequestsScreen] Decline button pressed');
              handleRejectRequest(request.id, request.client_profile?.full_name || 'Client');
            }}
            disabled={processingRequests.has(request.id)}
            activeOpacity={0.7}
          >
            {processingRequests.has(request.id) ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <MaterialIcons name="close" size={18} color={colors.error} />
                <Text style={styles.rejectButtonText}>Decline</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, processingRequests.has(request.id) && styles.disabledButton]}
            onPress={() => {
              console.log('[CoachRequestsScreen] Accept button pressed');
              handleAcceptRequest(request.id, request.client_profile?.full_name || 'Client');
            }}
            disabled={processingRequests.has(request.id)}
            activeOpacity={0.7}
          >
            {processingRequests.has(request.id) ? (
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
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Confirmation Modal */}
      {confirmModal.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {confirmModal.type === 'accept' ? 'Accept Coaching Request' : 'Decline Coaching Request'}
            </Text>
            <Text style={styles.modalMessage}>
              {confirmModal.type === 'accept'
                ? `Are you sure you want to accept ${confirmModal.clientName}'s coaching request? This will add them as your client and they will be able to message you.`
                : `Are you sure you want to decline ${confirmModal.clientName}'s coaching request? They will be notified of your decision.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setConfirmModal({ visible: false, type: null, requestId: null, clientName: null })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, confirmModal.type === 'accept' ? styles.modalAcceptButton : styles.modalDeclineButton]}
                onPress={confirmModal.type === 'accept' ? confirmAcceptRequest : confirmRejectRequest}
              >
                <Text style={styles.modalConfirmText}>
                  {confirmModal.type === 'accept' ? 'Accept' : 'Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  errorText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.error,
    fontFamily: 'Quicksand_500Medium',
    marginLeft: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
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
  disabledButton: {
    opacity: 0.6,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    maxWidth: 400,
    width: '90%',
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalAcceptButton: {
    backgroundColor: colors.primary,
  },
  modalDeclineButton: {
    backgroundColor: colors.error,
  },
  modalCancelText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  modalConfirmText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
    fontFamily: 'Quicksand_600SemiBold',
  },
});