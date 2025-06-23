
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, MoreVertical } from 'lucide-react';

interface ChatHeaderProps {
  conversation: {
    id: string;
    name: string | null;
    is_group: boolean;
    avatar_url: string | null;
    conversation_participants: Array<{
      user_id: string;
      role: string;
      profiles: {
        full_name: string;
        avatar_url: string | null;
        is_online: boolean;
      };
    }>;
  };
}

export const ChatHeader = ({ conversation }: ChatHeaderProps) => {
  const participants = conversation.conversation_participants;
  const otherParticipants = participants.filter(p => p.user_id !== conversation.id);
  const isOnline = otherParticipants.some(p => p.profiles.is_online);

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={conversation.avatar_url || ''} />
              <AvatarFallback className="bg-blue-600 text-white">
                {conversation.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            {!conversation.is_group && isOnline && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-lg">
              {conversation.name || 'New Conversation'}
            </h2>
            <div className="flex items-center space-x-2">
              {conversation.is_group ? (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {participants.length} members
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Group chat
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : 'Last seen recently'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
