import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Hex utilities (ported from client hexUtils.ts) ──

const SIDE_LENGTH = 8;
const HEX_DIRECTIONS: [number, number][] = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

type HexCoord = { q: number; r: number };
type PlayerColor = "blue" | "red";
type PawnState = "active" | "neutralized";
interface Pawn { color: PlayerColor; state: PawnState; number: number }

function hexKey(c: HexCoord): string { return `${c.q},${c.r}`; }
function parseHexKey(k: string): HexCoord {
  const [q, r] = k.split(",").map(Number);
  return { q, r };
}

function isValidHex(c: HexCoord, sl = SIDE_LENGTH): boolean {
  const m = sl - 1;
  const s = -c.q - c.r;
  return Math.abs(c.q) <= m && Math.abs(c.r) <= m && Math.abs(s) <= m;
}

function getOpponentColor(c: PlayerColor): PlayerColor {
  return c === "blue" ? "red" : "blue";
}

function getWallAxis(cur: HexCoord, dir: [number, number], maxC: number): "q" | "r" | "s" {
  const [dq, dr] = dir;
  const nq = cur.q + dq, nr = cur.r + dr, ns = -nq - nr;
  if (Math.abs(nq) > maxC) return "q";
  if (Math.abs(nr) > maxC) return "r";
  if (Math.abs(ns) > maxC) return "s";
  if (Math.abs(dq) > Math.abs(dr)) return "q";
  if (Math.abs(dr) > Math.abs(dq)) return "r";
  return "s";
}

function calculateRicochetDirection(entry: [number, number], wall: "q" | "r" | "s"): [number, number] {
  const [dq, dr] = entry;
  if (wall === "q") return [-dq, dr + dq];
  if (wall === "r") return [dq + dr, -dr];
  return [-dr, -dq];
}

function getStraightLinePath(start: HexCoord, dir: [number, number], pawns: Map<string, Pawn>, sl = SIDE_LENGTH) {
  const path: HexCoord[] = [];
  let cur = start;
  const [dq, dr] = dir;
  const maxC = sl - 1;
  while (true) {
    const next: HexCoord = { q: cur.q + dq, r: cur.r + dr };
    if (!isValidHex(next, sl))
      return { path, obstacleType: "board_edge" as const, obstacleLocation: cur, wallAxis: getWallAxis(cur, dir, maxC) };
    if (pawns.has(hexKey(next)))
      return { path, obstacleType: "pawn" as const, obstacleLocation: next, wallAxis: null };
    path.push(next);
    cur = next;
  }
}

function getPossibleMoves(start: HexCoord, pawns: Map<string, Pawn>, sl = SIDE_LENGTH) {
  const pawn = pawns.get(hexKey(start));
  if (!pawn || pawn.state === "neutralized") return { moves: [] as HexCoord[], ricochetPath: [] as HexCoord[] };
  const allMoves: HexCoord[] = [];
  const ricochetPath: HexCoord[] = [];
  for (const direction of HEX_DIRECTIONS) {
    const { path, obstacleType, obstacleLocation, wallAxis } = getStraightLinePath(start, direction, pawns, sl);
    allMoves.push(...path);
    if (obstacleType === "board_edge" && wallAxis && obstacleLocation) {
      if (!allMoves.some(m => m.q === obstacleLocation.q && m.r === obstacleLocation.r))
        allMoves.push(obstacleLocation);
      ricochetPath.push(obstacleLocation);
      const rDir = calculateRicochetDirection(direction, wallAxis);
      const rResult = getStraightLinePath(obstacleLocation, rDir, pawns, sl);
      allMoves.push(...rResult.path);
      ricochetPath.push(...rResult.path);
    }
  }
  return { moves: allMoves, ricochetPath };
}

function checkSandwichEffects(movedTo: HexCoord, playerColor: PlayerColor, pawns: Map<string, Pawn>) {
  const opp = getOpponentColor(playerColor);
  const neutralized: HexCoord[] = [];
  const recovered: HexCoord[] = [];
  for (const [dq, dr] of HEX_DIRECTIONS) {
    const nb: HexCoord = { q: movedTo.q + dq, r: movedTo.r + dr };
    const far: HexCoord = { q: nb.q + dq, r: nb.r + dr };
    const nbP = pawns.get(hexKey(nb));
    const farP = pawns.get(hexKey(far));
    if (nbP && farP) {
      if (nbP.color === opp && nbP.state === "active" && farP.color === playerColor && farP.state === "active")
        neutralized.push(nb);
      if (nbP.color === playerColor && nbP.state === "neutralized" && farP.color === playerColor && farP.state === "active")
        recovered.push(nb);
    }
    const prev: HexCoord = { q: movedTo.q - dq, r: movedTo.r - dr };
    const prevFar: HexCoord = { q: prev.q - dq, r: prev.r - dr };
    const prevP = pawns.get(hexKey(prev));
    const prevFarP = pawns.get(hexKey(prevFar));
    if (prevP && prevFarP) {
      if (prevP.color === playerColor && prevP.state === "neutralized" && prevFarP.color === playerColor && prevFarP.state === "active") {
        if (!recovered.some(h => h.q === prev.q && h.r === prev.r)) recovered.push(prev);
      }
    }
  }
  return { neutralized, recovered };
}

