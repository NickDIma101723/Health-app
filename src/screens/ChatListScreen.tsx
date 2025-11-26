import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomNavigation,
  CoachBottomNavigation,
  BackgroundDecorations,
} from '../components';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useMessages, useCoaches } from '../hooks';
import { supabase } from '../lib/supabase';

interface ChatListScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
}

interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  avatar: string;
  avatar_url?: string | null;
  isOnline: boolean;
  unreadCount: number;
  isCoach: boolean;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ onNavigate }) => {
  const { user, currentMode, coachData, switchToCoachMode, switchToClientMode, canBeCoach } = useAuth();
  const { messages } = useMessages();
  const { coaches, myCoach } = useCoaches();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [coachClients, setCoachClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load coach clients if in coach mode
  const loadCoachClients = async () => {
    if (!coachData || currentMode !== 'coach') {
      setIsLoading(false);
      return;
    }

    if (isLoadingClients) return; // Prevent duplicate requests

    try {
      setIsLoadingClients(true);
      setIsLoading(true);
      console.log('[ChatList] Loading clients for coach:', coachData.id);
      
      // Get client assignments
      const { data: assignments, error: assignError } = await supabase
        .from('coach_client_assignments')
        .select('client_user_id, assigned_at')
        .eq('coach_id', coachData.id)
        .eq('is_active', true);

      if (assignError) {
        console.error('[ChatList] Error loading assignments:', assignError);
        return;
      }

      if (!assignments || assignments.length === 0) {
        console.log('[ChatList] No active client assignments found');
        setCoachClients([]);
        return;
      }

      // Get client profiles
      const clientIds = assignments.map(a => a.client_user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, bio')
        .in('user_id', clientIds);

      if (profileError) {
        console.error('[ChatList] Error loading client profiles:', profileError);
        return;
      }

      const clients = assignments.map(assignment => {
        const profile = profiles?.find(p => p.user_id === assignment.client_user_id);
        return {
          user_id: assignment.client_user_id,
          full_name: profile?.full_name || 'Unknown Client',
          phone: profile?.phone || '',
          bio: profile?.bio || '',
          assigned_at: assignment.assigned_at,
        };
      });

      console.log('[ChatList] ✅ Loaded coach clients:', clients.length);
      setCoachClients(clients);
    } catch (error) {
      console.error('[ChatList] Error in loadCoachClients:', error);
    } finally {
      // Add a small delay to prevent flash
      setTimeout(() => {
        setIsLoading(false);
        setIsLoadingClients(false);
        setInitialLoadComplete(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }, 100);
    }
  };

  useEffect(() => {
    console.log('[ChatList] Mode check:', { currentMode, coachData: !!coachData });
    if (currentMode === 'coach' && coachData && !isLoadingClients) {
      console.log('[ChatList] Loading coach clients...');
      loadCoachClients();
    } else if (currentMode !== 'coach') {
      // Client mode - create chat previews from messages and coaches
      const previews: ChatPreview[] = [];

      // Add coach chat if user has one (ONLY show current coach)
      if (myCoach) {
        const coachMessages = messages.filter(msg => 
          msg.sender_id === myCoach.user_id || msg.receiver_id === myCoach.user_id
        );
        const lastMessage = coachMessages[coachMessages.length - 1];
        
        previews.push({
          id: myCoach.user_id,
          name: myCoach.full_name || 'Health Coach',
          lastMessage: lastMessage?.message_text || 'Start your health journey!',
          timestamp: lastMessage ? formatTimestamp(new Date(lastMessage.created_at)) : 'Now',
          avatar: '👩‍⚕️',
          isOnline: true,
          unreadCount: coachMessages.filter(msg => msg.sender_id === myCoach.user_id && !msg.is_read).length,
          isCoach: true,
        });
      }

      // Removed previous coaches from chat list - only show current coach

      setChatPreviews(previews);
      // Add a small delay to prevent flash
      setTimeout(() => {
        setIsLoading(false);
        setInitialLoadComplete(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }, 100);
    }
  }, [currentMode, coachData?.id, messages.length, myCoach?.user_id]); // Re-run when mode, coach, or messages change

  // Create coach chat previews from clients (memoized to prevent excessive updates)
  useEffect(() => {
    console.log('[ChatList] Coach clients effect:', { 
      currentMode, 
      coachClientsCount: coachClients.length,
      coachClients: coachClients.map(c => ({ name: c.full_name, id: c.user_id }))
    });
    
    if (currentMode === 'coach' && coachClients.length > 0 && messages) {
      const previews: ChatPreview[] = coachClients.map(client => {
        const clientMessages = messages.filter(msg => 
          msg.sender_id === client.user_id || msg.receiver_id === client.user_id
        );
        const lastMessage = clientMessages[clientMessages.length - 1];
        
        return {
          id: client.user_id,
          name: client.full_name,
          lastMessage: lastMessage?.message_text || 'Start chatting with your client!',
          timestamp: lastMessage ? formatTimestamp(new Date(lastMessage.created_at)) : 'New',
          avatar: client.full_name?.charAt(0)?.toUpperCase() || '�',
          avatar_url: client.avatar_url,
          isOnline: true, // Assume clients are available
          unreadCount: clientMessages.filter(msg => msg.sender_id === client.user_id && !msg.is_read).length,
          isCoach: false, // These are clients, not coaches
        };
      });
      
      console.log('[ChatList] ✅ Created coach chat previews:', previews.length, previews);
      setChatPreviews(previews);
    } else if (currentMode === 'coach' && coachClients.length === 0) {
      console.log('[ChatList] 📝 No coach clients found, clearing chat previews');
      setChatPreviews([]);
    }
  }, [coachClients.length, messages.length, currentMode]); // Only when counts change

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredChats = chatPreviews.filter(chat =>
    chat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  console.log('[ChatList] Rendering - filteredChats count:', filteredChats.length);
  console.log('[ChatList] filteredChats data:', filteredChats.map(c => ({ id: c.id, name: c.name })));

  const handleChatPress = (chatId: string, chatName?: string) => {
    console.log('[ChatList] 🚀 handleChatPress called with:', { chatId, chatName });
    console.log('[ChatList] 🚀 onNavigate function exists:', !!onNavigate);
    console.log('[ChatList] 🚀 About to call onNavigate with:', 'individual-chat', { clientId: chatId, clientName: chatName });
    
    const result = onNavigate?.('individual-chat', { clientId: chatId, clientName: chatName });
    console.log('[ChatList] 🚀 onNavigate returned:', result);
  };

  const renderChatItem = (chat: ChatPreview) => {
    console.log('[ChatList] Rendering chat item:', { id: chat.id, name: chat.name });
    return (
      <TouchableOpacity
        key={chat.id}
        style={styles.chatItem}
        onPress={() => {
          console.log('[ChatList] 🔥 TOUCH DETECTED for:', chat.id, 'name:', chat.name);
          handleChatPress(chat.id, chat.name);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {chat.avatar_url ? (
            <Image
              source={{ uri: chat.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{chat.avatar}</Text>
            </View>
          )}
          {chat.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {chat.name}
            </Text>
            <Text style={styles.timestamp}>{chat.timestamp}</Text>
          </View>
          
          <View style={styles.messagePreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {chat.lastMessage}
            </Text>
            {chat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Messages</Text>
          <Text style={styles.headerTitle}>
            {currentMode === 'coach' ? 'Client Chats' : 'Chats'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {currentMode === 'coach' ? (
            <>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => loadCoachClients()}
              >
                <MaterialIcons name="refresh" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => onNavigate?.('assign-client')}
              >
                <MaterialIcons name="person-add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => onNavigate?.('coach-selection')}
              >
                <MaterialIcons name="person-add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={colors.primary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading || !initialLoadComplete ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
          >
          {filteredChats.length > 0 ? (
            filteredChats.map(renderChatItem)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="chat-bubble-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>
                {currentMode === 'coach' ? 'No clients yet' : 'No chats yet'}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {currentMode === 'coach' 
                  ? 'Clients will appear here when they are assigned to you'
                  : 'Start chatting with your health coach'
                }
              </Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => onNavigate?.(currentMode === 'coach' ? 'assign-client' : 'coach-selection')}
              >
                <Text style={styles.startChatButtonText}>
                  {currentMode === 'coach' ? 'Manage Clients' : 'Find a Coach'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
        </Animated.View>
      )}

      {currentMode === 'coach' ? (
        <CoachBottomNavigation
          activeTab="chat"
          onTabChange={(tab) => onNavigate?.(tab)}
        />
      ) : (
        <BottomNavigation
          activeTab="chat"
          onTabChange={(tab) => onNavigate?.(tab)}
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
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
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
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  unreadCount: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  startChatButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  startChatButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});