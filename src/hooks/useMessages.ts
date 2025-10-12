import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export const useMessages = (coachId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMessages = async () => {
    console.log('[useMessages] fetchMessages called - user:', user?.id, 'coachId:', coachId);
    
    if (!user || !coachId) {
      console.log('[useMessages] Missing user or coachId, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      console.log('[useMessages] Fetching messages...');
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      
      console.log('[useMessages] ✅ Fetched', data?.length || 0, 'messages');
      setMessages(data || []);
      
      const unread = data?.filter(msg => 
        msg.receiver_id === user.id && 
        msg.sender_id === coachId && 
        !msg.is_read
      ).length || 0;
      
      setUnreadCount(unread);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
      console.error('[useMessages] ❌ Error fetching messages:', err);
    } finally {
      console.log('[useMessages] Setting loading to FALSE (completed)');
      setLoading(false);
    }
  };

  const sendMessage = async (
    messageText: string | null, 
    receiverId: string,
    mediaUrl?: string | null,
    mediaType?: string | null,
    mediaFilename?: string | null,
    mediaSize?: number | null
  ) => {
    if (!user) return { data: null, error: 'No user logged in' };
    if (!messageText?.trim() && !mediaUrl) return { data: null, error: 'Message cannot be empty' };
    if (!receiverId) return { data: null, error: 'No receiver specified' };

    try {
      const newMessage: MessageInsert = {
        sender_id: user.id,
        receiver_id: receiverId,
        message_text: messageText?.trim() || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        media_filename: mediaFilename || null,
        media_size: mediaSize || null,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }
      
      setMessages(prev => [...prev, data]);
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Failed to send message:', err);
      return { data: null, error: err.message || 'Failed to send message' };
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', messageIds)
        .eq('receiver_id', user.id);

      if (updateError) throw updateError;
      
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) 
          ? { ...msg, is_read: true, read_at: new Date().toISOString() }
          : msg
      ));
      
      setUnreadCount(prev => Math.max(0, prev - messageIds.length));
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !coachId) return;

    try {
      const unreadMessages = messages.filter(msg => 
        msg.receiver_id === user.id && 
        msg.sender_id === coachId && 
        !msg.is_read
      );

      if (unreadMessages.length === 0) return;

      const messageIds = unreadMessages.map(msg => msg.id);
      await markAsRead(messageIds);
    } catch (err: any) {
      console.error('Error marking all messages as read:', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (deleteError) throw deleteError;
      
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to delete message' };
    }
  };

  const clearChatHistory = async () => {
    if (!user || !coachId) return { error: 'No user or coach specified' };

    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${user.id})`);

      if (deleteError) throw deleteError;
      
      setMessages([]);
      setUnreadCount(0);
      
      return { error: null };
    } catch (err: any) {
      console.error('Failed to clear chat history:', err);
      return { error: err.message || 'Failed to clear chat history' };
    }
  };

  useEffect(() => {
    console.log('[useMessages] useEffect triggered - user:', user?.id, 'coachId:', coachId);
    
    if (user && coachId) {
      console.log('[useMessages] Both user and coachId present, fetching messages');
      fetchMessages();

      const channel = supabase
        .channel('messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${user.id}))`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
              });
              
              if (newMessage.sender_id === coachId && newMessage.receiver_id === user.id && !newMessage.is_read) {
                setUnreadCount(prev => prev + 1);
                
                supabase.from('notifications').insert({
                  user_id: user.id,
                  title: 'New Message',
                  message: `You have a new message from your coach`,
                  type: 'chat',
                  is_read: false,
                }).then(({ error }) => {
                  if (error) console.error('Failed to create notification:', error);
                });
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMessage = payload.new as Message;
              setMessages(prev => prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              ));
              
              if (updatedMessage.is_read && updatedMessage.receiver_id === user.id) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedMessage = payload.old as Message;
              setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      console.log('[useMessages] No coachId, setting loading to false and clearing messages');
      setMessages([]);
      setLoading(false);
    }
  }, [user, coachId]);

  return {
    messages,
    loading,
    error,
    unreadCount,
    sendMessage,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    clearChatHistory,
    fetchMessages,
  };
};
