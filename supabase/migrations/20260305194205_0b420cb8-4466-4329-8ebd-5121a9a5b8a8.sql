
-- Profiles table for user display names
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_guest)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'),
    COALESCE((NEW.raw_user_meta_data->>'is_guest')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Game rooms table
CREATE TABLE public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_color TEXT NOT NULL DEFAULT 'blue' CHECK (host_color IN ('blue', 'red')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  winner TEXT CHECK (winner IN ('blue', 'red')),
  game_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms" ON public.game_rooms
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players in room can update" ON public.game_rooms
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Game moves table
CREATE TABLE public.game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  move_number INTEGER NOT NULL,
  from_q INTEGER NOT NULL,
  from_r INTEGER NOT NULL,
  to_q INTEGER NOT NULL,
  to_r INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view moves in their room" ON public.game_moves
  FOR SELECT USING (true);

CREATE POLICY "Players can insert moves" ON public.game_moves
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages in rooms" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for game_rooms, game_moves, and chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
