import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  HexCoord,
  PlayerColor,
  Pawn,
  Move,
  hexKey,
  parseHexKey,
  createInitialPawns,
  getPossibleMoves,
  isRicochetMove,
  checkNeutralization,
  checkWinCondition,
  getOpponentColor,
  SIDE_LENGTH
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
  }, [gameState.historyIndex, gameState.moveHistory]);

  const selectHex = useCallback((hex: HexCoord) => {
    if (gameState.gameOver) return;

    const pawn = gameState.pawns.get(hexKey(hex));
    
    // If clicking on own active pawn, select it
    if (pawn && pawn.color === gameState.currentPlayer && pawn.state === 'active') {
      playSound('select');
      const { moves, ricochetPath } = getPossibleMoves(hex, gameState.pawns);
      setGameState(prev => ({
        ...prev,
        selectedHex: hex,
        possibleMoves: moves,
        ricochetPath
      }));
      return;
    }

    // If a pawn is already selected
    if (gameState.selectedHex) {
      // If clicking on the same hex, deselect
      if (hex.q === gameState.selectedHex.q && hex.r === gameState.selectedHex.r) {
        setGameState(prev => ({
          ...prev,
          selectedHex: null,
          possibleMoves: [],
          ricochetPath: []
        }));
        return;
      }

      // If clicking on a valid move, execute it
      const isValidMove = gameState.possibleMoves.some(
        m => m.q === hex.q && m.r === hex.r
      );
      
      if (isValidMove) {
        executeMove(gameState.selectedHex, hex);
        return;
      }
    }

    // Deselect if clicking elsewhere
    setGameState(prev => ({
      ...prev,
      selectedHex: null,
      possibleMoves: [],
      ricochetPath: []
    }));
  }, [gameState, playSound]);

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

      // Check for neutralization
      const neutralizedHex = checkNeutralization(to, prev.currentPlayer, newPawns);
      if (neutralizedHex) {
        const neutralizedPawn = newPawns.get(hexKey(neutralizedHex));
        if (neutralizedPawn) {
          newPawns.set(hexKey(neutralizedHex), {
            ...neutralizedPawn,
            state: 'neutralized'
          });
          playSound('capture');
        }
      }

      // Create move record
      const move: Move = {
        from,
        to,
        player: prev.currentPlayer,
        isRicochet: wasRicochet,
        captured: neutralizedHex || undefined,
        moveNumber: Math.floor((prev.moveHistory.length) / 2) + 1
      };

      // Truncate future history if we're not at the end
      const newHistory = prev.moveHistory.slice(0, prev.historyIndex + 1);
      newHistory.push(move);

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

  const undo = useCallback(() => {
    if (gameState.historyIndex < 0 || gameState.gameOver) return;

    setGameState(prev => {
      const move = prev.moveHistory[prev.historyIndex];
      if (!move) return prev;

      const newPawns = new Map(prev.pawns);
      const pawn = newPawns.get(hexKey(move.to));
      
      if (pawn) {
        // Move pawn back
        newPawns.delete(hexKey(move.to));
        newPawns.set(hexKey(move.from), pawn);

        // Restore neutralized pawn if any
        if (move.captured) {
          const capturedPawn = newPawns.get(hexKey(move.captured));
          if (capturedPawn) {
            newPawns.set(hexKey(move.captured), {
              ...capturedPawn,
              state: 'active'
            });
          }
        }
      }

      return {
        ...prev,
        pawns: newPawns,
        currentPlayer: move.player,
        historyIndex: prev.historyIndex - 1,
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: []
      };
    });
  }, [gameState.historyIndex, gameState.gameOver]);

  const redo = useCallback(() => {
    if (gameState.historyIndex >= gameState.moveHistory.length - 1) return;

    setGameState(prev => {
      const move = prev.moveHistory[prev.historyIndex + 1];
      if (!move) return prev;

      const newPawns = new Map(prev.pawns);
      const pawn = newPawns.get(hexKey(move.from));
      
      if (pawn) {
        // Redo the move
        newPawns.delete(hexKey(move.from));
        newPawns.set(hexKey(move.to), pawn);

        // Redo neutralization if any
        if (move.captured) {
          const capturedPawn = newPawns.get(hexKey(move.captured));
          if (capturedPawn) {
            newPawns.set(hexKey(move.captured), {
              ...capturedPawn,
              state: 'neutralized'
            });
          }
        }
      }

      const winner = checkWinCondition(newPawns);

      return {
        ...prev,
        pawns: newPawns,
        currentPlayer: getOpponentColor(move.player),
        historyIndex: prev.historyIndex + 1,
        selectedHex: null,
        possibleMoves: [],
        ricochetPath: [],
        gameOver: winner !== null,
        winner
      };
    });
  }, [gameState.historyIndex, gameState.moveHistory]);

  const resetGame = useCallback(() => {
    playSound('select');
    setGameState({
      pawns: createInitialPawns(),
      currentPlayer: 'blue',
      selectedHex: null,
      possibleMoves: [],
      ricochetPath: [],
      moveHistory: [],
      historyIndex: -1,
      gameOver: false,
      winner: null
    });
  }, [playSound]);

  return {
    gameState,
    selectHex,
    undo,
    redo,
    resetGame,
    canUndo: gameState.historyIndex >= 0 && !gameState.gameOver,
    canRedo: gameState.historyIndex < gameState.moveHistory.length - 1
  };
}
