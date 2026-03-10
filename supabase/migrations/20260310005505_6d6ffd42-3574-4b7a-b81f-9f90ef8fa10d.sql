
-- 1. join_room: atomically join a waiting room (fixes RLS gap for guests)
CREATE OR REPLACE FUNCTION public.join_room(p_room_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE game_rooms
  SET guest_id = v_user_id, status = 'playing', updated_at = now()
  WHERE room_code = upper(p_room_code)
    AND status = 'waiting'
    AND guest_id IS NULL
    AND host_id != v_user_id
  RETURNING id INTO v_room_id;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Room not found or already full';
  END IF;

  RETURN v_room_id;
END;
$$;

-- 2. submit_move: validate turn ownership and piece before applying game state
CREATE OR REPLACE FUNCTION public.submit_move(
  p_room_id uuid,
  p_game_state jsonb,
  p_from_q int,
  p_from_r int,
  p_to_q int,
  p_to_r int,
  p_move_number int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_user_id uuid := auth.uid();
  v_my_color text;
  v_current_player text;
  v_pawn_key text;
  v_pawn jsonb;
  v_is_game_over boolean;
  v_winner text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_room.status != 'playing' THEN RAISE EXCEPTION 'Game not in progress'; END IF;

  -- Determine player color
  IF v_user_id = v_room.host_id THEN
    v_my_color := v_room.host_color;
  ELSIF v_user_id = v_room.guest_id THEN
    v_my_color := CASE WHEN v_room.host_color = 'blue' THEN 'red' ELSE 'blue' END;
  ELSE
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Validate turn
  v_current_player := COALESCE(v_room.game_state->>'currentPlayer', 'blue');
  IF v_my_color != v_current_player THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;

  -- Validate piece at from position belongs to current player and is active
  v_pawn_key := p_from_q || ',' || p_from_r;
  v_pawn := v_room.game_state->'pawns'->v_pawn_key;
  IF v_pawn IS NULL OR v_pawn->>'color' != v_my_color THEN
    RAISE EXCEPTION 'Invalid piece';
  END IF;
  IF v_pawn->>'state' != 'active' THEN
    RAISE EXCEPTION 'Piece is not active';
  END IF;

  -- Validate the new state switches turn (unless game over)
  v_is_game_over := COALESCE((p_game_state->>'gameOver')::boolean, false);
  IF NOT v_is_game_over AND p_game_state->>'currentPlayer' = v_my_color THEN
    RAISE EXCEPTION 'Invalid state transition';
  END IF;

  v_winner := NULL;
  IF v_is_game_over THEN
    v_winner := p_game_state->>'winner';
  END IF;

  -- Record the move
  INSERT INTO game_moves (room_id, player_id, from_q, from_r, to_q, to_r, move_number)
  VALUES (p_room_id, v_user_id, p_from_q, p_from_r, p_to_q, p_to_r, p_move_number);

  -- Update game state
  UPDATE game_rooms SET
    game_state = p_game_state,
    winner = v_winner,
    status = CASE WHEN v_is_game_over THEN 'finished' ELSE 'playing' END,
    updated_at = now()
  WHERE id = p_room_id;
END;
$$;

-- 3. request_rematch: safely handle rematch proposals and acceptance
CREATE OR REPLACE FUNCTION public.request_rematch(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_room FROM game_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_user_id != v_room.host_id AND v_user_id != v_room.guest_id THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF v_room.status != 'finished' THEN RAISE EXCEPTION 'Game not finished'; END IF;

  IF v_room.rematch_requested_by IS NOT NULL AND v_room.rematch_requested_by != v_user_id THEN
    -- Accept rematch: reset game
    UPDATE game_rooms SET
      status = 'playing',
      winner = NULL,
      rematch_requested_by = NULL,
      game_state = NULL,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN 'accepted';
  ELSE
    -- Request rematch
    UPDATE game_rooms SET
      rematch_requested_by = v_user_id,
      updated_at = now()
    WHERE id = p_room_id;
    RETURN 'requested';
  END IF;
END;
$$;

-- 4. Remove the permissive UPDATE policy (all updates now go through SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Players in room can update" ON public.game_rooms;
