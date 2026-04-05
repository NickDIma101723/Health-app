import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  Modal,
  Keyboard,
  Alert,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  ArrowLeft,
  PaperPlaneTilt,
  DotsThreeVertical,
  Camera,
  ImageSquare,
  FileText,
  Trash,
  X,
  ChatCircle,
  Lock,
  MagnifyingGlass,
  Bell,
  BellSlash,
  SpeakerHigh,
  SpeakerSlash,
  Clock,
  ShieldCheck,
  PlusCircle,
  DownloadSimple,
  User,
  CheckCircle,
  Checks,
  ClockCountdown,
  Users,
} from 'phosphor-react-native';
import {} from '../components';
import { useMessages, useCoaches } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  pickImageFromCamera,
  pickImageFromGallery,
  pickDocument,
  uploadMediaToStorage,
  formatFileSize,
  getFileIcon,
  MediaFile,
  UploadProgress
} from '../lib/mediaUpload';

const { width, height: screenHeight } = Dimensions.get('window');

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
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  accentSoft: '#ECFDF5',
} as const;

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const PAD = 16;

interface Message {
  id: string;
  text: string | null;
  senderId: string;
  senderName: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isCoach: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
  mediaSize?: number | null;
}

interface ChatScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  clientId?: string;
  clientName?: string;
  returnTo?: string;
}

const DateSeparator = ({ date }: { date: string }) => (
  <View style={styles.dateSeparator}>
    <View style={styles.dateSeparatorLine} />
    <View style={styles.dateSeparatorBadge}>
      <Text style={styles.dateSeparatorText}>{date}</Text>
    </View>
    <View style={styles.dateSeparatorLine} />
  </View>
);

