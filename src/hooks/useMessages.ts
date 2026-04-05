import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export const useMessages = (coachId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFetchingRef = useRef(false);
  const channelRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);

      const query = coachId
        ? supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true })
        : supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setMessages(data || []);

      const unread = data?.filter(msg =>
        msg.receiver_id === user.id &&
        (!coachId || msg.sender_id === coachId) &&
        !msg.is_read
      ).length || 0;

      setUnreadCount(unread);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
      console.error('[useMessages] Error fetching messages:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?.id, coachId]);

  const sendMessage = useCallback(async (
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

      if (insertError) throw insertError;

      // Deduplicate: only add if not already present (subscription may have added it)
      setMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      return { data, error: null };
    } catch (err: any) {
      console.error('Failed to send message:', err);
      return { data: null, error: err.message || 'Failed to send message' };
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
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
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user || !coachId) return;

    const unreadMessages = messages.filter(msg =>
      msg.receiver_id === user.id &&
      msg.sender_id === coachId &&
      !msg.is_read
    );

    if (unreadMessages.length === 0) return;
    await markAsRead(unreadMessages.map(msg => msg.id));
  }, [user?.id, coachId, messages, markAsRead]);

  const deleteMessage = useCallback(async (messageId: string) => {
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
  }, [user?.id]);

  const clearChatHistory = useCallback(async () => {
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
  }, [user?.id, coachId]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    // Use unique channel name per user+partner combo to avoid conflicts
    const channelName = coachId
      ? `msgs_${user.id}_${coachId}`
      : `msgs_${user.id}_all`;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: coachId
            ? `or(and(sender_id.eq.${user.id},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${user.id}))`
            : `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            if (newMessage.receiver_id === user.id && !newMessage.is_read && (!coachId || newMessage.sender_id === coachId)) {
              setUnreadCount(prev => prev + 1);
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

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, coachId]);

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