function checkCapture(movedTo: HexCoord, playerColor: PlayerColor, pawns: Map<string, Pawn>): HexCoord[] {
  const opp = getOpponentColor(playerColor);
  const captured: HexCoord[] = [];
  const add = (h: HexCoord) => { if (!captured.some(c => c.q === h.q && c.r === h.r)) captured.push(h); };
  for (const [dq, dr] of HEX_DIRECTIONS) {
    // Scenario 1: [F]-[F]-[Moved]-[Opp]
    const p1 = pawns.get(hexKey({ q: movedTo.q - 2 * dq, r: movedTo.r - 2 * dr }));
    const p2 = pawns.get(hexKey({ q: movedTo.q - dq, r: movedTo.r - dr }));
    const t1Hex: HexCoord = { q: movedTo.q + dq, r: movedTo.r + dr };
    const t1 = pawns.get(hexKey(t1Hex));
    if (p1?.color === playerColor && p1.state === "active" && p2?.color === playerColor && p2.state === "active" && t1?.color === opp && t1.state === "active") add(t1Hex);

    // Scenario 2: [F]-[Moved]-[F]-[Opp]
    const p3Hex: HexCoord = { q: movedTo.q + dq, r: movedTo.r + dr };
    const t2Hex: HexCoord = { q: movedTo.q + 2 * dq, r: movedTo.r + 2 * dr };
    const p3 = pawns.get(hexKey(p3Hex));
    const t2 = pawns.get(hexKey(t2Hex));
    if (p2?.color === playerColor && p2.state === "active" && p3?.color === playerColor && p3.state === "active" && t2?.color === opp && t2.state === "active") add(t2Hex);

    // Scenario 3: [Moved]-[F]-[F]-[Opp]
    const p4Hex: HexCoord = { q: movedTo.q + 2 * dq, r: movedTo.r + 2 * dr };
    const t3Hex: HexCoord = { q: movedTo.q + 3 * dq, r: movedTo.r + 3 * dr };
    const p4 = pawns.get(hexKey(p4Hex));
    const t3 = pawns.get(hexKey(t3Hex));
    const p3s3 = pawns.get(hexKey(p3Hex));
    if (p3s3?.color === playerColor && p3s3.state === "active" && p4?.color === playerColor && p4.state === "active" && t3?.color === opp && t3.state === "active") add(t3Hex);
  }
  return captured;
}

function checkWinCondition(pawns: Map<string, Pawn>, sl = SIDE_LENGTH): PlayerColor | null {
  const blueWinR = -(sl - 1), redWinR = sl - 1;
  let bCount = 0, rCount = 0;
  pawns.forEach((p, k) => {
    if (p.state !== "active") return;
    const c = parseHexKey(k);
    if (p.color === "blue" && c.r === blueWinR) bCount++;
    else if (p.color === "red" && c.r === redWinR) rCount++;
  });
  if (bCount >= 3) return "blue";
  if (rCount >= 3) return "red";
  return null;
}

function isRicochetMove(from: HexCoord, to: HexCoord, ricochetPath: HexCoord[]): boolean {
  return ricochetPath.some(h => h.q === to.q && h.r === to.r);
}

