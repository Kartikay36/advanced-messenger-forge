import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Search, Settings, LogOut, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { NewChatDialog } from './NewChatDialog';

interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  updated_at: string;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
}

export const ChatSidebar = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation 
}: ChatSidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.messages.some(msg => 
      msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-blue-600 text-white">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">
                {user?.user_metadata?.full_name || 'User'}
              </h2>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-border">
        <NewChatDialog onChatCreated={onSelectConversation} />
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin messaging</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const lastMessage = conversation.messages[0];
              const isSelected = selectedConversation === conversation.id;
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    isSelected ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.avatar_url || ''} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {conversation.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">
                          {conversation.name || 'New Conversation'}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      {lastMessage ? (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          No messages yet
                        </p>
                      )}
                      {conversation.is_group && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Group
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
