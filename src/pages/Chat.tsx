
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const Chat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationId || null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [conversationId]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id)
        `)
        .eq('conversation_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      if (!data) return [];

      // For each conversation, fetch the latest message separately
      const conversationsWithMessages = await Promise.all(
        data.map(async (conversation) => {
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) {
            console.error('Error fetching messages for conversation:', messagesError);
            return {
              ...conversation,
              messages: []
            };
          }

          // Get sender profiles for messages
          const messageWithProfiles = await Promise.all(
            (messagesData || []).map(async (message) => {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', message.sender_id)
                .single();

              if (profileError) {
                console.error('Error fetching profile:', profileError);
                return {
                  ...message,
                  profiles: {
                    full_name: 'Unknown User',
                    avatar_url: null
                  }
                };
              }

              return {
                ...message,
                profiles: profileData || {
                  full_name: 'Unknown User',
                  avatar_url: null
                }
              };
            })
          );

          return {
            ...conversation,
            messages: messageWithProfiles
          };
        })
      );

      return conversationsWithMessages;
    },
    enabled: !!user,
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations || []}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
      />
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow conversationId={selectedConversation} />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

export default Chat;
