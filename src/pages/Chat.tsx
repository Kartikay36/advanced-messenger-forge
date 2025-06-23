
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { EmptyChat } from '@/components/chat/EmptyChat';
import { supabase } from '@/lib/supabase';
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
          conversation_participants!inner(user_id),
          messages(
            id,
            content,
            created_at,
            sender_id,
            profiles:sender_id(full_name, avatar_url)
          )
        `)
        .eq('conversation_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
