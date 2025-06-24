
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, Copy } from 'lucide-react';
import { UserSearch } from '@/components/search/UserSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
  onGroupCreated: (conversationId: string) => void;
}

export const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Array<{id: string, username: string, full_name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'members'>('details');

  const handleUserSelect = (user: any) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating group:', groupName);
      
      // Generate invite code
      const { data: inviteCodeResult, error: codeError } = await supabase.rpc('generate_group_invite_code');
      if (codeError) {
        console.error('Error generating invite code:', codeError);
        throw codeError;
      }

      console.log('Generated invite code:', inviteCodeResult);

      // Create group conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: groupName.trim(),
          is_group: true,
          created_by: user.id,
          group_invite_code: inviteCodeResult,
          is_public: true,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      console.log('Created conversation:', conversation.id);

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (creatorError) {
        console.error('Error adding creator:', creatorError);
        throw creatorError;
      }

      console.log('Added creator as admin');

      // Add selected members
      if (selectedUsers.length > 0) {
        console.log('Adding selected users:', selectedUsers.length);
        const { error: membersError } = await supabase
          .from('conversation_participants')
          .insert(
            selectedUsers.map(selectedUser => ({
              conversation_id: conversation.id,
              user_id: selectedUser.id,
              role: 'member',
            }))
          );

        if (membersError) {
          console.error('Error adding members:', membersError);
          throw membersError;
        }

        console.log('Added members successfully');
      }

      toast.success('Group created successfully!');
      onGroupCreated(conversation.id);
      setOpen(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      setStep('details');
    } catch (error: any) {
      console.error('Full error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' ? 'Create New Group' : 'Add Members'}
          </DialogTitle>
        </DialogHeader>

        {step === 'details' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Describe your group"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setStep('members')} 
                className="flex-1"
                disabled={!groupName.trim()}
              >
                Next: Add Members
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <UserSearch
              onUserSelect={handleUserSelect}
              placeholder="Search members to add..."
            />
            
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Members ({selectedUsers.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((selectedUser) => (
                    <Badge key={selectedUser.id} variant="secondary" className="pr-1">
                      {selectedUser.full_name || selectedUser.username}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeUser(selectedUser.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setStep('details')}>
                Back
              </Button>
              <Button onClick={createGroup} disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