// ── Deserialize ──
function deserializePawns(obj: Record<string, Pawn>): Map<string, Pawn> {
  const m = new Map<string, Pawn>();
  for (const [k, v] of Object.entries(obj)) m.set(k, v as Pawn);
  return m;
}
function serializePawns(m: Map<string, Pawn>): Record<string, Pawn> {
  const o: Record<string, Pawn> = {};
  m.forEach((v, k) => { o[k] = v; });
  return o;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userId = userData.user.id;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "invalid_json" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { p_room_id, p_from_q, p_from_r, p_to_q, p_to_r, p_move_number } = body ?? {};

    const fieldErrors: Record<string, string> = {};

    // p_room_id: must be a non-empty UUID string
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof p_room_id !== "string" || p_room_id.length === 0) {
      fieldErrors.p_room_id = "p_room_id is required and must be a string";
    } else if (!uuidRegex.test(p_room_id)) {
      fieldErrors.p_room_id = "p_room_id must be a valid UUID";
    }

    // Coordinate fields: must be finite integers
    const coordFields: Array<["p_from_q" | "p_from_r" | "p_to_q" | "p_to_r", unknown]> = [
      ["p_from_q", p_from_q],
      ["p_from_r", p_from_r],
      ["p_to_q", p_to_q],
      ["p_to_r", p_to_r],
    ];
    for (const [name, val] of coordFields) {
      if (typeof val !== "number" || !Number.isFinite(val) || !Number.isInteger(val)) {
        fieldErrors[name] = `${name} must be a finite integer`;
      }
    }

    if (typeof p_move_number !== "number" || !Number.isInteger(p_move_number) || p_move_number < 0) {
      fieldErrors.p_move_number = "p_move_number must be a non-negative integer";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return new Response(
        JSON.stringify({ error: "Invalid input parameters", code: "invalid_input", fieldErrors }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate coordinates are within board bounds (only after type checks)
    const boundsErrors: Record<string, string> = {};
    if (!isValidHex({ q: p_from_q, r: p_from_r })) {
      boundsErrors.from = `from (${p_from_q},${p_from_r}) is outside the board`;
    }
    if (!isValidHex({ q: p_to_q, r: p_to_r })) {
      boundsErrors.to = `to (${p_to_q},${p_to_r}) is outside the board`;
    }
    if (Object.keys(boundsErrors).length > 0) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of bounds", code: "coords_out_of_bounds", fieldErrors: boundsErrors }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reject no-op moves (from == to)
    if (p_from_q === p_to_q && p_from_r === p_to_r) {
      return new Response(
        JSON.stringify({ error: "from and to must differ", code: "noop_move" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use service role to read and update game state
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch room with lock-like read (service role bypasses RLS)
    const { data: room, error: roomError } = await adminClient
      .from("game_rooms")
      .select("*")
      .eq("id", p_room_id)
      .single();

    if (roomError || !room)
      return new Response(JSON.stringify({ error: "Room not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (room.status !== "playing")
      return new Response(JSON.stringify({ error: "Game not in progress" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Determine player color
    let myColor: PlayerColor;
    if (userId === room.host_id) {
      myColor = room.host_color as PlayerColor;
    } else if (userId === room.guest_id) {
      myColor = (room.host_color === "blue" ? "red" : "blue") as PlayerColor;
    } else {
      return new Response(JSON.stringify({ error: "Not a participant" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get current game state from DB (authoritative)
    const gs = room.game_state as any;
    if (!gs?.pawns)
      return new Response(JSON.stringify({ error: "No game state" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const currentPlayer = gs.currentPlayer || "blue";
    if (myColor !== currentPlayer)
      return new Response(JSON.stringify({ error: "Not your turn" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Deserialize the AUTHORITATIVE pawn state from DB
    const pawns = deserializePawns(gs.pawns);

    // Validate piece at from position
    const fromKey = hexKey({ q: p_from_q, r: p_from_r });
    const movingPawn = pawns.get(fromKey);
    if (!movingPawn || movingPawn.color !== myColor)
      return new Response(JSON.stringify({ error: "Invalid piece" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (movingPawn.state !== "active")
      return new Response(JSON.stringify({ error: "Piece is not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── SERVER-SIDE MOVE VALIDATION ──
    const from: HexCoord = { q: p_from_q, r: p_from_r };
    const to: HexCoord = { q: p_to_q, r: p_to_r };

    const { moves: validMoves, ricochetPath } = getPossibleMoves(from, pawns);
    const isValid = validMoves.some(m => m.q === to.q && m.r === to.r);

    if (!isValid)
      return new Response(JSON.stringify({ error: "Invalid move destination" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── COMPUTE NEW STATE SERVER-SIDE ──
    const newPawns = new Map(pawns);
    newPawns.delete(fromKey);
    newPawns.set(hexKey(to), movingPawn);

    const wasRicochet = isRicochetMove(from, to, ricochetPath);

    // Apply sandwich effects
    const { neutralized, recovered } = checkSandwichEffects(to, currentPlayer, newPawns);
    for (const h of neutralized) {
      const p = newPawns.get(hexKey(h));
      if (p) newPawns.set(hexKey(h), { ...p, state: "neutralized" });
    }
    for (const h of recovered) {
      const p = newPawns.get(hexKey(h));
      if (p) newPawns.set(hexKey(h), { ...p, state: "active" });
    }

    // Apply captures
    const captured = checkCapture(to, currentPlayer, newPawns);
    for (const h of captured) newPawns.delete(hexKey(h));

    // Check win condition
    const winner = checkWinCondition(newPawns);
    const gameOver = winner !== null;

    // Build move record
    const moveHistory = gs.moveHistory || [];
    const move = {
      from, to,
      player: currentPlayer,
      isRicochet: wasRicochet,
      neutralized: neutralized[0] || undefined,
      recovered: recovered[0] || undefined,
      captured: captured[0] || undefined,
      moveNumber: p_move_number,
    };
    const newHistory = [...moveHistory, move];
    const newMoveCount = (gs.moveCount || 0) + 1;

    const newGameState = {
      pawns: serializePawns(newPawns),
      currentPlayer: getOpponentColor(currentPlayer),
      moveHistory: newHistory,
      historyIndex: newHistory.length - 1,
      gameOver,
      winner,
      moveCount: newMoveCount,
    };

    // Record the move
    await adminClient.from("game_moves").insert({
      room_id: p_room_id,
      player_id: userId,
      from_q: p_from_q,
      from_r: p_from_r,
      to_q: p_to_q,
      to_r: p_to_r,
      move_number: p_move_number,
    });

    // Update game state
    const { error: updateError } = await adminClient
      .from("game_rooms")
      .update({
        game_state: newGameState,
        winner: winner || null,
        status: gameOver ? "finished" : "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", p_room_id);

    if (updateError)
      return new Response(JSON.stringify({ error: "Failed to update game state" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({
      success: true,
      gameState: newGameState,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("validate-move error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
