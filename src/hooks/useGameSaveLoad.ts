import { useCallback } from 'react';
import { GameState, Pawn, Move, PlayerColor, createInitialPawns } from '@/lib/hexUtils';
import { AIDifficulty } from '@/lib/gameAI';
import { GameMode } from './useAIGame';

const SAVE_KEY = 'ricochethex_saved_game';

interface SavedGame {
  version: number;
  timestamp: number;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  playerColor: PlayerColor;
  blueDifficulty: AIDifficulty;
  redDifficulty: AIDifficulty;
  pawns: Array<[string, Pawn]>;
  currentPlayer: PlayerColor;
  moveHistory: Move[];
  historyIndex: number;
  gameOver: boolean;
  winner: PlayerColor | null;
  pawnSnapshots: Array<Array<[string, Pawn]>>;
}

export function useGameSaveLoad() {
  const saveGame = useCallback((
    gameState: GameState,
    pawnSnapshots: Map<string, Pawn>[],
    gameMode: GameMode,
    aiDifficulty: AIDifficulty,
    playerColor: PlayerColor,
    blueDifficulty: AIDifficulty,
    redDifficulty: AIDifficulty
  ): boolean => {
    try {
      const savedGame: SavedGame = {
        version: 1,
        timestamp: Date.now(),
        gameMode,
        aiDifficulty,
        playerColor,
        blueDifficulty,
        redDifficulty,
        pawns: Array.from(gameState.pawns.entries()),
        currentPlayer: gameState.currentPlayer,
        moveHistory: gameState.moveHistory,
        historyIndex: gameState.historyIndex,
        gameOver: gameState.gameOver,
        winner: gameState.winner,
        pawnSnapshots: pawnSnapshots.map(snapshot => Array.from(snapshot.entries()))
      };
      
      localStorage.setItem(SAVE_KEY, JSON.stringify(savedGame));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }, []);

  const loadGame = useCallback((): SavedGame | null => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved) as SavedGame;
      
      // Validate version
      if (parsed.version !== 1) {
        console.warn('Incompatible save version');
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }, []);

  const hasSavedGame = useCallback((): boolean => {
    return localStorage.getItem(SAVE_KEY) !== null;
  }, []);

  const deleteSavedGame = useCallback((): void => {
    localStorage.removeItem(SAVE_KEY);
  }, []);

  const getSaveInfo = useCallback((): { timestamp: number; gameMode: GameMode } | null => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved) as SavedGame;
      return {
        timestamp: parsed.timestamp,
        gameMode: parsed.gameMode
      };
    } catch {
      return null;
    }
  }, []);

  return {
    saveGame,
    loadGame,
    hasSavedGame,
    deleteSavedGame,
    getSaveInfo
  };
}

export type { SavedGame };
