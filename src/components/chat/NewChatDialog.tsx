
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    if (!user) return;

    setLoading(true);
    try {
      console.log('Creating direct chat with user:', selectedUser.id);
      
      // Check if direct conversation already exists using a simpler approach
      const { data: existingConvs, error: checkError } = await supabase
        .from('conversations')
        .select(`
          id,
          is_group
        `)
        .eq('is_group', false);

      if (checkError) {
        console.error('Error checking existing conversations:', checkError);
        throw checkError;
      }

      console.log('Found conversations:', existingConvs);

      // For each conversation, check if it has exactly 2 participants (current user and selected user)
      let existingDirectChat = null;
      if (existingConvs && existingConvs.length > 0) {
        for (const conv of existingConvs) {
          const { data: participants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          if (participantsError) {
            console.error('Error checking participants:', participantsError);
            continue;
          }

          if (participants && participants.length === 2) {
            const userIds = participants.map(p => p.user_id);
            if (userIds.includes(user.id) && userIds.includes(selectedUser.id)) {
              existingDirectChat = conv;
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

      console.log('Creating new conversation...');
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
      const { error: participantsError } = await supabase
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

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        throw participantsError;
      }

      console.log('Added participants successfully');
      toast.success('Chat created successfully!');
      onChatCreated(conversation.id);
      setOpen(false);
    } catch (error: any) {
      console.error('Full error creating chat:', error);
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
