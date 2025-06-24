
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface NewChatDialogProps {
  onChatCreated: (conversationId: string) => void;
}

export const NewChatDialog = ({ onChatCreated }: NewChatDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatName, setChatName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userEmail.trim()) return;

    setLoading(true);
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('id', `%${userEmail.trim()}%`);

      if (profileError) throw profileError;

      // For now, create a direct conversation with a simple name
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: chatName.trim() || `Chat with ${userEmail}`,
          is_group: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as participant
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      toast.success('Chat created successfully!');
      onChatCreated(conversation.id);
      setOpen(false);
      setChatName('');
      setUserEmail('');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateChat} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatName">Chat Name (Optional)</Label>
            <Input
              id="chatName"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Enter chat name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email to chat with"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Chat'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
