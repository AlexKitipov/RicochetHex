
-- 1. Tighten game_moves INSERT to require room membership
DROP POLICY IF EXISTS "Players can insert moves" ON public.game_moves;
CREATE POLICY "Players can insert moves" ON public.game_moves
  FOR INSERT WITH CHECK (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE id = room_id
      AND (host_id = auth.uid() OR guest_id = auth.uid())
      AND status = 'playing'
    )
  );

-- 2. Restrict chat_messages SELECT to room participants
DROP POLICY IF EXISTS "Anyone can view messages in rooms" ON public.chat_messages;
CREATE POLICY "Room participants can view messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE id = room_id
      AND (host_id = auth.uid() OR guest_id = auth.uid())
    )
  );

-- 3. Restrict game_moves SELECT to room participants
DROP POLICY IF EXISTS "Anyone can view moves in their room" ON public.game_moves;
CREATE POLICY "Room participants can view moves" ON public.game_moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE id = room_id
      AND (host_id = auth.uid() OR guest_id = auth.uid())
    )
  );

-- 4. Tighten chat_messages INSERT to require room membership
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;
CREATE POLICY "Room participants can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.game_rooms
      WHERE id = room_id
      AND (host_id = auth.uid() OR guest_id = auth.uid())
    )
  );
