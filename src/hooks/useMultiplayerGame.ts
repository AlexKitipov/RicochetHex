import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  GameState,
  HexCoord,
  Pawn,
  Move,
  PlayerColor,
  hexKey,
  parseHexKey,
  createInitialPawns,
  getPossibleMoves,
  isRicochetMove,
  checkSandwichEffects,
  checkCapture,
  checkWinCondition,
  getOpponentColor
} from '@/lib/hexUtils';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { toast } from 'sonner';

interface UseMultiplayerGameOptions {
  roomId: string;
  userId: string;
  myColor: PlayerColor;
  isMyTurn: boolean;
}

// Serialize pawns Map to JSON-safe object
function serializePawns(pawns: Map<string, Pawn>): Record<string, Pawn> {
  const obj: Record<string, Pawn> = {};
  pawns.forEach((pawn, key) => { obj[key] = pawn; });
  return obj;
}

// Deserialize pawns from JSON object to Map
function deserializePawns(obj: Record<string, Pawn>): Map<string, Pawn> {
  const map = new Map<string, Pawn>();
  for (const [key, pawn] of Object.entries(obj)) {
    map.set(key, pawn as Pawn);
  }
  return map;
}

export function useMultiplayerGame({ roomId, userId, myColor, isMyTurn }: UseMultiplayerGameOptions) {
  const { playSound } = useSoundEffects();

  const [gameState, setGameState] = useState<GameState>(() => ({
    pawns: createInitialPawns(),
    currentPlayer: 'blue',
    selectedHex: null,
    possibleMoves: [],
    ricochetPath: [],
    moveHistory: [],
    historyIndex: -1,
    gameOver: false,
    winner: null
  }));

  const moveCountRef = useRef(0);

  // Load initial game state from room
  useEffect(() => {
    const loadState = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('game_state')
        .eq('id', roomId)
        .single();
      
      if (data?.game_state && typeof data.game_state === 'object') {
        const gs = data.game_state as any;
        if (gs.pawns && gs.currentPlayer) {
          setGameState(prev => ({
            ...prev,
            pawns: deserializePawns(gs.pawns),
            currentPlayer: gs.currentPlayer,
            moveHistory: gs.moveHistory || [],
            historyIndex: gs.historyIndex ?? -1,
            gameOver: gs.gameOver || false,
            winner: gs.winner || null,
          }));
          moveCountRef.current = gs.moveCount || 0;
        }
      }
    };
    loadState();
  }, [roomId]);

  // Subscribe to game_state changes via realtime
  useEffect(() => {
    const channel = supabase
      .channel(`game-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const gs = (payload.new as any).game_state;
          if (!gs || !gs.pawns) return;

          const incomingCount = gs.moveCount || 0;
          // Only apply if this is a newer state than what we have
          if (incomingCount > moveCountRef.current) {
            moveCountRef.current = incomingCount;
            setGameState(prev => ({
              ...prev,
              pawns: deserializePawns(gs.pawns),
              currentPlayer: gs.currentPlayer,
              moveHistory: gs.moveHistory || [],
              historyIndex: gs.historyIndex ?? -1,
              gameOver: gs.gameOver || false,
              winner: gs.winner || null,
              selectedHex: null,
              possibleMoves: [],
              ricochetPath: [],
            }));
            playSound('move');
          }

          // Check for winner update
          const winner = (payload.new as any).winner;
          if (winner) {
            setGameState(prev => ({ ...prev, gameOver: true, winner }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, playSound]);

  // Save game state to Supabase
  const syncGameState = useCallback(async (newState: GameState, newMoveCount: number) => {
    const serialized = {
      pawns: serializePawns(newState.pawns),
      currentPlayer: newState.currentPlayer,
      moveHistory: newState.moveHistory,
      historyIndex: newState.historyIndex,
      gameOver: newState.gameOver,
      winner: newState.winner,
      moveCount: newMoveCount,
    };

    const updateData: any = {
      game_state: serialized,
      updated_at: new Date().toISOString(),
    };

    if (newState.winner) {
      updateData.winner = newState.winner;
      updateData.status = 'finished';
    }

    await supabase
      .from('game_rooms')
      .update(updateData)
      .eq('id', roomId);
  }, [roomId]);

  // Record move in game_moves table
  const recordMove = useCallback(async (from: HexCoord, to: HexCoord, moveNumber: number) => {
    await supabase.from('game_moves').insert({
      room_id: roomId,
      player_id: userId,
      from_q: from.q,
      from_r: from.r,
      to_q: to.q,
      to_r: to.r,
      move_number: moveNumber,
    });
  }, [roomId, userId]);

  const selectHex = useCallback((hex: HexCoord) => {
    if (!isMyTurn || gameState.gameOver) return;

    setGameState(prev => {
      if (prev.gameOver) return prev;

      const pawn = prev.pawns.get(hexKey(hex));

      // Select own active pawn
      if (pawn && pawn.color === myColor && pawn.state === 'active') {
        playSound('select');
        const { moves, ricochetPath } = getPossibleMoves(hex, prev.pawns);
        return { ...prev, selectedHex: hex, possibleMoves: moves, ricochetPath };
      }

      // Execute move if valid target
      if (prev.selectedHex) {
        if (hex.q === prev.selectedHex.q && hex.r === prev.selectedHex.r) {
          return { ...prev, selectedHex: null, possibleMoves: [], ricochetPath: [] };
        }

        const isValidMove = prev.possibleMoves.some(m => m.q === hex.q && m.r === hex.r);
        if (isValidMove) {
          const from = prev.selectedHex;
          const to = hex;
          const newPawns = new Map(prev.pawns);
          const movingPawn = newPawns.get(hexKey(from));
          if (!movingPawn) return prev;

          newPawns.delete(hexKey(from));
          newPawns.set(hexKey(to), movingPawn);

          const wasRicochet = isRicochetMove(from, to, prev.ricochetPath);
          playSound(wasRicochet ? 'ricochet' : 'move');

          const { neutralized, recovered } = checkSandwichEffects(to, prev.currentPlayer, newPawns);
          for (const h of neutralized) {
            const p = newPawns.get(hexKey(h));
            if (p) newPawns.set(hexKey(h), { ...p, state: 'neutralized' });
          }
          for (const h of recovered) {
            const p = newPawns.get(hexKey(h));
            if (p) newPawns.set(hexKey(h), { ...p, state: 'active' });
          }

          const captured = checkCapture(to, prev.currentPlayer, newPawns);
          for (const h of captured) newPawns.delete(hexKey(h));

          if (neutralized.length > 0 || captured.length > 0) playSound('capture');

          const move: Move = {
            from, to,
            player: prev.currentPlayer,
            isRicochet: wasRicochet,
            neutralized: neutralized[0],
            recovered: recovered[0],
            captured: captured[0],
            moveNumber: Math.floor(prev.moveHistory.length / 2) + 1,
          };

          const newHistory = [...prev.moveHistory.slice(0, prev.historyIndex + 1), move];
          const winner = checkWinCondition(newPawns);
          if (winner) playSound('victory');

          const newMoveCount = moveCountRef.current + 1;
          moveCountRef.current = newMoveCount;

          const newState: GameState = {
            pawns: newPawns,
            currentPlayer: getOpponentColor(prev.currentPlayer),
            selectedHex: null,
            possibleMoves: [],
            ricochetPath: [],
            moveHistory: newHistory,
            historyIndex: newHistory.length - 1,
            gameOver: winner !== null,
            winner,
          };

          // Sync to DB (fire-and-forget)
          syncGameState(newState, newMoveCount);
          recordMove(from, to, move.moveNumber);

          return newState;
        }
      }

      return { ...prev, selectedHex: null, possibleMoves: [], ricochetPath: [] };
    });
  }, [isMyTurn, gameState.gameOver, myColor, playSound, syncGameState, recordMove]);

  return { gameState, selectHex };
}
