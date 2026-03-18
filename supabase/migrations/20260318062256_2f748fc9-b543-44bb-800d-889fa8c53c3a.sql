
CREATE OR REPLACE FUNCTION public.submit_move(p_room_id uuid, p_game_state jsonb, p_from_q integer, p_from_r integer, p_to_q integer, p_to_r integer, p_move_number integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room record;
  v_user_id uuid := auth.uid();
  v_my_color text;
  v_current_player text;
  v_pawn_key text;
  v_pawn jsonb;
  v_is_game_over boolean;
  v_winner text;
  v_side_length integer := 8;
  v_blue_win_rank integer;
  v_red_win_rank integer;
  v_blue_on_target integer := 0;
  v_red_on_target integer := 0;
  v_key text;
  v_pawn_data jsonb;
  v_parts text[];
  v_r integer;
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

  -- SERVER-SIDE WIN CONDITION CHECK
  -- Compute winner from the pawns in the submitted game state
  -- Win = 3+ active pawns on opponent's back rank
  v_blue_win_rank := -(v_side_length - 1);  -- -7
  v_red_win_rank := v_side_length - 1;       -- 7

  FOR v_key, v_pawn_data IN SELECT * FROM jsonb_each(p_game_state->'pawns')
  LOOP
    -- Only count active pawns
    IF v_pawn_data->>'state' = 'active' THEN
      -- Parse the r coordinate from key format "q,r"
      v_parts := string_to_array(v_key, ',');
      IF array_length(v_parts, 1) = 2 THEN
        v_r := v_parts[2]::integer;
        IF v_pawn_data->>'color' = 'blue' AND v_r = v_blue_win_rank THEN
          v_blue_on_target := v_blue_on_target + 1;
        ELSIF v_pawn_data->>'color' = 'red' AND v_r = v_red_win_rank THEN
          v_red_on_target := v_red_on_target + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  v_winner := NULL;
  IF v_blue_on_target >= 3 THEN
    v_winner := 'blue';
    v_is_game_over := true;
  ELSIF v_red_on_target >= 3 THEN
    v_winner := 'red';
    v_is_game_over := true;
  ELSE
    -- Server says no winner, override any client claim
    v_is_game_over := false;
  END IF;

  -- Record the move
  INSERT INTO game_moves (room_id, player_id, from_q, from_r, to_q, to_r, move_number)
  VALUES (p_room_id, v_user_id, p_from_q, p_from_r, p_to_q, p_to_r, p_move_number);

  -- Update game state, overriding client's gameOver and winner with server-computed values
  UPDATE game_rooms SET
    game_state = jsonb_set(
      jsonb_set(p_game_state, '{gameOver}', to_jsonb(v_is_game_over)),
      '{winner}', CASE WHEN v_winner IS NOT NULL THEN to_jsonb(v_winner) ELSE 'null'::jsonb END
    ),
    winner = v_winner,
    status = CASE WHEN v_is_game_over THEN 'finished' ELSE 'playing' END,
    updated_at = now()
  WHERE id = p_room_id;
END;
$function$;
