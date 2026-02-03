import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  HexCoord,
  Pawn,
  Move,
  hexKey,
  createInitialPawns,
  getPossibleMoves,
  isRicochetMove,
  checkSandwichEffects,
  checkCapture,
  checkWinCondition,
  getOpponentColor
} from '@/lib/hexUtils';
import { useSoundEffects } from '@/hooks/useSoundEffects';

export function useGameState() {
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

  // Store snapshots for undo/redo (captures require full state restoration)
  const [pawnSnapshots, setPawnSnapshots] = useState<Map<string, Pawn>[]>([createInitialPawns()]);

  // Expose pawnSnapshots for save/load functionality
  const getPawnSnapshots = useCallback(() => pawnSnapshots, [pawnSnapshots]);

  // Load game state from saved data
  const loadGameState = useCallback((
    pawns: Map<string, Pawn>,
    currentPlayer: 'blue' | 'red',
    moveHistory: Move[],
    historyIndex: number,
    gameOver: boolean,
    winner: 'blue' | 'red' | null,
    snapshots: Map<string, Pawn>[]
  ) => {
    setGameState({
      pawns,
      currentPlayer,
      selectedHex: null,
      possibleMoves: [],
      ricochetPath: [],
      moveHistory,
      historyIndex,
      gameOver,
      winner
    });
    setPawnSnapshots(snapshots);
  }, []);

  const executeMove = useCallback((from: HexCoord, to: HexCoord) => {
    setGameState(prev => {
      const newPawns = new Map(prev.pawns);
      const pawn = newPawns.get(hexKey(from));
      
      if (!pawn) return prev;

      // Move the pawn
      newPawns.delete(hexKey(from));
      newPawns.set(hexKey(to), pawn);

      // Check for ricochet
      const wasRicochet = isRicochetMove(from, to, prev.ricochetPath);
      
      // Play appropriate sound
      if (wasRicochet) {
        playSound('ricochet');
      } else {
        playSound('move');
      }

      // Check for sandwich effects (neutralization and recovery)
      const { neutralized, recovered } = checkSandwichEffects(to, prev.currentPlayer, newPawns);
      
      // Apply neutralizations
      for (const hex of neutralized) {
        const neutralizedPawn = newPawns.get(hexKey(hex));
        if (neutralizedPawn) {
          newPawns.set(hexKey(hex), {
            ...neutralizedPawn,
            state: 'neutralized'
          });
        }
      }
      
      // Apply recoveries
      for (const hex of recovered) {
        const recoveredPawn = newPawns.get(hexKey(hex));
        if (recoveredPawn) {
          newPawns.set(hexKey(hex), {
            ...recoveredPawn,
            state: 'active'
          });
        }
      }
      
      // Check for captures (3-in-a-row adjacent to opponent)
      const captured = checkCapture(to, prev.currentPlayer, newPawns);
      
      // Remove captured pawns
      for (const hex of captured) {
        newPawns.delete(hexKey(hex));
      }
      
      // Play sound for effects
      if (neutralized.length > 0 || captured.length > 0) {
        playSound('capture');
      }

      // Create move record
      const move: Move = {
        from,
        to,
        player: prev.currentPlayer,
        isRicochet: wasRicochet,
        neutralized: neutralized[0],
        recovered: recovered[0],
        captured: captured[0],
        moveNumber: Math.floor((prev.moveHistory.length) / 2) + 1
      };

      // Truncate future history if we're not at the end
      const newHistory = prev.moveHistory.slice(0, prev.historyIndex + 1);
      newHistory.push(move);
      
      // Save pawn snapshot for undo
      setPawnSnapshots(snapshots => {
        const newSnapshots = snapshots.slice(0, prev.historyIndex + 2);
        newSnapshots.push(new Map(newPawns));
        return newSnapshots;
      });

      // Check win condition
      const winner = checkWinCondition(newPawns);
      if (winner) {
        playSound('victory');
      }

      return {
        ...prev,
        pawns: newPawns,
        currentPlayer: getOpponentColor(prev.currentPlayer),
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: [],
        moveHistory: newHistory,
        historyIndex: newHistory.length - 1,
        gameOver: winner !== null,
        winner
      };
    });
  }, [playSound]);

  // Direct move execution for AI - bypasses selection logic
  const executeMoveDirect = useCallback((from: HexCoord, to: HexCoord) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;
      
      const pawn = prev.pawns.get(hexKey(from));
      if (!pawn || pawn.color !== prev.currentPlayer || pawn.state !== 'active') {
        return prev;
      }
      
      // Verify move is valid
      const { moves } = getPossibleMoves(from, prev.pawns);
      const isValidMove = moves.some(m => m.q === to.q && m.r === to.r);
      if (!isValidMove) return prev;
      
      // Execute the move - this duplicates executeMove logic but within functional update
      const newPawns = new Map(prev.pawns);
      newPawns.delete(hexKey(from));
      newPawns.set(hexKey(to), pawn);

      // Check for ricochet
      const { ricochetPath } = getPossibleMoves(from, prev.pawns);
      const wasRicochet = isRicochetMove(from, to, ricochetPath);
      
      if (wasRicochet) {
        playSound('ricochet');
      } else {
        playSound('move');
      }

      // Check for sandwich effects
      const { neutralized, recovered } = checkSandwichEffects(to, prev.currentPlayer, newPawns);
      
      for (const hex of neutralized) {
        const neutralizedPawn = newPawns.get(hexKey(hex));
        if (neutralizedPawn) {
          newPawns.set(hexKey(hex), { ...neutralizedPawn, state: 'neutralized' });
        }
      }
      
      for (const hex of recovered) {
        const recoveredPawn = newPawns.get(hexKey(hex));
        if (recoveredPawn) {
          newPawns.set(hexKey(hex), { ...recoveredPawn, state: 'active' });
        }
      }
      
      // Check for captures
      const captured = checkCapture(to, prev.currentPlayer, newPawns);
      for (const hex of captured) {
        newPawns.delete(hexKey(hex));
      }
      
      if (neutralized.length > 0 || captured.length > 0) {
        playSound('capture');
      }

      // Create move record
      const move: Move = {
        from,
        to,
        player: prev.currentPlayer,
        isRicochet: wasRicochet,
        neutralized: neutralized[0],
        recovered: recovered[0],
        captured: captured[0],
        moveNumber: Math.floor((prev.moveHistory.length) / 2) + 1
      };

      const newHistory = prev.moveHistory.slice(0, prev.historyIndex + 1);
      newHistory.push(move);
      
      // Save snapshot
      setPawnSnapshots(snapshots => {
        const newSnapshots = snapshots.slice(0, prev.historyIndex + 2);
        newSnapshots.push(new Map(newPawns));
        return newSnapshots;
      });

      const winner = checkWinCondition(newPawns);
      if (winner) {
        playSound('victory');
      }

      return {
        ...prev,
        pawns: newPawns,
        currentPlayer: getOpponentColor(prev.currentPlayer),
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: [],
        moveHistory: newHistory,
        historyIndex: newHistory.length - 1,
        gameOver: winner !== null,
        winner
      };
    });
  }, [playSound]);

  const selectHex = useCallback((hex: HexCoord) => {
    setGameState(prev => {
      if (prev.gameOver) return prev;

      const pawn = prev.pawns.get(hexKey(hex));
      
      // If clicking on own active pawn, select it
      if (pawn && pawn.color === prev.currentPlayer && pawn.state === 'active') {
        playSound('select');
        const { moves, ricochetPath } = getPossibleMoves(hex, prev.pawns);
        return {
          ...prev,
          selectedHex: hex,
          possibleMoves: moves,
          ricochetPath
        };
      }

      // If a pawn is already selected
      if (prev.selectedHex) {
        // If clicking on the same hex, deselect
        if (hex.q === prev.selectedHex.q && hex.r === prev.selectedHex.r) {
          return {
            ...prev,
            selectedHex: null,
            possibleMoves: [],
            ricochetPath: []
          };
        }

        // If clicking on a valid move, execute it
        const isValidMove = prev.possibleMoves.some(
          m => m.q === hex.q && m.r === hex.r
        );
        
        if (isValidMove) {
          executeMove(prev.selectedHex, hex);
          return prev; // executeMove will handle state update
        }
      }

      // Deselect if clicking elsewhere
      return {
        ...prev,
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: []
      };
    });
  }, [playSound, executeMove]);

  const undo = useCallback(() => {
    if (gameState.historyIndex < 0 || gameState.gameOver) return;

    setGameState(prev => {
      const move = prev.moveHistory[prev.historyIndex];
      if (!move) return prev;

      // Restore pawns from snapshot
      const snapshotIndex = prev.historyIndex;
      const previousPawns = pawnSnapshots[snapshotIndex];
      
      if (!previousPawns) return prev;

      return {
        ...prev,
        pawns: new Map(previousPawns),
        currentPlayer: move.player,
        historyIndex: prev.historyIndex - 1,
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: []
      };
    });
  }, [gameState.historyIndex, gameState.gameOver, pawnSnapshots]);

  const redo = useCallback(() => {
    if (gameState.historyIndex >= gameState.moveHistory.length - 1) return;

    setGameState(prev => {
      const move = prev.moveHistory[prev.historyIndex + 1];
      if (!move) return prev;

      // Get pawns from next snapshot
      const snapshotIndex = prev.historyIndex + 2;
      const nextPawns = pawnSnapshots[snapshotIndex];
      
      if (!nextPawns) return prev;

      const winner = checkWinCondition(nextPawns);

      return {
        ...prev,
        pawns: new Map(nextPawns),
        currentPlayer: getOpponentColor(move.player),
        historyIndex: prev.historyIndex + 1,
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: [],
        gameOver: winner !== null,
        winner
      };
    });
  }, [gameState.historyIndex, gameState.moveHistory, pawnSnapshots]);

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const resetGame = useCallback(() => {
    playSound('select');
    const initialPawns = createInitialPawns();
    setGameState({
      pawns: initialPawns,
      currentPlayer: 'blue',
      selectedHex: null,
      possibleMoves: [],
      ricochetPath: [],
      moveHistory: [],
      historyIndex: -1,
      gameOver: false,
      winner: null
    });
    setPawnSnapshots([initialPawns]);
  }, [playSound]);

  return {
    gameState,
    selectHex,
    executeMoveDirect,
    undo,
    redo,
    resetGame,
    canUndo: gameState.historyIndex >= 0 && !gameState.gameOver,
    canRedo: gameState.historyIndex < gameState.moveHistory.length - 1,
    getPawnSnapshots,
    loadGameState
  };
}
