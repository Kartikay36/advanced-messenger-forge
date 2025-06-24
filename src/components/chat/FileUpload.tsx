
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Paperclip, X, FileText, Image, Video, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string, fileSize: number, messageType: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB in bytes

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
  if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
  if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const getMessageType = (fileType: string) => {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'voice';
  return 'file';
};

export const FileUpload = ({ onFileUploaded }: FileUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10GB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      const messageType = getMessageType(selectedFile.type);
      
      onFileUploaded(publicUrl, selectedFile.name, selectedFile.size, messageType);
      
      toast.success('File uploaded successfully!');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {selectedFile && (
        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getFileIcon(selectedFile.type)}
              <span className="text-sm font-medium truncate">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelectedFile}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          )}
          
          {!uploading && (
            <Button onClick={handleUpload} size="sm" className="w-full">
              Upload File
            </Button>
          )}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
