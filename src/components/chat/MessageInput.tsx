
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Mic } from 'lucide-react';
import { FileUpload } from './FileUpload';

interface MessageInputProps {
  onSendMessage: (content: string, messageType?: string, fileUrl?: string, fileName?: string, fileSize?: number) => void;
  isLoading: boolean;
}

export const MessageInput = ({ onSendMessage, isLoading }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleFileUploaded = (fileUrl: string, fileName: string, fileSize: number, messageType: string) => {
    onSendMessage(`Shared ${messageType}: ${fileName}`, messageType, fileUrl, fileName, fileSize);
  };

  return (
    <div className="bg-card border-t border-border px-6 py-4">
      <FileUpload onFileUploaded={handleFileUploaded} />
      
      <form onSubmit={handleSubmit} className="flex items-end space-x-3 mt-3">
        {/* Message Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[120px] resize-none pr-12"
            rows={1}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="absolute right-2 bottom-2"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Send/Voice Button */}
        {message.trim() ? (
          <Button 
            type="submit" 
            size="sm" 
            disabled={isLoading}
            className="mb-2 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="mb-2">
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
};
