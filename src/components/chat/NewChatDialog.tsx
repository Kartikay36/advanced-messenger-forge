
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
import { supabase } from '@/lib/supabase';
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
      // Check if direct conversation already exists
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner(user_id)
        `)
        .eq('is_group', false)
        .eq('conversation_participants.user_id', user.id);

      if (checkError) throw checkError;

      // Find existing direct conversation with this user
      const existingDirectChat = existingConv?.find(conv => 
        conv.conversation_participants.some((p: any) => p.user_id === selectedUser.id) &&
        conv.conversation_participants.length === 2
      );

      if (existingDirectChat) {
        toast.success('Opening existing conversation');
        onChatCreated(existingDirectChat.id);
        setOpen(false);
        return;
      }

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

      if (convError) throw convError;

      // Add both users as participants
      await supabase
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

      toast.success('Chat created successfully!');
      onChatCreated(conversation.id);
      setOpen(false);
    } catch (error: any) {
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
