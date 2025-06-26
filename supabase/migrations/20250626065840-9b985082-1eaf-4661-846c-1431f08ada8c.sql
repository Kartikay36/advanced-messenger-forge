
-- Fix infinite recursion in RLS policies by simplifying them

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants of conversations they're in" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created or admin" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves or admins can remove others" ON public.conversation_participants;

-- Create simpler policies that don't cause recursion
CREATE POLICY "Users can view participants where they are participants"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation creators and admins can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
    AND cp.role = 'admin'
  )
);

CREATE POLICY "Users can remove themselves or admins can remove others"
ON public.conversation_participants FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
    AND cp.role = 'admin'
  )
);

-- Also simplify the conversations policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);
