CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

DROP FUNCTION IF EXISTS public.join_room(text);
DROP FUNCTION IF EXISTS public.request_rematch(uuid);

CREATE OR REPLACE FUNCTION private.join_room(p_room_code text, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE game_rooms
  SET guest_id = p_user_id, status = 'playing', updated_at = now()
  WHERE room_code = upper(p_room_code)
    AND status = 'waiting'
    AND guest_id IS NULL
    AND host_id != p_user_id
  RETURNING id INTO v_room_id;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Room not found or already full';
  END IF;

  RETURN v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.request_rematch(p_room_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_room record;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF p_user_id != v_room.host_id AND p_user_id != v_room.guest_id THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF v_room.status != 'finished' THEN RAISE EXCEPTION 'Game not finished'; END IF;

  IF v_room.rematch_requested_by IS NOT NULL AND v_room.rematch_requested_by != p_user_id THEN
    UPDATE game_rooms SET
      status = 'playing',
      winner = NULL,
      rematch_requested_by = NULL,
      game_state = NULL,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN 'accepted';
  ELSE
    UPDATE game_rooms SET
      rematch_requested_by = p_user_id,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN 'requested';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.join_room(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.request_rematch(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.join_room(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.request_rematch(uuid, uuid) TO service_role;