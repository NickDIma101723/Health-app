import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, fontSizes } from "../constants/theme";
import { BackgroundDecorations } from "../components/BackgroundDecorations";
import { BottomNavigation } from "../components/BottomNavigation";
import { CoachBottomNavigation } from "../components/CoachBottomNavigation";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../hooks/useMessages";
import { useCoaches } from "../hooks/useCoaches";

interface ChatScreenProps {
  onNavigate?: (screen: string, params?: any) => void;
  clientId?: string;
  clientName?: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, clientId, clientName }) => {
  console.log('[ChatScreen] 🔍 Received props:', { clientId, clientName });
  
  const { user, isCoach } = useAuth();
  const { myCoach, loading: coachLoading } = useCoaches();
  const [newMessage, setNewMessage] = useState("");
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loadingClientProfile, setLoadingClientProfile] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Fetch client profile when clientId is provided
  useEffect(() => {
    const fetchClientProfile = async () => {
      if (isCoach && clientId) {
        setLoadingClientProfile(true);
        try {
          const { supabase } = await import('../lib/supabase');
          console.log('[ChatScreen] Fetching profile for clientId:', clientId);
          
          // Try to get client info from profiles table directly
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, fitness_level, bio')
            .eq('user_id', clientId)
            .single();

          console.log('[ChatScreen] Profile fetch result:', { data: profileData?.full_name, error: profileError });
          
          if (profileData && !profileError) {
            setClientProfile(profileData);
          } else {
            console.error('[ChatScreen] Profile fetch failed:', profileError);
          }
        } catch (error) {
          console.error('[ChatScreen] Error fetching client profile:', error);
        } finally {
          setLoadingClientProfile(false);
        }
      }
    };

    fetchClientProfile();
  }, [isCoach, clientId]);
  
  // Determine chat partner
  const chatPartnerId = isCoach ? clientId : myCoach?.user_id;
  const partnerName = isCoach ? 
    (clientName || clientProfile?.full_name || (loadingClientProfile ? "Loading..." : "Client")) : 
    (myCoach?.full_name || "Coach");
    
  console.log('[ChatScreen] Partner info:', {
    isCoach,
    clientId,
    clientProfile: clientProfile?.full_name,
    loadingClientProfile,
    partnerName
  });
  
  // Get real messages from database
  const { 
    messages, 
    loading: messagesLoading, 
    sendMessage, 
    markAsRead 
  } = useMessages(chatPartnerId);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatPartnerId) return;
    
    try {
      await sendMessage(newMessage.trim(), chatPartnerId);
      setNewMessage("");
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Show loading if we don't have chat partner info yet
  if (isCoach && !clientId) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No client selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isCoach && coachLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundDecorations />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecorations />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate?.("chat-list")}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.profileInfo}
          onPress={() => {
            if (isCoach && clientId) {
              onNavigate?.('coach-client-detail', { clientId });
            }
          }}
          activeOpacity={isCoach ? 0.7 : 1}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {partnerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{partnerName}</Text>
            <Text style={styles.profileStatus}>
              {isCoach ? 
                'View Profile' : 
                (myCoach?.specialization || 'Health Coach')
              }
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowChatMenu(true)}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
      >
        {messagesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <MaterialIcons name="chat-bubble-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyDescription}>
              Send your first message to begin chatting
            </Text>
          </View>
        ) : (
          messages.map((message) => {
            const isFromMe = message.sender_id === user?.id;
            const messageTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <View
                key={message.id}
                style={[
                  styles.messageBox,
                  isFromMe ? styles.myMessageBox : styles.theirMessageBox
                ]}
              >
                <Text style={[
                  styles.messageText,
                  isFromMe ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {message.message_text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  isFromMe ? styles.myMessageTime : styles.theirMessageTime
                ]}>
                  {messageTime}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <MaterialIcons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {isCoach ? (
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

      {/* Chat Menu Modal */}
      <Modal
        visible={showChatMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChatMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChatMenu(false)}
        >
          <View style={styles.chatMenuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowChatMenu(false);
                setShowSearchMessages(true);
              }}
            >
              <MaterialIcons name="search" size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Search in chat</Text>
            </TouchableOpacity>

            {isCoach && clientId && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowChatMenu(false);
                  onNavigate?.('coach-client-detail', { clientId });
                }}
              >
                <MaterialIcons name="person" size={20} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>View Profile</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowChatMenu(false);
                // TODO: Implement delete conversation
                console.log('Delete conversation');
              }}
            >
              <MaterialIcons name="delete" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>Delete conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowChatMenu(false);
                // TODO: Implement notification settings
                console.log('Notification settings');
              }}
            >
              <MaterialIcons name="notifications" size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Search Messages Modal */}
      <Modal
        visible={showSearchMessages}
        animationType="slide"
        onRequestClose={() => setShowSearchMessages(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.searchHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowSearchMessages(false)}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
          </View>
          
          <View style={styles.searchResults}>
            {searchQuery.length > 0 ? (
              messages
                .filter(msg => msg.message_text?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(msg => (
                  <TouchableOpacity
                    key={msg.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchMessages(false);
                      setSearchQuery('');
                      // TODO: Scroll to message in chat
                    }}
                  >
                    <Text style={styles.searchResultSender}>
                      {msg.sender_id === user?.id ? 'You' : partnerName}
                    </Text>
                    <Text style={styles.searchResultText} numberOfLines={2}>
                      {msg.message_text}
                    </Text>
                    <Text style={styles.searchResultTime}>
                      {new Date(msg.created_at).toLocaleDateString()}
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
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  messagesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  messageBox: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    maxWidth: "80%",
  },
  myMessageBox: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
  },
  theirMessageBox: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
  },
  messageText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  messageTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: "center",
  },
  myMessageText: {
    fontSize: fontSizes.md,
    color: colors.surface,
  },
  theirMessageText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  myMessageTime: {
    fontSize: fontSizes.xs,
    color: colors.surface,
    marginTop: spacing.xs,
    opacity: 0.8,
    textAlign: "right",
  },
  theirMessageTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  profileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  profileAvatarText: {
    fontSize: fontSizes.lg,
    fontWeight: "700",
    color: colors.surface,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  profileStatus: {
    fontSize: fontSizes.sm,
    color: colors.success,
  },
  profileButton: {
    padding: spacing.xs,
  },
  menuButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatMenuContainer: {
    backgroundColor: colors.card,
    margin: spacing.md,
    borderRadius: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 5,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultSender: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  searchResultText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  searchResultTime: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  emptySearch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptySearchTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySearchText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
