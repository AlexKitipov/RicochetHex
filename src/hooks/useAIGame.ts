import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameState } from './useGameState';
import { getAIMove, AIDifficulty } from '@/lib/gameAI';
import { hexKey } from '@/lib/hexUtils';

export type GameMode = 'local' | 'vs-ai';

interface UseAIGameOptions {
  mode: GameMode;
  difficulty: AIDifficulty;
}

export function useAIGame(options: UseAIGameOptions) {
  const { mode, difficulty } = options;
  const gameStateHook = useGameState();
  const { gameState, selectHex, resetGame: baseResetGame } = gameStateHook;
  
  const [isAIThinking, setIsAIThinking] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI plays as red
  const isAITurn = mode === 'vs-ai' && 
                   gameState.currentPlayer === 'red' && 
                   !gameState.gameOver;

  // Execute AI move
  const executeAIMove = useCallback(() => {
    if (!isAITurn || isAIThinking) return;
    
    setIsAIThinking(true);
    
    // Add delay for natural feel
    const thinkingTime = difficulty === 'easy' ? 500 : 800;
    
    aiTimeoutRef.current = setTimeout(() => {
      const move = getAIMove(gameState.pawns, 'red', difficulty);
      
      if (move) {
        // First select the pawn
        selectHex(move.from);
        
        // Then execute the move after a brief delay
        setTimeout(() => {
          selectHex(move.to);
          setIsAIThinking(false);
        }, 100);
      } else {
        setIsAIThinking(false);
      }
    }, thinkingTime);
  }, [isAITurn, isAIThinking, gameState.pawns, difficulty, selectHex]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (isAITurn && !isAIThinking) {
      executeAIMove();
    }
    
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [isAITurn, executeAIMove, isAIThinking]);

  // Wrapper for selectHex that prevents moves during AI turn
  const selectHexWrapper = useCallback((hex: { q: number; r: number }) => {
    if (isAIThinking || (mode === 'vs-ai' && gameState.currentPlayer === 'red')) {
      return; // Ignore clicks during AI turn
    }
    selectHex(hex);
  }, [selectHex, isAIThinking, mode, gameState.currentPlayer]);

  // Reset game and clear AI state
  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    setIsAIThinking(false);
    baseResetGame();
  }, [baseResetGame]);

  return {
    ...gameStateHook,
    selectHex: selectHexWrapper,
    resetGame,
    isAIThinking,
    gameMode: mode,
    aiDifficulty: difficulty,
    // Disable undo/redo during AI thinking
    canUndo: gameStateHook.canUndo && !isAIThinking,
    canRedo: gameStateHook.canRedo && !isAIThinking
  };
}
