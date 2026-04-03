
-- Deny UPDATE and DELETE on game_moves for all users
CREATE POLICY "No one can update moves"
ON public.game_moves FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No one can delete moves"
ON public.game_moves FOR DELETE
TO authenticated
USING (false);

-- Deny UPDATE and DELETE on chat_messages for all users
CREATE POLICY "No one can update messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No one can delete messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (false);
