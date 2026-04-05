import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChatCircle,
  MagnifyingGlass,
  X,
  UserPlus,
  ArrowsClockwise,
  ImageSquare,
  FileText,
  Users,
  PaperPlaneTilt,
} from 'phosphor-react-native';
import {} from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useMessages, useCoaches } from '../hooks';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const C = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  cardDark: '#111111',
  accent: '#10B981',
  lime: '#D4F940',
  text: '#1A1A1A',
  dim: '#8C8C8C',
  border: '#EEEEEE',
  warmBg: '#F5F0EB',
  red: '#EF4444',
} as const;

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const PAD = 20;

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
  lastMessageType?: 'text' | 'image' | 'document';
}

const AVATAR_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899',
];

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ onNavigate }) => {
  const { user, currentMode, coachData } = useAuth();
  const { messages } = useMessages();
  const { myCoach } = useCoaches();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [coachClients, setCoachClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCoachClients = useCallback(async () => {
    if (!coachData || currentMode !== 'coach') { setIsLoading(false); return; }
    if (isLoadingClients) return;

    try {
      setIsLoadingClients(true);
      setIsLoading(true);

      const { data: assignments, error: assignError } = await supabase
        .from('coach_client_assignments')
        .select('client_user_id, assigned_at')
        .eq('coach_id', coachData.id)
        .eq('is_active', true);

      if (assignError) { console.error('[ChatList] Error loading assignments:', assignError); return; }
      if (!assignments || assignments.length === 0) { setCoachClients([]); return; }

      const clientIds = assignments.map(a => a.client_user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, bio')
        .in('user_id', clientIds);

      if (profileError) { console.error('[ChatList] Error loading client profiles:', profileError); return; }

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
      setCoachClients(clients);
    } catch (error) {
      console.error('[ChatList] Error in loadCoachClients:', error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setIsLoadingClients(false);
        setInitialLoadComplete(true);
      }, 100);
    }
  }, [coachData, currentMode, isLoadingClients]);

  useEffect(() => {
    if (currentMode === 'coach' && coachData && !isLoadingClients) {
      loadCoachClients();
    } else if (currentMode !== 'coach') {
      const previews: ChatPreview[] = [];
      if (myCoach) {
        const coachMessages = messages.filter(msg =>
          msg.sender_id === myCoach.user_id || msg.receiver_id === myCoach.user_id
        );
        const lastMessage = coachMessages[coachMessages.length - 1];
        const lastMsgType = lastMessage?.media_type === 'image' ? 'image'
          : lastMessage?.media_type === 'document' ? 'document' : 'text';

        previews.push({
          id: myCoach.user_id,
          name: myCoach.full_name || 'Health Coach',
          lastMessage: lastMessage?.media_type === 'image' ? 'Photo'
            : lastMessage?.media_type === 'document' ? 'Document'
            : lastMessage?.message_text || 'Start your health journey!',
          timestamp: lastMessage ? formatTimestamp(new Date(lastMessage.created_at)) : 'Now',
          avatar: '\u{1F469}\u200D\u2695\uFE0F',
          isOnline: true,
          unreadCount: coachMessages.filter(msg => msg.sender_id === myCoach.user_id && !msg.is_read).length,
          isCoach: true,
          lastMessageType: lastMsgType as any,
        });
      }
      setChatPreviews(previews);
      setTimeout(() => { setIsLoading(false); setInitialLoadComplete(true); }, 100);
    }
  }, [currentMode, coachData?.id, messages.length, myCoach?.user_id]);

  useEffect(() => {
    if (currentMode === 'coach' && coachClients.length > 0 && messages) {
      const previews: ChatPreview[] = coachClients.map(client => {
        const clientMessages = messages.filter(msg =>
          msg.sender_id === client.user_id || msg.receiver_id === client.user_id
        );
        const lastMessage = clientMessages[clientMessages.length - 1];
        const lastMsgType = lastMessage?.media_type === 'image' ? 'image'
          : lastMessage?.media_type === 'document' ? 'document' : 'text';
        return {
          id: client.user_id,
          name: client.full_name,
          lastMessage: lastMessage?.media_type === 'image' ? 'Photo'
            : lastMessage?.media_type === 'document' ? 'Document'
            : lastMessage?.message_text || 'Start chatting with your client!',
          timestamp: lastMessage ? formatTimestamp(new Date(lastMessage.created_at)) : 'New',
          avatar: client.full_name?.charAt(0)?.toUpperCase() || '?',
          avatar_url: client.avatar_url,
          isOnline: true,
          unreadCount: clientMessages.filter(msg => msg.sender_id === client.user_id && !msg.is_read).length,
          isCoach: false,
          lastMessageType: lastMsgType as any,
        };
      });
      previews.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        if (a.timestamp === 'New' && b.timestamp !== 'New') return 1;
        if (b.timestamp === 'New' && a.timestamp !== 'New') return -1;
        return 0;
      });
      setChatPreviews(previews);
    } else if (currentMode === 'coach' && coachClients.length === 0) {
      setChatPreviews([]);
    }
  }, [coachClients.length, messages.length, currentMode]);

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 2880) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredChats = chatPreviews.filter(chat =>
    chat.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const handleChatPress = (chatId: string, chatName?: string) => {
    onNavigate?.('individual-chat', { clientId: chatId, clientName: chatName, from: 'chat-list' });
  };

  const getAvatarColor = (name: string): string => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const totalUnread = chatPreviews.reduce((sum, c) => sum + c.unreadCount, 0);

  const renderChatItem = (chat: ChatPreview, index: number) => {
    const avatarColor = getAvatarColor(chat.name);
    return (
      <Animated.View key={chat.id} entering={FadeInDown.delay(index * 50).duration(400).springify()}>
        <TouchableOpacity
          style={[styles.chatItem, chat.unreadCount > 0 && styles.chatItemUnread]}
          onPress={() => handleChatPress(chat.id, chat.name)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {chat.avatar_url ? (
              <Image source={{ uri: chat.avatar_url }} style={styles.avatarImage} />
            ) : chat.isCoach ? (
              <View style={[styles.avatar, { backgroundColor: C.accent }]}>
                <Text style={styles.avatarEmoji}>{chat.avatar}</Text>
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{chat.avatar}</Text>
              </View>
            )}
            {chat.isOnline && (
              <View style={styles.onlineRing}>
                <View style={styles.onlineIndicator} />
              </View>
            )}
          </View>
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, chat.unreadCount > 0 && { fontFamily: F.bold }]} numberOfLines={1}>{chat.name}</Text>
              <Text style={[styles.timestamp, chat.unreadCount > 0 && styles.timestampUnread]}>{chat.timestamp}</Text>
            </View>
            <View style={styles.messagePreview}>
              <View style={styles.lastMessageRow}>
                {chat.lastMessageType === 'image' && <ImageSquare size={14} color={C.dim} style={{ marginRight: 4 }} />}
                {chat.lastMessageType === 'document' && <FileText size={14} color={C.dim} style={{ marginRight: 4 }} />}
                <Text style={[styles.lastMessage, chat.unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>{chat.lastMessage}</Text>
              </View>
              {chat.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500).springify()}>
        <View style={styles.headerArea}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>{currentMode === 'coach' ? 'Coach Chat' : 'Messages'}</Text>
              <Text style={styles.headerTitle}>{currentMode === 'coach' ? 'Your Clients' : 'Conversations'}</Text>
            </View>
            <View style={styles.headerActions}>
              {currentMode === 'coach' ? (
                <>
                  <TouchableOpacity style={styles.headerBtn} onPress={() => loadCoachClients()}>
                    <ArrowsClockwise size={20} color={C.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerBtnAccent} onPress={() => onNavigate?.('assign-client')}>
                    <UserPlus size={20} color="#FFF" weight="bold" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.headerBtnAccent} onPress={() => onNavigate?.('coach-selection')}>
                  <UserPlus size={20} color="#FFF" weight="bold" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.searchContainer, searchFocused && styles.searchFocused]}>
            <MagnifyingGlass size={18} color={C.dim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor={C.dim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              selectionColor={C.accent}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <View style={styles.searchClearBg}><X size={12} color={C.dim} weight="bold" /></View>
              </TouchableOpacity>
            )}
          </View>

          {chatPreviews.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <ChatCircle size={13} color={C.accent} weight="fill" />
                <Text style={styles.statText}>{chatPreviews.length} {currentMode === 'coach' ? 'clients' : 'chats'}</Text>
              </View>
              {totalUnread > 0 && (
                <View style={[styles.statPill, { backgroundColor: C.cardDark }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.lime }} />
                  <Text style={[styles.statText, { color: C.lime }]}>{totalUnread} unread</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>

      {isLoading || !initialLoadComplete ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPulse}><ActivityIndicator size="large" color={C.accent} /></View>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.chatListContent} showsVerticalScrollIndicator={false}>
          {filteredChats.length > 0 ? (
            <>{filteredChats.map((chat, i) => renderChatItem(chat, i))}<View style={{ height: 20 }} /></>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconOuter}>
                <View style={styles.emptyIconInner}><ChatCircle size={36} color="#FFF" weight="fill" /></View>
              </View>
              <Text style={styles.emptyTitle}>
                {debouncedSearchQuery ? 'No results found' : currentMode === 'coach' ? 'No clients yet' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptySub}>
                {debouncedSearchQuery ? `No chats matching "${debouncedSearchQuery}"` : currentMode === 'coach' ? 'Clients will appear here once assigned' : 'Connect with a health coach to start'}
              </Text>
              {!debouncedSearchQuery && (
                <TouchableOpacity style={styles.startBtn} onPress={() => onNavigate?.(currentMode === 'coach' ? 'assign-client' : 'coach-selection')} activeOpacity={0.8}>
                  {currentMode === 'coach' ? <Users size={18} color="#FFF" weight="bold" /> : <PaperPlaneTilt size={18} color="#FFF" weight="fill" />}
                  <Text style={styles.startBtnText}>{currentMode === 'coach' ? 'Manage Clients' : 'Find a Coach'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerArea: { paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 16, backgroundColor: C.bg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerGreeting: { fontSize: 13, fontFamily: F.medium, color: C.dim, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontFamily: F.bold, color: C.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  headerBtnAccent: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, gap: 10 },
  searchFocused: { borderColor: C.accent },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.medium, color: C.text, padding: 0 },
  searchClearBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  statText: { fontSize: 12, fontFamily: F.semi, color: C.accent },
  chatListContent: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 110 },
  chatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, padding: 14, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  chatItemUnread: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: '#F0FDF9' },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.accent },
  avatarEmoji: { fontSize: 24 },
  avatarText: { fontSize: 19, fontFamily: F.bold, color: '#FFF' },
  onlineRing: { position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderRadius: 9, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  onlineIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  chatName: { fontSize: 15, fontFamily: F.semi, color: C.text, flex: 1, marginRight: 8 },
  timestamp: { fontSize: 12, fontFamily: F.medium, color: C.dim },
  timestampUnread: { color: C.accent, fontFamily: F.semi },
  messagePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessageRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  lastMessage: { fontSize: 13, fontFamily: F.regular, color: C.dim, flex: 1 },
  lastMessageUnread: { color: C.text, fontFamily: F.medium },
  unreadBadge: { backgroundColor: C.accent, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 },
  unreadCount: { fontSize: 11, fontFamily: F.bold, color: '#FFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIconOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyIconInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontFamily: F.bold, color: C.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cardDark, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28 },
  startBtnText: { fontSize: 15, fontFamily: F.semi, color: '#FFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingPulse: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  loadingText: { fontSize: 14, fontFamily: F.medium, color: C.dim },
});
