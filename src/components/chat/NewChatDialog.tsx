
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, MessageCircle } from 'lucide-react';
import { UserSearch } from '@/components/search/UserSearch';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/groups/JoinGroupDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewChatDialogProps {
  onChatCreated: (conversationId: string) => void;
}

export const NewChatDialog = ({ onChatCreated }: NewChatDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const createDirectChat = async (selectedUser: any) => {
    if (!user) {
      toast.error('You must be logged in to create a chat');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating direct chat with user:', selectedUser.id);
      
      // Check if direct conversation already exists by looking at participants
      const { data: existingParticipants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            is_group,
            name
          )
        `)
        .eq('user_id', user.id);

      if (participantsError) {
        console.error('Error checking participants:', participantsError);
        throw participantsError;
      }

      console.log('User participates in conversations:', existingParticipants);

      // For each conversation the user participates in, check if it's a direct chat with the selected user
      let existingDirectChat = null;
      if (existingParticipants && existingParticipants.length > 0) {
        for (const participant of existingParticipants) {
          const conversation = participant.conversations;
          
          // Skip group conversations
          if (conversation.is_group) continue;

          // Check participants of this conversation
          const { data: allParticipants, error: allParticipantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversation.id);

          if (allParticipantsError) {
            console.error('Error checking all participants:', allParticipantsError);
            continue;
          }

          // If this conversation has exactly 2 participants and includes both users
          if (allParticipants && allParticipants.length === 2) {
            const userIds = allParticipants.map(p => p.user_id);
            if (userIds.includes(user.id) && userIds.includes(selectedUser.id)) {
              existingDirectChat = conversation;
              break;
            }
          }
        }
      }

      if (existingDirectChat) {
        console.log('Found existing direct chat:', existingDirectChat.id);
        toast.success('Opening existing conversation');
        onChatCreated(existingDirectChat.id);
        setOpen(false);
        return;
      }

      console.log('Creating new direct conversation...');
      
      // Create new direct conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: `Chat with ${selectedUser.full_name || selectedUser.username}`,
          is_group: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      console.log('Created conversation:', conversation.id);

      // Add both users as participants
      const { error: participantsError2 } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversation.id,
            user_id: user.id,
            role: 'admin',
          },
          {
            conversation_id: conversation.id,
            user_id: selectedUser.id,
            role: 'member',
          }
        ]);

      if (participantsError2) {
        console.error('Error adding participants:', participantsError2);
        throw participantsError2;
      }

      console.log('Added participants successfully');
      toast.success('Chat created successfully!');
      onChatCreated(conversation.id);
      setOpen(false);
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast.error(error.message || 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct">
              <MessageCircle className="h-4 w-4 mr-1" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <UserSearch
              onUserSelect={createDirectChat}
              placeholder="Search users to start a chat..."
            />
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating chat...
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            <CreateGroupDialog onGroupCreated={onChatCreated} />
          </TabsContent>

          <TabsContent value="join">
            <JoinGroupDialog onGroupJoined={onChatCreated} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
