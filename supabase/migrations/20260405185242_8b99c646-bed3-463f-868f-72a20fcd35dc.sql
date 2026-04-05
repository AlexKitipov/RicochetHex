-- Fix 1: Restrict game_rooms SELECT to authenticated participants only
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.game_rooms;

CREATE POLICY "Participants can view rooms"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Fix 2: Remove direct INSERT on game_moves (all inserts go through submit_move RPC)
DROP POLICY IF EXISTS "Players can insert moves" ON public.game_moves;

CREATE POLICY "No direct insert moves"
ON public.game_moves
FOR INSERT
TO authenticated
WITH CHECK (false);