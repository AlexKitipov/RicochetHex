CREATE POLICY "Authenticated users can view waiting rooms"
ON public.game_rooms
FOR SELECT
TO authenticated
USING (status = 'waiting' AND guest_id IS NULL);