export const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, clientId, clientName, returnTo }) => {
  const { user, isCoach, coachData } = useAuth();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const { myCoach, loading: coachLoading, fetchMyCoach } = useCoaches();

  useEffect(() => {
    if (!isCoach && user) fetchMyCoach(true);
  }, [user, isCoach]);

  const chatPartnerId = clientId || (isCoach ? selectedClient?.user_id : myCoach?.user_id);

  const {
    messages: dbMessages,
    loading: messagesLoading,
    sendMessage: dbSendMessage,
    markAllAsRead,
    clearChatHistory: dbClearChatHistory,
    deleteMessage: dbDeleteMessage,
    unreadCount
  } = useMessages(chatPartnerId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showCoachProfile, setShowCoachProfile] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const loadClients = async () => {
      if (!isCoach || !coachData) return;
      setLoadingClients(true);
      try {
        const { data: assignments, error: assignError } = await supabase
          .from('coach_client_assignments')
          .select('client_user_id')
          .eq('coach_id', coachData.id)
          .eq('is_active', true);
        if (assignError) throw assignError;
        if (!assignments || assignments.length === 0) { setClientsList([]); setLoadingClients(false); return; }
        const clientIds = assignments.map(a => a.client_user_id);
        const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').in('user_id', clientIds);
        if (profileError) throw profileError;
        setClientsList(profiles || []);
      } catch (err) {
        console.error('[ChatScreen] Error loading clients:', err);
        setClientsList([]);
      } finally { setLoadingClients(false); }
    };
    loadClients();
  }, [isCoach, coachData]);

  useEffect(() => {
    if (clientId && clientsList.length > 0) {
      const client = clientsList.find(c => c.user_id === clientId);
      if (client) setSelectedClient(client);
    }
  }, [clientId, clientsList]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => { setKeyboardHeight(e.endCoordinates.height); setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100); }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { keyboardWillShow.remove(); keyboardWillHide.remove(); };
  }, []);

  useEffect(() => {
    const chatPartner = isCoach ? selectedClient : (clientId ? { user_id: clientId, full_name: (clientName || myCoach?.full_name) } as any : myCoach);
    if (dbMessages && chatPartner) {
      const transformedMessages: Message[] = dbMessages.map(msg => ({
        id: msg.id,
        text: msg.message_text,
        senderId: msg.sender_id,
        senderName: msg.sender_id === chatPartner.user_id ? chatPartner.full_name : 'You',
        timestamp: new Date(msg.created_at),
        status: msg.is_read ? 'read' : 'delivered',
        isCoach: msg.sender_id !== user?.id,
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        mediaFilename: msg.media_filename,
        mediaSize: msg.media_size,
      }));
      setMessages(transformedMessages);
      if (unreadCount > 0) markAllAsRead();
    }
  }, [dbMessages, myCoach, selectedClient, isCoach, user]);

  useEffect(() => { setMessages([]); }, [chatPartnerId]);

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  const sendMessage = async () => {
    const chatPartner = isCoach ? selectedClient : (clientId ? { user_id: clientId, full_name: (clientName || myCoach?.full_name) } as any : myCoach);
    const receiverId = chatPartner?.user_id || chatPartnerId;
    if ((!inputText.trim() && !selectedMedia) || !receiverId || !user) return;

    const messageText = inputText.trim() || null;
    setInputText('');

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId, text: messageText, senderId: user.id, senderName: 'You',
      timestamp: new Date(), status: 'sending', isCoach: false,
      mediaUrl: selectedMedia?.uri || null, mediaType: selectedMedia?.type || null,
      mediaFilename: selectedMedia?.filename || null, mediaSize: selectedMedia?.size || null,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let mediaUrl: string | null = null, mediaType: string | null = null, mediaFilename: string | null = null, mediaSize: number | null = null;
      if (selectedMedia) {
        setIsUploading(true);
        const uploadResult = await uploadMediaToStorage(selectedMedia, user.id, (progress) => setUploadProgress(progress));
        if (uploadResult.error) { Alert.alert('Upload Failed', uploadResult.error); setIsUploading(false); setUploadProgress(null); setMessages(prev => prev.filter(m => m.id !== optimisticId)); return; }
        mediaUrl = uploadResult.url; mediaType = selectedMedia.type; mediaFilename = selectedMedia.filename; mediaSize = selectedMedia.size;
        setSelectedMedia(null); setIsUploading(false); setUploadProgress(null);
      }
      const result = await dbSendMessage(messageText, receiverId, mediaUrl, mediaType, mediaFilename, mediaSize);
      if (result.error) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); Alert.alert('Send Failed', result.error); }
      else { setMessages(prev => prev.filter(m => m.id !== optimisticId)); }
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      Alert.alert('Error', 'Failed to send message');
      setIsUploading(false); setUploadProgress(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (messageId.startsWith('opt_')) return;
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const result = await dbDeleteMessage(messageId);
        if (result.error) Alert.alert('Error', result.error);
        setSelectedMessageId(null);
      }},
    ]);
  };

  const handleAttachmentPress = () => { Keyboard.dismiss(); setShowAttachmentOptions(true); };
  const handleTakePhoto = async () => { setShowAttachmentOptions(false); const media = await pickImageFromCamera(); if (media) setSelectedMedia(media); };
  const handlePickImage = async () => { setShowAttachmentOptions(false); const media = await pickImageFromGallery(); if (media) setSelectedMedia(media); };
  const handlePickDocument = async () => { setShowAttachmentOptions(false); const media = await pickDocument(); if (media) setSelectedMedia(media); };
  const handleRemoveMedia = () => setSelectedMedia(null);

  const formatMessageTime = (timestamp: Date) => timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getDateLabel = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (msgDate.getTime() === today.getTime()) return 'Today';
    if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const handleClearChat = async () => {
    Alert.alert('Clear Chat', 'This will delete all messages. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const result = await dbClearChatHistory();
        if (result.error) console.error('Failed to clear chat:', result.error);
        setShowOptionsMenu(false);
      }},
    ]);
  };

  const getMessageGroups = useCallback(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    messages.forEach(msg => {
      const dateLabel = getDateLabel(msg.timestamp);
      if (dateLabel !== currentDate) { currentDate = dateLabel; groups.push({ date: dateLabel, messages: [msg] }); }
      else { groups[groups.length - 1].messages.push(msg); }
    });
    return groups;
  }, [messages]);

  const renderMessage = (message: Message, index: number, groupMessages: Message[]) => {
    const isFirst = index === 0 || groupMessages[index - 1]?.isCoach !== message.isCoach;
    const isLast = index === groupMessages.length - 1 || groupMessages[index + 1]?.isCoach !== message.isCoach;
    const isSending = message.status === 'sending';

    return (
      <TouchableOpacity
        key={message.id}
        activeOpacity={0.8}
        onLongPress={() => { if (!message.isCoach && !message.id.startsWith('opt_')) setSelectedMessageId(message.id); }}
        style={[styles.messageRow, message.isCoach ? styles.messageRowCoach : styles.messageRowUser, !isLast && { marginBottom: 3 }]}
      >
        {message.isCoach && isLast && (
          <View style={styles.coachAvatar}>
            <Text style={styles.coachAvatarText}>{'\u{1F464}'}</Text>
          </View>
        )}
        {message.isCoach && !isLast && <View style={{ width: 36, marginRight: 6 }} />}

        <View style={[{ maxWidth: width * 0.75 }, isSending && { opacity: 0.7 }]}>
          {message.isCoach ? (
            <View style={[styles.bubbleCoach, isFirst && { borderTopLeftRadius: 20 }, isLast && { borderBottomLeftRadius: 6 }]}>
              {isFirst && <Text style={styles.senderName}>{message.senderName}</Text>}
              {message.mediaUrl && message.mediaType === 'image' && (
                <TouchableOpacity onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)} style={styles.mediaImageContainer}>
                  <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              {message.mediaUrl && message.mediaType === 'document' && (
                <TouchableOpacity onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)} style={styles.mediaDocContainer}>
                  <View style={styles.docIconBg}><FileText size={18} color={C.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mediaDocName} numberOfLines={1}>{message.mediaFilename}</Text>
                    {message.mediaSize && <Text style={styles.mediaDocSize}>{formatFileSize(message.mediaSize)}</Text>}
                  </View>
                  <DownloadSimple size={16} color={C.dim} />
                </TouchableOpacity>
              )}
              {message.text && <Text style={styles.messageTextCoach}>{message.text}</Text>}
              <View style={styles.messageFooter}><Text style={styles.messageTimeCoach}>{formatMessageTime(message.timestamp)}</Text></View>
            </View>
          ) : (
            <View style={[styles.bubbleUser, isSending && { backgroundColor: 'rgba(16,185,129,0.6)' }, isFirst && { borderTopRightRadius: 20 }, isLast && { borderBottomRightRadius: 6 }]}>
              {message.mediaUrl && message.mediaType === 'image' && (
                <TouchableOpacity onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)} style={styles.mediaImageContainer}>
                  <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
              {message.mediaUrl && message.mediaType === 'document' && (
                <TouchableOpacity onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)} style={styles.mediaDocContainer}>
                  <View style={[styles.docIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><FileText size={18} color="#FFF" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mediaDocName, { color: '#FFF' }]} numberOfLines={1}>{message.mediaFilename}</Text>
                    {message.mediaSize && <Text style={[styles.mediaDocSize, { color: 'rgba(255,255,255,0.7)' }]}>{formatFileSize(message.mediaSize)}</Text>}
                  </View>
                  <DownloadSimple size={16} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              )}
              {message.text && <Text style={styles.messageTextUser}>{message.text}</Text>}
              <View style={styles.messageFooter}>
                <Text style={styles.messageTimeUser}>{formatMessageTime(message.timestamp)}</Text>
                {message.status && (
                  <Checks
                    size={14}
                    color={message.status === 'read' ? C.lime : 'rgba(255,255,255,0.6)'}
                    weight={message.status === 'read' ? 'bold' : 'regular'}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderChatContent = (chatPartnerName: string, chatPartnerSpecialty?: string) => (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={[styles.messagesContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyIconOuter}>
              <ChatCircle size={28} color={C.accent} />
            </View>
            <Text style={styles.emptyChatTitle}>Start the Conversation</Text>
            <Text style={styles.emptyChatText}>
              Send a message to {chatPartnerName} to begin your journey together.
            </Text>
            <View style={styles.welcomeFeatures}>
              <View style={styles.welcomeFeature}>
                <Lock size={13} color={C.accent} />
                <Text style={styles.welcomeFeatureText}>End-to-end encrypted</Text>
              </View>
              <View style={styles.welcomeFeature}>
                <Camera size={13} color={C.accent} />
                <Text style={styles.welcomeFeatureText}>Share photos & files</Text>
              </View>
            </View>
          </View>
        ) : (
          getMessageGroups().map((group, gi) => (
            <View key={gi}>
              <DateSeparator date={group.date} />
              {group.messages.map((message, mi) => renderMessage(message, mi, group.messages))}
            </View>
          ))
        )}

        {isCoachTyping && (
          <View style={[styles.messageRow, styles.messageRowCoach]}>
            <View style={styles.coachAvatar}><Text style={styles.coachAvatarText}>{'\u{1F464}'}</Text></View>
            <View style={[styles.bubbleCoach, styles.typingBubble]}>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.inputContainer, { marginBottom: keyboardHeight > 0 ? 0 : PAD }]}>
          {selectedMedia && (
            <View style={styles.mediaPreview}>
              <View style={styles.mediaPreviewContent}>
                {selectedMedia.type === 'image' ? (
                  <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreviewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.mediaPreviewDoc}>
                    <FileText size={28} color={C.accent} />
                    <Text style={styles.mediaPreviewFilename} numberOfLines={1}>{selectedMedia.filename}</Text>
                    <Text style={styles.mediaPreviewFilesize}>{formatFileSize(selectedMedia.size)}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.mediaPreviewRemove} onPress={handleRemoveMedia}>
                  <X size={14} color="#FFF" weight="bold" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isUploading && uploadProgress && (
            <View style={styles.uploadProgressContainer}>
              <View style={styles.uploadProgressBar}>
                <View style={[styles.uploadProgressFill, { width: `${uploadProgress.percentage}%` as any }]} />
              </View>
              <Text style={styles.uploadProgressText}>Uploading... {Math.round(uploadProgress.percentage)}%</Text>
            </View>
          )}

          <View style={[styles.inputWrapper, inputFocused && styles.inputWrapperFocused]}>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachmentPress} disabled={isUploading}>
              <PlusCircle size={24} color={isUploading ? C.border : C.dim} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={C.dim}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              multiline
              maxLength={1000}
              editable={!isUploading}
              selectionColor={C.accent}
            />
            <TouchableOpacity
              style={[styles.sendButton, (inputText.trim() || selectedMedia) && !isUploading && styles.sendButtonActive]}
              onPress={sendMessage}
              disabled={(!inputText.trim() && !selectedMedia) || isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <PaperPlaneTilt size={18} color="#FFF" weight="fill" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );

  const renderHeader = (name: string, subtitle: string, onBack: () => void, onInfo?: () => void) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
      <View style={styles.headerInfo}>
        <View style={styles.headerAvatar}><Text style={styles.headerAvatarText}>{name.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.headerDetails}>
          <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.headerOnlineDot} />
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
      {onInfo && (
        <TouchableOpacity style={styles.headerMenuButton} onPress={onInfo}><DotsThreeVertical size={22} color={C.text} weight="bold" /></TouchableOpacity>
      )}
    </View>
  );

  // ===== COACH VIEW =====
  if (isCoach) {
    if (!selectedClient) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <View style={styles.clientSelectorHeader}>
            <Text style={styles.clientSelectorTitle}>Select Client to Chat</Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.clientListContent}>
            {loadingClients ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={styles.loadingText}>Loading clients...</Text>
              </View>
            ) : clientsList.length === 0 ? (
              <View style={styles.noCoachContent}>
                <View style={styles.noCoachIconContainer}><Users size={48} color={C.accent} /></View>
                <Text style={styles.noCoachTitle}>No Clients Assigned</Text>
                <Text style={styles.noCoachDescription}>You don't have any assigned clients yet.</Text>
                <TouchableOpacity style={styles.noCoachButton} onPress={() => onNavigate?.('coach-dashboard')}>
                  <Users size={18} color="#FFF" weight="bold" />
                  <Text style={styles.noCoachButtonText}>View Clients</Text>
                </TouchableOpacity>
              </View>
            ) : (
              clientsList.map((client) => (
                <TouchableOpacity key={client.user_id} style={styles.clientCard} onPress={() => setSelectedClient(client)}>
                  <View style={styles.clientAvatar}><Text style={styles.clientAvatarText}>{client.full_name?.charAt(0).toUpperCase() || '?'}</Text></View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.full_name || 'Unknown'}</Text>
                    <Text style={styles.clientMeta}>{client.fitness_level ? `${client.fitness_level} level` : 'New client'}</Text>
                  </View>
                  <ArrowLeft size={20} color={C.dim} weight="bold" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {renderHeader(selectedClient.full_name || 'Client', selectedClient.fitness_level ? `${selectedClient.fitness_level} level` : 'Your Client', () => setSelectedClient(null), () => onNavigate?.('coach-client-detail', { clientId: selectedClient.user_id }))}
          {renderChatContent(selectedClient.full_name || 'your client')}
        </KeyboardAvoidingView>

        {/* Attachment Modal */}
        <Modal visible={showAttachmentOptions} transparent animationType="fade" onRequestClose={() => setShowAttachmentOptions(false)}>
          <TouchableOpacity style={styles.attachOverlay} activeOpacity={1} onPress={() => setShowAttachmentOptions(false)}>
            <View style={styles.attachSheet}>
              <View style={styles.attachHandle} />
              <Text style={styles.attachTitle}>Share</Text>
              <View style={styles.attachGrid}>
                <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
                  <View style={[styles.attachIconBg, { backgroundColor: C.accentSoft }]}><Camera size={24} color={C.accent} /></View>
                  <Text style={styles.attachOptionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
                  <View style={[styles.attachIconBg, { backgroundColor: '#EFF6FF' }]}><ImageSquare size={24} color={C.blue} /></View>
                  <Text style={styles.attachOptionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
                  <View style={[styles.attachIconBg, { backgroundColor: '#FEF3C7' }]}><FileText size={24} color={C.amber} /></View>
                  <Text style={styles.attachOptionText}>File</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete message modal */}
        <Modal visible={!!selectedMessageId} transparent animationType="fade" onRequestClose={() => setSelectedMessageId(null)}>
          <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setSelectedMessageId(null)}>
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionItem} onPress={() => selectedMessageId && handleDeleteMessage(selectedMessageId)}>
                <Trash size={20} color={C.red} /><Text style={[styles.optionText, { color: C.red }]}>Delete Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => setSelectedMessageId(null)}>
                <X size={20} color={C.dim} /><Text style={styles.optionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== CLIENT VIEW =====
  if ((coachLoading || messagesLoading) && !myCoach) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={C.accent} /><Text style={styles.loadingText}>Loading chat...</Text></View>
      </SafeAreaView>
    );
  }

  if (!myCoach) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: PAD }}>
            <View style={styles.noCoachContent}>
              <View style={styles.noCoachIconContainer}><User size={48} color={C.accent} /></View>
              <Text style={styles.noCoachTitle}>No Coach Assigned Yet</Text>
              <Text style={styles.noCoachDescription}>You'll be assigned a personal health coach soon. They will help guide you on your wellness journey.</Text>
              <View style={styles.noCoachFeatures}>
                <View style={styles.noCoachFeature}><CheckCircle size={22} color={C.accent} weight="fill" /><Text style={styles.noCoachFeatureText}>Personalized guidance for your goals</Text></View>
                <View style={styles.noCoachFeature}><CheckCircle size={22} color={C.accent} weight="fill" /><Text style={styles.noCoachFeatureText}>Message your coach anytime</Text></View>
                <View style={styles.noCoachFeature}><CheckCircle size={22} color={C.accent} weight="fill" /><Text style={styles.noCoachFeatureText}>Expert health & wellness advice</Text></View>
              </View>
              <TouchableOpacity style={styles.noCoachButton} onPress={() => onNavigate?.('home')}>
                <Text style={styles.noCoachButtonText}>Return to Home</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Client with coach
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderHeader(myCoach.full_name, myCoach.specialization || 'Health Coach', () => onNavigate?.((returnTo as any) || 'chat-list'), () => setShowOptionsMenu(true))}
        {renderChatContent(myCoach.full_name, myCoach.specialization || undefined)}

        {/* Options Menu */}
        <Modal visible={showOptionsMenu} animationType="fade" transparent onRequestClose={() => setShowOptionsMenu(false)}>
          <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setShowOptionsMenu(false)}>
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsMenu(false); setShowCoachProfile(true); }}>
                <User size={20} color={C.accent} /><Text style={styles.optionText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsMenu(false); setShowNotificationSettings(true); }}>
                <Bell size={20} color={C.accent} /><Text style={styles.optionText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => { setShowOptionsMenu(false); setShowSearchMessages(true); }}>
                <MagnifyingGlass size={20} color={C.accent} /><Text style={styles.optionText}>Search Messages</Text>
              </TouchableOpacity>
              <View style={styles.optionDivider} />
              <TouchableOpacity style={styles.optionItem} onPress={handleClearChat}>
                <Trash size={20} color={C.red} /><Text style={[styles.optionText, { color: C.red }]}>Clear Chat</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Attachment Modal */}
        <Modal visible={showAttachmentOptions} transparent animationType="fade" onRequestClose={() => setShowAttachmentOptions(false)}>
          <TouchableOpacity style={styles.attachOverlay} activeOpacity={1} onPress={() => setShowAttachmentOptions(false)}>
            <View style={styles.attachSheet}>
              <View style={styles.attachHandle} />
              <Text style={styles.attachTitle}>Share</Text>
              <View style={styles.attachGrid}>
                <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
                  <View style={[styles.attachIconBg, { backgroundColor: C.accentSoft }]}><Camera size={24} color={C.accent} /></View>
                  <Text style={styles.attachOptionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
                  <View style={[styles.attachIconBg, { backgroundColor: '#EFF6FF' }]}><ImageSquare size={24} color={C.blue} /></View>
                  <Text style={styles.attachOptionText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
                  <View style={[styles.attachIconBg, { backgroundColor: '#FEF3C7' }]}><FileText size={24} color={C.amber} /></View>
                  <Text style={styles.attachOptionText}>File</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete message modal */}
        <Modal visible={!!selectedMessageId} transparent animationType="fade" onRequestClose={() => setSelectedMessageId(null)}>
          <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setSelectedMessageId(null)}>
            <View style={styles.optionsMenu}>
              <TouchableOpacity style={styles.optionItem} onPress={() => selectedMessageId && handleDeleteMessage(selectedMessageId)}>
                <Trash size={20} color={C.red} /><Text style={[styles.optionText, { color: C.red }]}>Delete Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => setSelectedMessageId(null)}>
                <X size={20} color={C.dim} /><Text style={styles.optionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Coach Profile */}
        <Modal visible={showCoachProfile} animationType="slide" transparent onRequestClose={() => setShowCoachProfile(false)}>
          <View style={styles.profileOverlay}>
            <View style={styles.profileModal}>
              <TouchableOpacity style={styles.profileCloseBtn} onPress={() => setShowCoachProfile(false)}><X size={22} color={C.text} /></TouchableOpacity>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{'\u{1F464}'}</Text></View>
                <Text style={styles.profileName}>{myCoach.full_name}</Text>
                <Text style={styles.profileSpecialty}>{myCoach.specialization || 'Health Coach'}</Text>
                <View style={styles.profileBadge}><ShieldCheck size={14} color={C.accent} weight="fill" /><Text style={styles.profileBadgeText}>Verified Coach</Text></View>
              </View>
              <ScrollView style={styles.profileContent}>
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Specializations</Text>
                  <View style={styles.profileTags}>
                    {['Nutrition', 'Fitness', 'Mindfulness', 'Sleep Health'].map(tag => (
                      <View key={tag} style={styles.profileTag}><Text style={styles.profileTagText}>{tag}</Text></View>
                    ))}
                  </View>
                </View>
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Availability</Text>
                  <View style={styles.availItem}><Clock size={18} color={C.dim} /><Text style={styles.availText}>Monday - Friday: 9:00 AM - 6:00 PM</Text></View>
                  <View style={styles.availItem}><Clock size={18} color={C.dim} /><Text style={styles.availText}>Usually responds within 2 hours</Text></View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Notification Settings */}
        <Modal visible={showNotificationSettings} animationType="slide" transparent onRequestClose={() => setShowNotificationSettings(false)}>
          <View style={styles.settingsOverlay}>
            <View style={styles.settingsModal}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => setShowNotificationSettings(false)}><X size={22} color={C.text} /></TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1, paddingHorizontal: PAD, paddingTop: 12 }}>
                <TouchableOpacity style={styles.settingItem} onPress={() => setNotificationsEnabled(!notificationsEnabled)}>
                  <View style={styles.settingInfo}>
                    {notificationsEnabled ? <Bell size={22} color={C.accent} /> : <BellSlash size={22} color={C.dim} />}
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={styles.settingLabel}>Push Notifications</Text>
                      <Text style={styles.settingDesc}>Receive notifications for new messages</Text>
                    </View>
                  </View>
                  <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, notificationsEnabled && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingItem} onPress={() => setSoundEnabled(!soundEnabled)}>
                  <View style={styles.settingInfo}>
                    {soundEnabled ? <SpeakerHigh size={22} color={C.accent} /> : <SpeakerSlash size={22} color={C.dim} />}
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={styles.settingLabel}>Sound</Text>
                      <Text style={styles.settingDesc}>Play sound for new messages</Text>
                    </View>
                  </View>
                  <View style={[styles.toggle, soundEnabled && styles.toggleActive]}>
                    <View style={[styles.toggleThumb, soundEnabled && styles.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Search Messages */}
        <Modal visible={showSearchMessages} animationType="slide" transparent onRequestClose={() => setShowSearchMessages(false)}>
          <View style={styles.searchOverlay}>
            <View style={{ flex: 1 }}>
              <View style={styles.searchHeader}>
                <TouchableOpacity onPress={() => { setShowSearchMessages(false); setSearchQuery(''); }}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
                <View style={styles.searchInputContainer}>
                  <MagnifyingGlass size={18} color={C.dim} />
                  <TextInput style={styles.searchInput} placeholder="Search messages..." placeholderTextColor={C.dim} value={searchQuery} onChangeText={setSearchQuery} autoFocus selectionColor={C.accent} />
                  {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={18} color={C.dim} /></TouchableOpacity>}
                </View>
              </View>
              <ScrollView style={{ flex: 1, paddingHorizontal: PAD }}>
                {messages.length === 0 ? (
                  <View style={styles.emptySearch}><ChatCircle size={42} color={C.border} /><Text style={styles.emptySearchTitle}>No messages yet</Text></View>
                ) : searchQuery.length > 0 ? (
                  messages.filter(msg => msg.text?.toLowerCase().includes(searchQuery.toLowerCase())).map((msg) => (
                    <TouchableOpacity key={msg.id} style={styles.searchResultItem} onPress={() => { setShowSearchMessages(false); setSearchQuery(''); }}>
                      <View style={styles.searchResultHeader}>
                        <Text style={styles.searchResultSender}>{msg.senderName}</Text>
                        <Text style={styles.searchResultTime}>{formatMessageTime(msg.timestamp)}</Text>
                      </View>
                      <Text style={styles.searchResultText} numberOfLines={2}>{msg.text}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptySearch}><MagnifyingGlass size={42} color={C.border} /><Text style={styles.emptySearchTitle}>Search Messages</Text><Text style={styles.emptySearchText}>Type to search through your conversation</Text></View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 16, paddingBottom: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarText: { fontSize: 17, fontFamily: F.bold, color: '#FFF' },
  headerDetails: { flex: 1 },
  headerName: { fontSize: 15, fontFamily: F.semi, color: C.text, marginBottom: 2 },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  headerSubtitle: { fontSize: 12, fontFamily: F.medium, color: C.accent },
  headerMenuButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },

  // Messages
  messagesContainer: { flex: 1 },
  messagesContent: { padding: PAD, paddingBottom: 24 },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 8 },
  dateSeparatorLine: { flex: 1, height: 1, backgroundColor: C.border },
  dateSeparatorBadge: { paddingHorizontal: 14, paddingVertical: 4, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginHorizontal: 8 },
  dateSeparatorText: { fontSize: 11, fontFamily: F.semi, color: C.dim },

  emptyChat: { marginTop: 40, alignItems: 'center', padding: 24, backgroundColor: C.card, borderRadius: 24, borderWidth: 1, borderColor: C.border },
  emptyIconOuter: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyChatTitle: { fontSize: 17, fontFamily: F.bold, color: C.text, marginBottom: 6 },
  emptyChatText: { fontSize: 13, fontFamily: F.regular, color: C.dim, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  welcomeFeatures: { flexDirection: 'row', gap: 18 },
  welcomeFeature: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  welcomeFeatureText: { fontSize: 11, fontFamily: F.medium, color: C.dim },

  messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  messageRowCoach: { justifyContent: 'flex-start' },
  messageRowUser: { justifyContent: 'flex-end' },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.warmBg, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  coachAvatarText: { fontSize: 15 },

  bubbleCoach: { backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14, borderWidth: 1, borderColor: C.border },
  bubbleUser: { backgroundColor: C.accent, borderRadius: 20, borderBottomRightRadius: 6, padding: 14 },

  senderName: { fontSize: 11, fontFamily: F.semi, color: C.accent, marginBottom: 4 },
  messageTextCoach: { fontSize: 15, fontFamily: F.regular, color: C.text, lineHeight: 22 },
  messageTextUser: { fontSize: 15, fontFamily: F.regular, color: '#FFF', lineHeight: 22 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' },
  messageTimeCoach: { fontSize: 10, fontFamily: F.medium, color: C.dim },
  messageTimeUser: { fontSize: 10, fontFamily: F.medium, color: 'rgba(255,255,255,0.6)' },

  typingBubble: { paddingVertical: 10, paddingHorizontal: 14 },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.dim },

  mediaImageContainer: { marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  mediaImage: { width: 200, height: 200, borderRadius: 12 },
  mediaDocContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: 4 },
  docIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center' },
  mediaDocName: { fontSize: 13, fontFamily: F.semi, color: C.text, marginBottom: 2 },
  mediaDocSize: { fontSize: 11, fontFamily: F.medium, color: C.dim },

  // Input
  inputContainer: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 130, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: C.bg, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: C.border, gap: 4 },
  inputWrapperFocused: { borderColor: C.accent },
  attachButton: { padding: 6, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, fontFamily: F.medium, color: C.text, maxHeight: 100, minHeight: 36, paddingVertical: 6, paddingHorizontal: 6, textAlignVertical: 'center' },
  sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
  sendButtonActive: { backgroundColor: C.accent },

  mediaPreview: { marginBottom: 10 },
  mediaPreviewContent: { position: 'relative', alignSelf: 'flex-start' },
  mediaPreviewImage: { width: 80, height: 80, borderRadius: 12 },
  mediaPreviewDoc: { padding: 14, backgroundColor: C.bg, borderRadius: 12, alignItems: 'center', minWidth: 120 },
  mediaPreviewFilename: { fontSize: 11, fontFamily: F.semi, color: C.text, marginTop: 6, textAlign: 'center' },
  mediaPreviewFilesize: { fontSize: 10, fontFamily: F.medium, color: C.dim, marginTop: 2 },
  mediaPreviewRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center' },

  uploadProgressContainer: { marginBottom: 10 },
  uploadProgressBar: { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  uploadProgressFill: { height: '100%', backgroundColor: C.accent },
  uploadProgressText: { fontSize: 10, fontFamily: F.medium, color: C.dim, marginTop: 4, textAlign: 'center' },

  // Attachment sheet
  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  attachSheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  attachHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
  attachTitle: { fontSize: 18, fontFamily: F.bold, color: C.text, marginBottom: 18 },
  attachGrid: { flexDirection: 'row', gap: 14 },
  attachOption: { flex: 1, alignItems: 'center', gap: 8 },
  attachIconBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  attachOptionText: { fontSize: 13, fontFamily: F.semi, color: C.text },

  // Options menu
  optionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  optionsMenu: { backgroundColor: C.card, borderRadius: 20, padding: 14, width: '80%', maxWidth: 300, borderWidth: 1, borderColor: C.border },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, gap: 14 },
  optionText: { fontSize: 15, fontFamily: F.semi, color: C.text },
  optionDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },

  // Coach Profile
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileModal: { flex: 1, backgroundColor: C.card, marginTop: 60, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  profileCloseBtn: { position: 'absolute', top: 18, right: 18, padding: 6, zIndex: 10 },
  profileHeader: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  profileAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  profileAvatarText: { fontSize: 38 },
  profileName: { fontSize: 22, fontFamily: F.bold, color: C.text, marginBottom: 4 },
  profileSpecialty: { fontSize: 14, fontFamily: F.medium, color: C.dim, marginBottom: 10 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.accentSoft, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, gap: 6 },
  profileBadgeText: { fontSize: 12, fontFamily: F.semi, color: C.accent },
  profileContent: { flex: 1, paddingHorizontal: PAD },
  profileSection: { marginTop: 20, marginBottom: 12 },
  profileSectionTitle: { fontSize: 17, fontFamily: F.bold, color: C.text, marginBottom: 10 },
  profileTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileTag: { backgroundColor: C.accentSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  profileTagText: { fontSize: 13, fontFamily: F.semi, color: C.accent },
  availItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  availText: { fontSize: 14, fontFamily: F.regular, color: C.dim },

  // Settings
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  settingsModal: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '50%' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  settingsTitle: { fontSize: 20, fontFamily: F.bold, color: C.text },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: C.bg, borderRadius: 14, marginBottom: 10 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: F.semi, color: C.text },
  settingDesc: { fontSize: 12, fontFamily: F.regular, color: C.dim, marginTop: 2 },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: C.border, padding: 2 },
  toggleActive: { backgroundColor: C.accent },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.card },
  toggleThumbActive: { transform: [{ translateX: 22 }] },

  // Search
  searchOverlay: { flex: 1, backgroundColor: C.card },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.medium, color: C.text, paddingVertical: 4 },
  searchResultItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  searchResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  searchResultSender: { fontSize: 13, fontFamily: F.semi, color: C.accent },
  searchResultText: { fontSize: 14, fontFamily: F.regular, color: C.text },
  searchResultTime: { fontSize: 11, fontFamily: F.medium, color: C.dim },
  emptySearch: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptySearchTitle: { fontSize: 17, fontFamily: F.bold, color: C.text, marginTop: 12, marginBottom: 4 },
  emptySearchText: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 14, fontFamily: F.medium, color: C.dim, marginTop: 14 },

  // No coach / empty states
  noCoachContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  noCoachIconContainer: { width: 110, height: 110, borderRadius: 55, backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  noCoachTitle: { fontSize: 22, fontFamily: F.bold, color: C.text, marginBottom: 12, textAlign: 'center' },
  noCoachDescription: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center', paddingHorizontal: 20, marginBottom: 24, lineHeight: 22 },
  noCoachFeatures: { width: '100%', maxWidth: 300, gap: 14, marginBottom: 28 },
  noCoachFeature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noCoachFeatureText: { fontSize: 14, fontFamily: F.medium, color: C.text },
  noCoachButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.cardDark, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28 },
  noCoachButtonText: { fontSize: 15, fontFamily: F.semi, color: '#FFF' },

  // Client selector
  clientSelectorHeader: { paddingHorizontal: PAD, paddingTop: 24, paddingBottom: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  clientSelectorTitle: { fontSize: 20, fontFamily: F.bold, color: C.text, textAlign: 'center' },
  clientListContent: { padding: PAD, paddingBottom: 100 },
  clientCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: C.card, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  clientAvatarText: { fontSize: 18, fontFamily: F.bold, color: '#FFF' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontFamily: F.semi, color: C.text, marginBottom: 3 },
  clientMeta: { fontSize: 13, fontFamily: F.regular, color: C.dim },
});
