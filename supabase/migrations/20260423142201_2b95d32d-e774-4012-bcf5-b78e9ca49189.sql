DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.game_rooms;

CREATE POLICY "Authenticated users can create rooms"
ON public.game_rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- Also tighten profiles INSERT/UPDATE to authenticated role for consistency
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Tighten chat_messages policies to authenticated role
DROP POLICY IF EXISTS "Room participants can send messages" ON public.chat_messages;
CREATE POLICY "Room participants can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = sender_id) AND (EXISTS (
  SELECT 1 FROM game_rooms
  WHERE game_rooms.id = chat_messages.room_id
    AND (game_rooms.host_id = auth.uid() OR game_rooms.guest_id = auth.uid())
)));

DROP POLICY IF EXISTS "Room participants can view messages" ON public.chat_messages;
CREATE POLICY "Room participants can view messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM game_rooms
  WHERE game_rooms.id = chat_messages.room_id
    AND (game_rooms.host_id = auth.uid() OR game_rooms.guest_id = auth.uid())
));

DROP POLICY IF EXISTS "Room participants can view moves" ON public.game_moves;
CREATE POLICY "Room participants can view moves"
ON public.game_moves
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM game_rooms
  WHERE game_rooms.id = game_moves.room_id
    AND (game_rooms.host_id = auth.uid() OR game_rooms.guest_id = auth.uid())
));