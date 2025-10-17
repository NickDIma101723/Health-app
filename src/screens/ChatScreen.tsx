import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Image,
  Modal,
  Keyboard,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomNavigation,
  BackgroundDecorations,
  CoachBottomNavigation,
} from '../components';
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
import { colors, spacing, fontSizes, borderRadius, shadows, gradients } from '../constants/theme';

const { width } = Dimensions.get('window');

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

interface CoachInfo {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

const myCoach: CoachInfo = {
  id: 'coach_1',
  name: 'Sarah Johnson',
  specialty: 'Health & Wellness Coach',
  avatar: '👩‍⚕️',
  isOnline: true,
};

const mockMessages: Message[] = [];

interface ChatScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  clientId?: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, clientId }) => {
  const { user, isCoach, coachData } = useAuth();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
  const { myCoach, loading: coachLoading, fetchMyCoach } = useCoaches();
  const chatPartnerId = isCoach ? selectedClient?.user_id : myCoach?.user_id;
  
  const { 
    messages: dbMessages, 
    loading: messagesLoading, 
    sendMessage: dbSendMessage,
    markAllAsRead,
    clearChatHistory: dbClearChatHistory,
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
  
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const typingDots = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Refresh coach assignment when screen loads
  useEffect(() => {
    console.log('[ChatScreen] Screen mounted - refreshing coach data');
    if (!isCoach && user) {
      fetchMyCoach();
    }
  }, []);

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

        if (!assignments || assignments.length === 0) {
          setClientsList([]);
          setLoadingClients(false);
          return;
        }

        const clientIds = assignments.map(a => a.client_user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', clientIds);

        if (profileError) throw profileError;

        setClientsList(profiles || []);
      } catch (err) {
        console.error('[ChatScreen] Error loading clients:', err);
        setClientsList([]);
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, [isCoach, coachData]);

  useEffect(() => {
    if (clientId && clientsList.length > 0) {
      const client = clientsList.find(c => c.user_id === clientId);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [clientId, clientsList]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    const chatPartner = isCoach ? selectedClient : myCoach;
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
      
      if (unreadCount > 0) {
        markAllAsRead();
      }
    }
  }, [dbMessages, myCoach, selectedClient, isCoach, user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  useEffect(() => {
    if (isCoachTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingDots, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDots, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingDots.setValue(0);
    }
  }, [isCoachTyping]);

  useEffect(() => {
    console.log('[ChatScreen] Loading states - coachLoading:', coachLoading, 'messagesLoading:', messagesLoading, 'myCoach:', myCoach?.id || 'null', 'isCoach:', isCoach, 'selectedClient:', selectedClient?.user_id || 'null');
  }, [coachLoading, messagesLoading, myCoach, isCoach, selectedClient]);

  const sendMessage = async () => {
    const chatPartner = isCoach ? selectedClient : myCoach;
    if ((!inputText.trim() && !selectedMedia) || !chatPartner || !user) return;

    const messageText = inputText.trim() || null;
    setInputText('');

    const receiverId = chatPartner.user_id;
    
    if (!receiverId) {
      Alert.alert('Error', 'Receiver user ID not configured. Please contact support.');
      return;
    }

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let mediaFilename: string | null = null;
      let mediaSize: number | null = null;

      if (selectedMedia) {
        setIsUploading(true);
        
        const uploadResult = await uploadMediaToStorage(
          selectedMedia,
          user.id,
          (progress) => setUploadProgress(progress)
        );

        if (uploadResult.error) {
          Alert.alert('Upload Failed', uploadResult.error);
          setIsUploading(false);
          setUploadProgress(null);
          return;
        }

        mediaUrl = uploadResult.url;
        mediaType = selectedMedia.type;
        mediaFilename = selectedMedia.filename;
        mediaSize = selectedMedia.size;
        
        setSelectedMedia(null);
        setIsUploading(false);
        setUploadProgress(null);
      }

      const result = await dbSendMessage(
        messageText, 
        receiverId,
        mediaUrl,
        mediaType,
        mediaFilename,
        mediaSize
      );
      
      if (result.error) {
        console.error('Failed to send message:', result.error);
        Alert.alert('Send Failed', result.error);
      }

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAttachmentPress = () => {
    Keyboard.dismiss();
    setShowAttachmentOptions(true);
  };

  const handleTakePhoto = async () => {
    setShowAttachmentOptions(false);
    const media = await pickImageFromCamera();
    if (media) {
      setSelectedMedia(media);
    }
  };

  const handlePickImage = async () => {
    setShowAttachmentOptions(false);
    const media = await pickImageFromGallery();
    if (media) {
      setSelectedMedia(media);
    }
  };

  const handlePickDocument = async () => {
    setShowAttachmentOptions(false);
    const media = await pickDocument();
    if (media) {
      setSelectedMedia(media);
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleClearChat = async () => {
    if (!myCoach) return;
    
    const result = await dbClearChatHistory();
    if (result.error) {
      console.error('Failed to clear chat:', result.error);
    }
    setShowOptionsMenu(false);
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(msg => 
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const renderMessage = (message: Message, index: number) => {
    const isLastInGroup = index === messages.length - 1 || 
      messages[index + 1]?.isCoach !== message.isCoach;

    return (
      <View
        key={message.id}
        style={[
          styles.messageRow,
          message.isCoach ? styles.messageRowCoach : styles.messageRowUser,
        ]}
      >
        {message.isCoach && (
          <View style={styles.coachAvatar}>
            <Text style={styles.coachAvatarText}>👤</Text>
          </View>
        )}
        
        <View
          style={[
            styles.messageBubble,
            message.isCoach ? styles.messageBubbleCoach : styles.messageBubbleUser,
            { maxWidth: width * 0.75 },
          ]}
        >
          {message.isCoach && (
            <Text style={styles.senderName}>{message.senderName}</Text>
          )}
          
          {message.mediaUrl && message.mediaType === 'image' && (
            <TouchableOpacity 
              onPress={() => Linking.openURL(message.mediaUrl!)}
              style={styles.mediaImageContainer}
            >
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {message.mediaUrl && message.mediaType === 'document' && (
            <TouchableOpacity 
              onPress={() => Linking.openURL(message.mediaUrl!)}
              style={styles.mediaDocumentContainer}
            >
              <MaterialIcons 
                name="insert-drive-file" 
                size={24} 
                color={message.isCoach ? colors.primary : colors.textLight} 
              />
              <View style={styles.mediaDocumentInfo}>
                <Text 
                  style={[
                    styles.mediaDocumentName,
                    message.isCoach ? styles.messageTextCoach : styles.messageTextUser
                  ]}
                  numberOfLines={1}
                >
                  {message.mediaFilename}
                </Text>
                {message.mediaSize && (
                  <Text 
                    style={[
                      styles.mediaDocumentSize,
                      message.isCoach ? styles.messageTimeCoach : styles.messageTimeUser
                    ]}
                  >
                    {formatFileSize(message.mediaSize)}
                  </Text>
                )}
              </View>
              <MaterialIcons 
                name="download" 
                size={20} 
                color={message.isCoach ? colors.textSecondary : colors.textLight} 
              />
            </TouchableOpacity>
          )}
          
          {message.text && (
            <Text
              style={[
                styles.messageText,
                message.isCoach ? styles.messageTextCoach : styles.messageTextUser,
              ]}
            >
              {message.text}
            </Text>
          )}
          
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                message.isCoach ? styles.messageTimeCoach : styles.messageTimeUser,
              ]}
            >
              {formatTime(message.timestamp)}
            </Text>
            {!message.isCoach && message.status && (
              <MaterialIcons
                name={
                  message.status === 'read' ? 'done-all' :
                  message.status === 'delivered' ? 'done-all' :
                  message.status === 'sent' ? 'done' : 'schedule'
                }
                size={14}
                color={message.status === 'read' ? colors.primary : colors.textLight}
                style={styles.messageStatusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />
      
      {isCoach ? (
        !selectedClient ? (
          <View style={styles.clientSelectorContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Client to Chat</Text>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.clientListContent}
            >
              {loadingClients ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading clients...</Text>
                </View>
              ) : clientsList.length === 0 ? (
                <View style={styles.noCoachContent}>
                  <LinearGradient
                    colors={[colors.primaryLight, colors.primaryPale]}
                    style={styles.noCoachIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons name="people" size={64} color={colors.primary} />
                  </LinearGradient>
                  
                  <Text style={styles.noCoachTitle}>No Clients Assigned</Text>
                  <Text style={styles.noCoachDescription}>
                    You don't have any assigned clients yet. Go to the Clients tab to assign clients.
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.noCoachButton}
                    onPress={() => onNavigate?.('coach-dashboard')}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryLight]}
                      style={styles.noCoachButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialIcons name="people" size={20} color={colors.surface} />
                      <Text style={styles.noCoachButtonText}>View Clients</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                clientsList.map((client) => (
                  <TouchableOpacity
                    key={client.user_id}
                    style={styles.clientCard}
                    onPress={() => setSelectedClient(client)}
                  >
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {client.full_name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.full_name || 'Unknown'}</Text>
                      <Text style={styles.clientMeta}>
                        {client.fitness_level ? `${client.fitness_level} level` : 'New client'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <CoachBottomNavigation
              activeTab="chat"
              onTabChange={(tab) => onNavigate?.(tab)}
            />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setSelectedClient(null)}
              >
                <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              
              <View style={styles.coachInfoHeader}>
                <View style={styles.coachAvatarHeader}>
                  <Text style={styles.coachAvatarHeaderText}>
                    {selectedClient.full_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.coachDetails}>
                  <Text style={styles.coachName}>{selectedClient.full_name || 'Client'}</Text>
                  <Text style={styles.coachStatus}>
                    {selectedClient.fitness_level ? `${selectedClient.fitness_level} level` : 'Your Client'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => onNavigate?.('coach-client-detail', { clientId: selectedClient.user_id })}
              >
                <MaterialIcons name="info-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={[
                styles.messagesContent,
                { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 100 }
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <LinearGradient
                      colors={[colors.primaryLight, colors.primaryPale]}
                      style={styles.welcomeGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <MaterialIcons name="chat" size={32} color={colors.primary} />
                      <Text style={styles.welcomeTitle}>Start Conversation</Text>
                      <Text style={styles.welcomeText}>
                        Send a message to {selectedClient.full_name} to start the conversation.
                      </Text>
                    </LinearGradient>
                  </View>
                ) : (
                  messages.map((message, index) => renderMessage(message, index))
                )}
              </Animated.View>
            </ScrollView>

            <View style={[styles.inputContainer, { marginBottom: keyboardHeight > 0 ? 0 : spacing.lg }]}>
              {selectedMedia && (
                <View style={styles.mediaPreview}>
                  <Image 
                    source={{ uri: selectedMedia.uri }}
                    style={styles.mediaPreviewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => setSelectedMedia(null)}
                  >
                    <MaterialIcons name="close" size={20} color={colors.surface} />
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={() => setShowAttachmentOptions(true)}
                >
                  <MaterialIcons name="attach-file" size={24} color={colors.primary} />
                </TouchableOpacity>

                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={1000}
                />

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (inputText.trim() || selectedMedia) && styles.sendButtonActive
                  ]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() && !selectedMedia}
                >
                  <LinearGradient
                    colors={
                      inputText.trim() || selectedMedia
                        ? [colors.primary, colors.primaryDark]
                        : [colors.border, colors.border]
                    }
                    style={styles.sendButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons
                      name="send"
                      size={20}
                      color={inputText.trim() || selectedMedia ? colors.surface : colors.textSecondary}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <CoachBottomNavigation
              activeTab="chat"
              onTabChange={(tab) => onNavigate?.(tab)}
            />

            <Modal
              visible={showAttachmentOptions}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowAttachmentOptions(false)}
            >
              <TouchableOpacity
                style={styles.attachmentModalOverlay}
                activeOpacity={1}
                onPress={() => setShowAttachmentOptions(false)}
              >
                <View style={styles.attachmentOptions}>
                  <TouchableOpacity
                    style={styles.attachmentOption}
                    onPress={handleTakePhoto}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentOption}
                    onPress={handlePickImage}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.accentLight }]}>
                      <MaterialIcons name="photo-library" size={24} color={colors.accent} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Choose Image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentOption}
                    onPress={handlePickDocument}
                  >
                    <View style={[styles.attachmentIconContainer, { backgroundColor: colors.secondaryLight }]}>
                      <MaterialIcons name="insert-drive-file" size={24} color={colors.secondary} />
                    </View>
                    <Text style={styles.attachmentOptionText}>Choose File</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </KeyboardAvoidingView>
        )
      ) : 
      (coachLoading || messagesLoading) && !myCoach ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : !myCoach ? (
        <View style={styles.noCoachContainer}>
          <View style={styles.noCoachContent}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryPale]}
              style={styles.noCoachIconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="face" size={64} color={colors.primary} />
            </LinearGradient>
            
            <Text style={styles.noCoachTitle}>No Coach Assigned Yet</Text>
            <Text style={styles.noCoachDescription}>
              You'll be assigned a personal health coach soon. They will help guide you on your wellness journey with personalized support and advice.
            </Text>
            
            <View style={styles.noCoachFeatures}>
              <View style={styles.noCoachFeature}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <Text style={styles.noCoachFeatureText}>Get personalized guidance tailored to your goals</Text>
              </View>
              <View style={styles.noCoachFeature}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <Text style={styles.noCoachFeatureText}>Message your coach anytime, anywhere</Text>
              </View>
              <View style={styles.noCoachFeature}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <Text style={styles.noCoachFeatureText}>Receive expert advice on health & wellness</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.noCoachButton}
              onPress={() => onNavigate?.('home')}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.noCoachButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.noCoachButtonText}>Return to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <BottomNavigation
            activeTab="chat"
            onTabChange={(tab) => onNavigate?.(tab)}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => onNavigate?.('home')}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.coachInfoHeader}>
              <View style={styles.coachAvatarHeader}>
                <Text style={styles.coachAvatarHeaderText}>👤</Text>
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.coachDetails}>
                <Text style={styles.coachName}>{myCoach.full_name}</Text>
                <Text style={styles.coachStatus}>
                  {myCoach.specialization || 'Health Coach'}
                </Text>
              </View>
            </View>

        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => setShowOptionsMenu(true)}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.welcomeCard}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primaryPale]}
                style={styles.welcomeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="verified" size={32} color={colors.primary} />
                <Text style={styles.welcomeTitle}>Your Personal Coach</Text>
                <Text style={styles.welcomeText}>
                  {myCoach.full_name} is your dedicated {(myCoach.specialization || 'health coach').toLowerCase()}. 
                  Messages are private and secure.
                </Text>
              </LinearGradient>
            </View>

            {messages.map((message, index) => renderMessage(message, index))}

            {isCoachTyping && (
              <View style={[styles.messageRow, styles.messageRowCoach]}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>👤</Text>
                </View>
                <View style={[styles.messageBubble, styles.messageBubbleCoach, styles.typingBubble]}>
                  <Animated.View style={styles.typingDots}>
                    <View style={[styles.typingDot, { opacity: typingDots }]} />
                    <View style={[styles.typingDot, { opacity: typingDots }]} />
                    <View style={[styles.typingDot, { opacity: typingDots }]} />
                  </Animated.View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            {selectedMedia && (
              <View style={styles.mediaPreview}>
                <View style={styles.mediaPreviewContent}>
                  {selectedMedia.type === 'image' ? (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.mediaPreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.mediaPreviewDocument}>
                      <MaterialIcons 
                        name="insert-drive-file" 
                        size={32} 
                        color={colors.primary} 
                      />
                      <Text style={styles.mediaPreviewFilename} numberOfLines={1}>
                        {selectedMedia.filename}
                      </Text>
                      <Text style={styles.mediaPreviewFilesize}>
                        {formatFileSize(selectedMedia.size)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.mediaPreviewRemove}
                    onPress={handleRemoveMedia}
                  >
                    <MaterialIcons name="close" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isUploading && uploadProgress && (
              <View style={styles.uploadProgressContainer}>
                <View style={styles.uploadProgressBar}>
                  <View 
                    style={[
                      styles.uploadProgressFill, 
                      { width: `${uploadProgress.percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.uploadProgressText}>
                  Uploading... {Math.round(uploadProgress.percentage)}%
                </Text>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={handleAttachmentPress}
                disabled={isUploading}
              >
                <MaterialIcons 
                  name="add-circle-outline" 
                  size={24} 
                  color={isUploading ? colors.border : colors.textSecondary} 
                />
              </TouchableOpacity>
              
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
                editable={!isUploading}
              />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (inputText.trim() || selectedMedia) && !isUploading && styles.sendButtonActive,
              ]}
              onPress={sendMessage}
              disabled={(!inputText.trim() && !selectedMedia) || isUploading}
            >
              <LinearGradient
                colors={(inputText.trim() || selectedMedia) && !isUploading
                  ? [colors.primary, colors.primaryDark] 
                  : [colors.border, colors.border]
                }
                style={styles.sendButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <MaterialIcons 
                    name="send" 
                    size={20} 
                    color={(inputText.trim() || selectedMedia) ? colors.textLight : colors.textSecondary} 
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={showAttachmentOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentOptions(false)}
      >
        <TouchableOpacity
          style={styles.attachmentModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentOptions(false)}
        >
          <View style={styles.attachmentOptions}>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleTakePhoto}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: colors.primaryLight }]}>
                <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
              </View>
              <Text style={styles.attachmentOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handlePickImage}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: colors.accentLight }]}>
                <MaterialIcons name="photo-library" size={24} color={colors.accent} />
              </View>
              <Text style={styles.attachmentOptionText}>Choose Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handlePickDocument}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: colors.secondaryLight }]}>
                <MaterialIcons name="insert-drive-file" size={24} color={colors.secondary} />
              </View>
              <Text style={styles.attachmentOptionText}>Choose File</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <BottomNavigation
        activeTab="chat"
        onTabChange={(tab) => onNavigate?.(tab)}
      />

      <Modal
        visible={showOptionsMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowCoachProfile(true);
              }}
            >
              <MaterialIcons name="person" size={24} color={colors.textPrimary} />
              <Text style={styles.optionText}>View Coach Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowNotificationSettings(true);
              }}
            >
              <MaterialIcons name="notifications" size={24} color={colors.textPrimary} />
              <Text style={styles.optionText}>Notification Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowSearchMessages(true);
              }}
            >
              <MaterialIcons name="search" size={24} color={colors.textPrimary} />
              <Text style={styles.optionText}>Search Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleClearChat}
            >
              <MaterialIcons name="delete-outline" size={24} color={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>Clear Chat History</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCoachProfile}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCoachProfile(false)}
      >
        <View style={styles.profileOverlay}>
          <View style={styles.profileModal}>
            <TouchableOpacity 
              style={styles.profileCloseButton}
              onPress={() => setShowCoachProfile(false)}
            >
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>👤</Text>
              </View>
              <Text style={styles.profileName}>{myCoach.full_name}</Text>
              <Text style={styles.profileSpecialty}>{myCoach.specialization || 'Health Coach'}</Text>
              <View style={styles.profileBadge}>
                <MaterialIcons name="verified" size={16} color={colors.primary} />
                <Text style={styles.profileBadgeText}>Verified Coach</Text>
              </View>
            </View>

            <ScrollView style={styles.profileContent}>
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>About</Text>
                <Text style={styles.profileSectionText}>
                  Sarah is a certified health and wellness coach with over 10 years of experience 
                  helping clients achieve their fitness and nutrition goals. She specializes in 
                  sustainable lifestyle changes and holistic wellness approaches.
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Specializations</Text>
                <View style={styles.profileTags}>
                  <View style={styles.profileTag}>
                    <Text style={styles.profileTagText}>Nutrition</Text>
                  </View>
                  <View style={styles.profileTag}>
                    <Text style={styles.profileTagText}>Fitness</Text>
                  </View>
                  <View style={styles.profileTag}>
                    <Text style={styles.profileTagText}>Mindfulness</Text>
                  </View>
                  <View style={styles.profileTag}>
                    <Text style={styles.profileTagText}>Sleep Health</Text>
                  </View>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Certifications</Text>
                <View style={styles.certificationItem}>
                  <MaterialIcons name="school" size={20} color={colors.primary} />
                  <Text style={styles.certificationText}>Certified Health Coach (CHC)</Text>
                </View>
                <View style={styles.certificationItem}>
                  <MaterialIcons name="school" size={20} color={colors.primary} />
                  <Text style={styles.certificationText}>Registered Dietitian Nutritionist</Text>
                </View>
                <View style={styles.certificationItem}>
                  <MaterialIcons name="school" size={20} color={colors.primary} />
                  <Text style={styles.certificationText}>Certified Personal Trainer</Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Availability</Text>
                <View style={styles.availabilityItem}>
                  <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
                  <Text style={styles.availabilityText}>Monday - Friday: 9:00 AM - 6:00 PM</Text>
                </View>
                <View style={styles.availabilityItem}>
                  <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
                  <Text style={styles.availabilityText}>Response time: Usually within 2 hours</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotificationSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationSettings(false)}
      >
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Chat Notifications</Text>
              <TouchableOpacity 
                onPress={() => setShowNotificationSettings(false)}
                style={styles.settingsCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsList}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                <View style={styles.settingInfo}>
                  <MaterialIcons 
                    name={notificationsEnabled ? "notifications-active" : "notifications-off"} 
                    size={24} 
                    color={notificationsEnabled ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Push Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Receive notifications for new messages
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.toggle,
                  notificationsEnabled && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notificationsEnabled && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setSoundEnabled(!soundEnabled)}
              >
                <View style={styles.settingInfo}>
                  <MaterialIcons 
                    name={soundEnabled ? "volume-up" : "volume-off"} 
                    size={24} 
                    color={soundEnabled ? colors.primary : colors.textSecondary} 
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Sound</Text>
                    <Text style={styles.settingDescription}>
                      Play sound for new messages
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.toggle,
                  soundEnabled && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    soundEnabled && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <MaterialIcons name="schedule" size={24} color={colors.textSecondary} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Quiet Hours</Text>
                    <Text style={styles.settingDescription}>
                      Mute notifications during specific hours
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSearchMessages}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchMessages(false)}
      >
        <View style={styles.searchOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <TouchableOpacity 
                onPress={() => setShowSearchMessages(false)}
                style={styles.searchBackButton}
              >
                <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.searchInputContainer}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search messages..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={styles.searchResults}>
              {messages.length === 0 ? (
                <View style={styles.emptySearch}>
                  <MaterialIcons name="forum" size={64} color={colors.border} />
                  <Text style={styles.emptySearchTitle}>No messages yet</Text>
                  <Text style={styles.emptySearchText}>
                    Start a conversation with your coach to begin!
                  </Text>
                </View>
              ) : searchQuery.length > 0 ? (
                messages
                  .filter(msg => msg.text?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((msg) => (
                    <TouchableOpacity
                      key={msg.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setShowSearchMessages(false);
                        setSearchQuery('');
                      }}
                    >
                      <Text style={styles.searchResultSender}>{msg.senderName}</Text>
                      <Text style={styles.searchResultText} numberOfLines={2}>
                        {msg.text}
                      </Text>
                      <Text style={styles.searchResultTime}>
                        {msg.timestamp.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))
              ) : (
                <View style={styles.emptySearch}>
                  <MaterialIcons name="search" size={64} color={colors.border} />
                  <Text style={styles.emptySearchTitle}>Search Messages</Text>
                  <Text style={styles.emptySearchText}>
                    Type to search through your conversation history
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  coachInfoHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatarHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
  },
  coachAvatarHeaderText: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  coachStatus: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.primary,
  },
  infoButton: {
    padding: spacing.xs,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  emptyState: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  welcomeGradient: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  welcomeText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  messageRowCoach: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  coachAvatarText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  messageBubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  messageBubbleCoach: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: borderRadius.sm,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.sm,
  },
  senderName: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    lineHeight: 20,
  },
  messageTextCoach: {
    color: colors.textPrimary,
  },
  messageTextUser: {
    color: colors.textLight,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  messageTimeCoach: {
    color: colors.textSecondary,
  },
  messageTimeUser: {
    color: colors.primaryPale,
  },
  messageStatusIcon: {
    marginLeft: spacing.xs,
  },
  typingBubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  mediaImageContainer: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
  },
  mediaDocumentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  mediaDocumentInfo: {
    flex: 1,
  },
  mediaDocumentName: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: spacing.xs,
  },
  mediaDocumentSize: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 130,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  attachButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    maxHeight: 100,
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    textAlignVertical: 'center',
  },
  sendButton: {
    marginLeft: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    ...shadows.sm,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: '80%',
    maxWidth: 300,
    ...shadows.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  optionText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  profileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  profileModal: {
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
  },
  profileCloseButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.xs,
    zIndex: 10,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileAvatarText: {
    fontSize: 48,
    fontFamily: 'Poppins_700Bold',
  },
  profileName: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  profileSpecialty: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryPale,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  profileBadgeText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  profileSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  profileSectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  profileSectionText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  profileTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profileTag: {
    backgroundColor: colors.primaryPale,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  profileTagText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  certificationText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  availabilityText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    height: '60%',
    ...shadows.lg,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold',
  },
  settingsCloseButton: {
    padding: spacing.xs,
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: 'Quicksand_600SemiBold',
  },
  settingDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: 'Quicksand_500Medium',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  searchModal: {
    flex: 1,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchBackButton: {
    padding: spacing.xs,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  searchResultItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultSender: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  searchResultText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  searchResultTime: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  emptySearch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptySearchTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySearchText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  noCoachContainer: {
    flex: 1,
  },
  noCoachContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  noCoachIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  noCoachTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  noCoachDescription: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    lineHeight: fontSizes.md * 1.6,
  },
  noCoachFeatures: {
    width: '100%',
    maxWidth: 300,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  noCoachFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noCoachFeatureText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  noCoachButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.sm,
  },
  noCoachButtonGradient: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  noCoachButtonText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textLight,
    textAlign: 'center',
  },
  noCoachText: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  noCoachSubtext: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  mediaPreview: {
    marginBottom: spacing.md,
  },
  mediaPreviewContent: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  mediaPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  mediaPreviewDocument: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: 150,
  },
  mediaPreviewFilename: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  mediaPreviewFilesize: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mediaPreviewRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  uploadProgressContainer: {
    marginBottom: spacing.md,
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  uploadProgressText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  attachmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentOptions: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
  },
  attachmentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentOptionText: {
    fontSize: fontSizes.md,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textPrimary,
  },
  clientSelectorContainer: {
    flex: 1,
  },
  clientListContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
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
    fontSize: fontSizes.xxl,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSizes.lg,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  clientMeta: {
    fontSize: fontSizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontFamily: 'Poppins_700Bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
});

