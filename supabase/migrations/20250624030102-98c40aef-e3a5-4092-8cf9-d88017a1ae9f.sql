
-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'video')),
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  reply_to UUID REFERENCES public.messages(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" 
  ON public.conversations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update conversations they created" 
  ON public.conversations FOR UPDATE 
  USING (auth.uid() = created_by);

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations" 
  ON public.conversation_participants FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations they created" 
  ON public.conversation_participants FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id AND created_by = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to conversations they participate in" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON public.messages FOR UPDATE 
  USING (auth.uid() = sender_id);

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);

-- Create storage policies for file uploads
CREATE POLICY "Users can upload files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'chat-files');

CREATE POLICY "Users can update their own files" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create avatars bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Users can upload avatars" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
