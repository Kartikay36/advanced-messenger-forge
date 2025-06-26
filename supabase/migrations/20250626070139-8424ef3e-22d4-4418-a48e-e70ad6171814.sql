
-- Completely remove all existing policies that could cause recursion
DROP POLICY IF EXISTS "Users can view participants where they are participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation creators and admins can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves or admins can remove others" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Create completely recursion-free policies for conversation_participants
CREATE POLICY "Users can view their own participant records"
ON public.conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view other participants in same conversations"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

CREATE POLICY "Conversation creators can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT c.id 
    FROM public.conversations c 
    WHERE c.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can add participants to their conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid() AND cp.role = 'admin'
  )
);

CREATE POLICY "Users can remove their own participation"
ON public.conversation_participants FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Admins can remove other participants"
ON public.conversation_participants FOR DELETE
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid() AND cp.role = 'admin'
  )
);

-- Create recursion-free policy for conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);
