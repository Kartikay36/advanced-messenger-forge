
-- Add privacy settings to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_username BOOLEAN DEFAULT false;

-- Create a function to search users by username (respecting privacy)
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_term TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.username ILIKE '%' || search_term || '%'
    AND p.hide_username = false
    AND p.id != auth.uid()
  LIMIT 20;
$$;

-- Add group-related columns to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_invite_code TEXT UNIQUE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update conversation_participants to support more roles
ALTER TABLE public.conversation_participants DROP CONSTRAINT IF EXISTS conversation_participants_role_check;
ALTER TABLE public.conversation_participants ADD CONSTRAINT conversation_participants_role_check 
  CHECK (role IN ('admin', 'moderator', 'member'));

-- Create group invite codes function
CREATE OR REPLACE FUNCTION public.generate_group_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := substr(md5(random()::text), 1, 8);
  RETURN code;
END;
$$;

-- Create function to join group by invite code
CREATE OR REPLACE FUNCTION public.join_group_by_code(invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
  user_exists BOOLEAN;
  result JSON;
BEGIN
  -- Find conversation by invite code
  SELECT id INTO conv_id
  FROM public.conversations
  WHERE group_invite_code = invite_code AND is_group = true;
  
  IF conv_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Check if user is already a participant
  SELECT EXISTS(
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  ) INTO user_exists;
  
  IF user_exists THEN
    RETURN json_build_object('success', false, 'error', 'Already a member');
  END IF;
  
  -- Add user to group
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES (conv_id, auth.uid(), 'member');
  
  RETURN json_build_object('success', true, 'conversation_id', conv_id);
END;
$$;

-- Create call sessions table for audio/video calls
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'rejected')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create call participants table
CREATE TABLE public.call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id UUID REFERENCES public.call_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(call_session_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

-- Call sessions policies
CREATE POLICY "Users can view call sessions in their conversations"
  ON public.call_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = call_sessions.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create call sessions in their conversations"
  ON public.call_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = caller_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = call_sessions.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update call sessions they participate in"
  ON public.call_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = call_sessions.conversation_id AND user_id = auth.uid()
    )
  );

-- Call participants policies
CREATE POLICY "Users can view call participants in their conversations"
  ON public.call_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.call_sessions cs
      JOIN public.conversation_participants cp ON cs.conversation_id = cp.conversation_id
      WHERE cs.id = call_participants.call_session_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join calls in their conversations"
  ON public.call_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.call_sessions cs
      JOIN public.conversation_participants cp ON cs.conversation_id = cp.conversation_id
      WHERE cs.id = call_session_id AND cp.user_id = auth.uid()
    )
  );

-- Update profiles policies to allow username search function
CREATE POLICY "Allow username search function" 
  ON public.profiles FOR SELECT 
  TO public
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_search ON public.profiles(username) WHERE hide_username = false;
CREATE INDEX IF NOT EXISTS idx_conversations_invite_code ON public.conversations(group_invite_code) WHERE group_invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation ON public.call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_session ON public.call_participants(call_session_id);
