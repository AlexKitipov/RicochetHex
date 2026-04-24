import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameState } from './useGameState';
import { useGameSaveLoad, SavedGame } from './useGameSaveLoad';
import { getAIMove, getBestMove, getRandomMove, AIDifficulty } from '@/lib/gameAI';
import { PlayerColor, getOpponentColor, Pawn } from '@/lib/hexUtils';

export type GameMode = 'local' | 'vs-ai' | 'ai-vs-ai';

interface UseAIGameOptions {
  mode: GameMode;
  difficulty: AIDifficulty;
  playerColor: PlayerColor;
  blueDifficulty?: AIDifficulty;
  redDifficulty?: AIDifficulty;
  enabled?: boolean;
}

export function useAIGame(options: UseAIGameOptions) {
  const { mode, difficulty, playerColor, blueDifficulty = 'medium', redDifficulty = 'medium', enabled = true } = options;
  const gameStateHook = useGameState();
  const { gameState, selectHex, executeMoveDirect, resetGame: baseResetGame, getPawnSnapshots, loadGameState } = gameStateHook;
  const { saveGame: saveToStorage, loadGame: loadFromStorage, hasSavedGame, deleteSavedGame } = useGameSaveLoad();  
  
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);
  const isAIThinkingRef = useRef(isAIThinking);
  const isPausedRef = useRef(isPaused);
  
  // Keep refs updated
  gameStateRef.current = gameState;
  isAIThinkingRef.current = isAIThinking;
  isPausedRef.current = isPaused;
  
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

  // Execute AI move using direct execution
  // Using refs to avoid dependency issues that cause the effect to re-run and cancel timeouts
  const executeAIMove = useCallback(() => {
    // Use refs for all checks to avoid stale closure issues
    const currentState = gameStateRef.current;
    const thinking = isAIThinkingRef.current;
    const paused = isPausedRef.current;
    
    // Check conditions using current state
    const currentIsAITurn = !currentState.gameOver && (
      (mode === 'vs-ai' && currentState.currentPlayer === aiColor) ||
      (mode === 'ai-vs-ai')
    );
    
    if (!currentIsAITurn || thinking || paused) return;
    
    // Diagnostic log: AI move scheduling
    console.debug('[useAIGame] executeAIMove called', { currentIsAITurn, thinking, paused, currentPlayer: currentState.currentPlayer });

    setIsAIThinking(true);
    
    // Get difficulty for current player
    const currentDifficulty = mode === 'ai-vs-ai' 
      ? (currentState.currentPlayer === 'blue' ? blueDifficulty : redDifficulty)
      : difficulty;
    const currentColor = mode === 'ai-vs-ai' ? currentState.currentPlayer : aiColor;
    
    const thinkingTime = currentDifficulty === 'easy' ? 500 : currentDifficulty === 'medium' ? 800 : 1200;
    
    // Clear any existing timeout before scheduling a new one
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    aiTimeoutRef.current = setTimeout(() => {
      try {
        // Use ref to get current state inside timeout
        const stateAtExecution = gameStateRef.current;
        console.debug('[useAIGame] computing AI move', { currentColor, currentDifficulty, pawnsCount: stateAtExecution.pawns.size });

        const move = getAIMove(stateAtExecution.pawns, currentColor, currentDifficulty);
        console.debug('[useAIGame] getAIMove result', { move });
        
        if (move) {
          try {
            executeMoveDirect(move.from, move.to);
            console.debug('[useAIGame] executeMoveDirect succeeded', { from: move.from, to: move.to });
          } catch (execErr) {
            console.error('[useAIGame] executeMoveDirect threw', execErr);
          }
        } else {
          console.warn('[useAIGame] No move returned by getAIMove; attempting fallbacks');
          // Try medium-style best move or random to avoid lock
          try {
            const fallback = getBestMove(stateAtExecution.pawns, currentColor) || getRandomMove(stateAtExecution.pawns, currentColor);
            if (fallback) {
              executeMoveDirect(fallback.from, fallback.to);
              console.debug('[useAIGame] executeMoveDirect succeeded with fallback', { from: fallback.from, to: fallback.to });
            } else {
              console.error('[useAIGame] No fallback move available — possible terminal position or move-generation bug', { pawnsCount: stateAtExecution.pawns.size });
            }
          } catch (fallbackErr) {
            console.error('[useAIGame] Fallback execution failed', fallbackErr);
          }
        }
      } catch (err) {
        console.error('[useAIGame] Error while computing/executing AI move', err);
      } finally {
        // Ensure the thinking flag is always reset
        setIsAIThinking(false);
      }
    }, thinkingTime);
  }, [mode, aiColor, blueDifficulty, redDifficulty, difficulty, executeMoveDirect]);

  // Trigger AI move when it's AI's turn - use a stable interval-based approach
  // to avoid issues with effect cleanup canceling pending AI moves
  useEffect(() => {
    // Only run in AI modes
    if (mode === 'local') return;
    
    const checkAndExecuteAI = () => {
      const currentState = gameStateRef.current;
      const thinking = isAIThinkingRef.current;
      const paused = isPausedRef.current;
      
      const shouldAIMove = !currentState.gameOver && !thinking && !paused && (
        (mode === 'vs-ai' && currentState.currentPlayer === aiColor) ||
        (mode === 'ai-vs-ai')
      );
      
      if (shouldAIMove) {
        executeAIMove();
      }
    };
    
    // Check immediately
    checkAndExecuteAI();
    
    // Also set up an interval to catch any missed triggers
    const intervalId = setInterval(checkAndExecuteAI, 200);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [mode, aiColor, executeAIMove]);

  // Cleanup any pending AI timeout only on unmount.
  // NOTE: We intentionally do NOT clear the timeout in the effect above,
  // because `setIsAIThinking(true)` would re-run the effect and its cleanup,
  // potentially cancelling the scheduled AI move (a common cause of AI-vs-AI
  // getting stuck after a few moves).
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, []);

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
      aiTimeoutRef.current = null;
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