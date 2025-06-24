
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Users, Copy, Settings, UserPlus, Shield, Crown } from 'lucide-react';
import { CallControls } from '@/components/calls/CallControls';
import { UserSearch } from '@/components/search/UserSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatHeaderProps {
  conversation: any;
}

export const ChatHeader = ({ conversation }: ChatHeaderProps) => {
  const { user } = useAuth();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = conversation?.conversation_participants?.some(
    (p: any) => p.user_id === user?.id && p.role === 'admin'
  );

  const copyInviteLink = () => {
    if (conversation.group_invite_code) {
      navigator.clipboard.writeText(conversation.group_invite_code);
      toast.success('Invite code copied to clipboard!');
    }
  };

  const addMemberToGroup = async (selectedUser: any) => {
    if (!conversation.id || !selectedUser.id) return;

    setLoading(true);
    try {
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: selectedUser.id,
          role: 'member',
        });

      toast.success(`${selectedUser.full_name || selectedUser.username} added to group!`);
      setShowInviteDialog(false);
      // Refresh conversation data would happen via real-time subscription
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('User is already a member of this group');
      } else {
        toast.error('Failed to add member');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!conversation.id || !isAdmin) return;

    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('user_id', userId);

      toast.success('Member removed from group');
    } catch (error: any) {
      toast.error('Failed to remove member');
    }
  };

  const promoteToAdmin = async (userId: string) => {
    if (!conversation.id || !isAdmin) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ role: 'admin' })
        .eq('conversation_id', conversation.id)
        .eq('user_id', userId);

      toast.success('Member promoted to admin');
    } catch (error: any) {
      toast.error('Failed to promote member');
    }
  };

  const getDisplayName = () => {
    if (conversation.is_group) {
      return conversation.name || 'Group Chat';
    }
    
    const otherParticipant = conversation.conversation_participants?.find(
      (p: any) => p.user_id !== user?.id
    );
    return otherParticipant?.profiles?.full_name || 'Chat';
  };

  const getOnlineStatus = () => {
    if (conversation.is_group) {
      const onlineCount = conversation.conversation_participants?.filter(
        (p: any) => p.profiles?.is_online
      ).length || 0;
      return `${conversation.conversation_participants?.length || 0} members${onlineCount > 0 ? `, ${onlineCount} online` : ''}`;
    }
    
    const otherParticipant = conversation.conversation_participants?.find(
      (p: any) => p.user_id !== user?.id
    );
    return otherParticipant?.profiles?.is_online ? 'Online' : 'Offline';
  };

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.avatar_url || ''} />
              <AvatarFallback className="bg-blue-600 text-white">
                {conversation.is_group ? (
                  <Users className="h-5 w-5" />
                ) : (
                  getDisplayName().charAt(0)
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-semibold">{getDisplayName()}</h2>
                {conversation.is_group && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Group
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{getOnlineStatus()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <CallControls conversationId={conversation.id} />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversation.is_group && (
                  <>
                    <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      View Members
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Members
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={copyInviteLink}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Invite Code
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Chat Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Add Members Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members to Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <UserSearch
              onUserSelect={addMemberToGroup}
              placeholder="Search users to add..."
            />
            {conversation.group_invite_code && (
              <div className="space-y-2">
                <Label>Or share this invite code:</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={conversation.group_invite_code} 
                    readOnly 
                    className="font-mono"
                  />
                  <Button size="sm" onClick={copyInviteLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conversation.conversation_participants?.map((participant: any) => (
              <div key={participant.user_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.profiles?.avatar_url} />
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      {participant.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {participant.profiles?.full_name || 'Unknown User'}
                    </p>
                    <div className="flex items-center space-x-1">
                      {participant.role === 'admin' && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {participant.profiles?.is_online && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Online
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {isAdmin && participant.user_id !== user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {participant.role !== 'admin' && (
                        <DropdownMenuItem onClick={() => promoteToAdmin(participant.user_id)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => removeMember(participant.user_id)}
                        className="text-red-600"
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
