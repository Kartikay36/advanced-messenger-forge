
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  sender_id: string;
  created_at: string;
  is_edited: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading: boolean;
}

export const MessageList = ({ messages, currentUserId, isLoading }: MessageListProps) => {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-muted rounded-full p-4 mb-4 w-16 h-16 flex items-center justify-center mx-auto">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <ScrollArea className="flex-1 px-6 py-4">
      <div className="space-y-6">
        {Object.entries(groupedMessages).map(([date, dayMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-4">
              <Badge variant="outline" className="text-xs">
                {formatDate(dayMessages[0].created_at)}
              </Badge>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {dayMessages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUserId;
                const showAvatar = !isOwnMessage && (
                  index === 0 || 
                  dayMessages[index - 1].sender_id !== message.sender_id
                );

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end space-x-2",
                      isOwnMessage ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOwnMessage && (
                      <Avatar className={cn("h-8 w-8", showAvatar ? "visible" : "invisible")}>
                        <AvatarImage src={message.profiles.avatar_url || ''} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {message.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 break-words",
                        isOwnMessage 
                          ? "bg-blue-600 text-white rounded-br-md" 
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {!isOwnMessage && showAvatar && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.profiles.full_name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-end mt-1 space-x-1">
                        <span 
                          className={cn(
                            "text-xs opacity-70",
                            isOwnMessage ? "text-blue-100" : "text-muted-foreground"
                          )}
                        >
                          {formatTime(message.created_at)}
                        </span>
                        {message.is_edited && (
                          <span 
                            className={cn(
                              "text-xs opacity-60",
                              isOwnMessage ? "text-blue-100" : "text-muted-foreground"
                            )}
                          >
                            edited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
