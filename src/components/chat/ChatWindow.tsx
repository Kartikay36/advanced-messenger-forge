
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
}

export const ChatWindow = ({ conversationId }: ChatWindowProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants(
            user_id,
            role,
            profiles!conversation_participants_user_id_fkey(full_name, avatar_url, is_online)
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        throw error;
      }
      return data;
    },
    enabled: !!conversationId,
  });

  // Fetch messages with proper error handling and type safety
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      // First, get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      if (!messagesData || messagesData.length === 0) {
        return [];
      }

      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      // Fetch profiles for all senders
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles by ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine messages with profiles, ensuring proper typing
      return messagesData.map(message => ({
        ...message,
        profiles: profilesMap.get(message.sender_id) || {
          full_name: 'Unknown User',
          avatar_url: null
        }
      }));
    },
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      content, 
      messageType = 'text', 
      fileUrl, 
      fileName, 
      fileSize 
    }: { 
      content: string; 
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (
    content: string, 
    messageType?: string, 
    fileUrl?: string, 
    fileName?: string, 
    fileSize?: number
  ) => {
    if (content.trim()) {
      sendMessageMutation.mutate({ 
        content: content.trim(), 
        messageType, 
        fileUrl, 
        fileName, 
        fileSize 
      });
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader conversation={conversation} />
      <MessageList 
        messages={messages || []} 
        currentUserId={user?.id || ''} 
        isLoading={isLoading}
      />
      <div ref={messagesEndRef} />
      <MessageInput 
        onSendMessage={handleSendMessage}
        isLoading={sendMessageMutation.isPending}
      />
    </div>
  );
};
