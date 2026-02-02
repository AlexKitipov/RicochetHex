import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameState } from './useGameState';
import { useGameSaveLoad, SavedGame } from './useGameSaveLoad';
import { getAIMove, AIDifficulty } from '@/lib/gameAI';
import { PlayerColor, getOpponentColor, Pawn } from '@/lib/hexUtils';

export type GameMode = 'local' | 'vs-ai' | 'ai-vs-ai';

interface UseAIGameOptions {
  mode: GameMode;
  difficulty: AIDifficulty;
  playerColor: PlayerColor;
  blueDifficulty?: AIDifficulty;
  redDifficulty?: AIDifficulty;
}

export function useAIGame(options: UseAIGameOptions) {
  const { mode, difficulty, playerColor, blueDifficulty = 'medium', redDifficulty = 'medium' } = options;
  const gameStateHook = useGameState();
  const { gameState, selectHex, resetGame: baseResetGame, getPawnSnapshots, loadGameState } = gameStateHook;
  const { saveGame: saveToStorage, loadGame: loadFromStorage, hasSavedGame, deleteSavedGame } = useGameSaveLoad();
  
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI plays as opponent color in vs-ai mode
  const aiColor = getOpponentColor(playerColor);
  
  // Determine if it's AI's turn based on mode
  const isAITurn = !gameState.gameOver && (
    (mode === 'vs-ai' && gameState.currentPlayer === aiColor) ||
    (mode === 'ai-vs-ai' && !isPaused)
  );

  // Get the appropriate difficulty for the current player in AI vs AI mode
  const getCurrentAIDifficulty = useCallback((): AIDifficulty => {
    if (mode === 'ai-vs-ai') {
      return gameState.currentPlayer === 'blue' ? blueDifficulty : redDifficulty;
    }
    return difficulty;
  }, [mode, gameState.currentPlayer, blueDifficulty, redDifficulty, difficulty]);

  // Execute AI move
  const executeAIMove = useCallback(() => {
    if (!isAITurn || isAIThinking || isPaused) return;
    
    setIsAIThinking(true);
    
    const currentDifficulty = getCurrentAIDifficulty();
    const currentColor = mode === 'ai-vs-ai' ? gameState.currentPlayer : aiColor;
    
    // Add delay for natural feel
    const thinkingTime = currentDifficulty === 'easy' ? 500 : currentDifficulty === 'medium' ? 800 : 1200;
    
    aiTimeoutRef.current = setTimeout(() => {
      const move = getAIMove(gameState.pawns, currentColor, currentDifficulty);
      
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
  }, [isAITurn, isAIThinking, isPaused, gameState.pawns, gameState.currentPlayer, selectHex, aiColor, mode, getCurrentAIDifficulty]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (isAITurn && !isAIThinking && !isPaused) {
      executeAIMove();
    }
    
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [isAITurn, executeAIMove, isAIThinking, isPaused]);

  // Wrapper for selectHex that prevents moves during AI turn
  const selectHexWrapper = useCallback((hex: { q: number; r: number }) => {
    // In AI vs AI mode, no player moves allowed
    if (mode === 'ai-vs-ai') return;
    
    if (isAIThinking || (mode === 'vs-ai' && gameState.currentPlayer === aiColor)) {
      return; // Ignore clicks during AI turn
    }
    selectHex(hex);
  }, [selectHex, isAIThinking, mode, gameState.currentPlayer, aiColor]);

  // Reset game and clear AI state
  const resetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    setIsAIThinking(false);
    setIsPaused(false);
    baseResetGame();
  }, [baseResetGame]);

  // Toggle pause for AI vs AI mode
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Save current game
  const saveCurrentGame = useCallback((): boolean => {
    const snapshots = getPawnSnapshots();
    return saveToStorage(
      gameState,
      snapshots,
      mode,
      difficulty,
      playerColor,
      blueDifficulty,
      redDifficulty
    );
  }, [gameState, getPawnSnapshots, saveToStorage, mode, difficulty, playerColor, blueDifficulty, redDifficulty]);

  // Load saved game (returns settings to apply)
  const loadSavedGame = useCallback((): SavedGame | null => {
    const saved = loadFromStorage();
    if (!saved) return null;

    // Convert arrays back to Maps
    const pawns = new Map<string, Pawn>(saved.pawns);
    const snapshots = saved.pawnSnapshots.map(snapshot => new Map<string, Pawn>(snapshot));

    // Load into game state
    loadGameState(
      pawns,
      saved.currentPlayer,
      saved.moveHistory,
      saved.historyIndex,
      saved.gameOver,
      saved.winner,
      snapshots
    );

    return saved;
  }, [loadFromStorage, loadGameState]);

  return {
    ...gameStateHook,
    selectHex: selectHexWrapper,
    resetGame,
    isAIThinking,
    isPaused,
    togglePause,
    gameMode: mode,
    aiDifficulty: difficulty,
    playerColor,
    aiColor,
    blueDifficulty,
    redDifficulty,
    // Save/Load functionality
    saveGame: saveCurrentGame,
    loadGame: loadSavedGame,
    hasSavedGame,
    deleteSavedGame,
    // Disable undo/redo during AI thinking or in AI vs AI mode
    canUndo: gameStateHook.canUndo && !isAIThinking && mode !== 'ai-vs-ai',
    canRedo: gameStateHook.canRedo && !isAIThinking && mode !== 'ai-vs-ai'
  };
}
