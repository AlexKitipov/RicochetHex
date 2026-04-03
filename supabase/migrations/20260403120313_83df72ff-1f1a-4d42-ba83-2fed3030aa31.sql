
-- Deny direct UPDATE on game_rooms (all mutations go through SECURITY DEFINER RPCs)
CREATE POLICY "No direct updates to rooms"
ON public.game_rooms FOR UPDATE
TO authenticated
USING (false);

-- Only host can delete a room
CREATE POLICY "Host can delete own room"
ON public.game_rooms FOR DELETE
TO authenticated
USING (auth.uid() = host_id);
