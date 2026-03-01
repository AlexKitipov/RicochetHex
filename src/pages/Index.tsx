import React, { useState, lazy, Suspense } from 'react';
import { GameModeSelector, GameMode } from '@/components/game/GameModeSelector';
import { useAIGame } from '@/hooks/useAIGame';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load heavy game components (only needed after game starts)
const HexBoard = lazy(() => import('@/components/game/HexBoard').then(m => ({ default: m.HexBoard })));
const MoveHistory = lazy(() => import('@/components/game/MoveHistory').then(m => ({ default: m.MoveHistory })));
const GameControls = lazy(() => import('@/components/game/GameControls').then(m => ({ default: m.GameControls })));
import type { PlayerColor } from '@/lib/hexUtils';
import type { AIDifficulty } from '@/lib/gameAI';

const Index = () => {
  // ============ ALL HOOKS MUST BE CALLED FIRST (before any conditional returns) ============
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('easy');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');
  const [blueDifficulty, setBlueDifficulty] = useState<AIDifficulty>('medium');
  const [redDifficulty, setRedDifficulty] = useState<AIDifficulty>('medium');
  
  const { soundEnabled, toggleSound } = useSoundEffects();
  const isMobile = useIsMobile();
  
  const { 
    gameState, 
    selectHex, 
    undo, 
    redo, 
    resetGame: baseResetGame, 
    canUndo, 
    canRedo,
    isAIThinking,
    aiColor,
    isPaused,
    togglePause,
    saveGame,
    loadGame,
    hasSavedGame
  } = useAIGame({ 
    mode: gameMode, 
    difficulty: aiDifficulty, 
    playerColor,
    blueDifficulty,
    redDifficulty
  });
  // ============ END OF HOOKS ============
  
  const handleStartGame = (
    mode: GameMode, 
    difficulty: AIDifficulty, 
    color: PlayerColor,
    blueAIDiff?: AIDifficulty,
    redAIDiff?: AIDifficulty
  ) => {
    setGameMode(mode);
    setAIDifficulty(difficulty);
    setPlayerColor(color);
    if (blueAIDiff) setBlueDifficulty(blueAIDiff);
    if (redAIDiff) setRedDifficulty(redAIDiff);
    setGameStarted(true);
  };
  
  const handleChangeMode = () => {
    baseResetGame();
    setGameStarted(false);
  };
  
  const resetGame = () => {
    baseResetGame();
  };
  
  if (!gameStarted) {
    return <GameModeSelector onStart={handleStartGame} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header with gradient accent line */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm shrink-0 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto px-4 py-1.5">
          <h1 className="text-sm md:text-base font-bold text-center">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RicochetHex
            </span>
            <span className="font-normal text-muted-foreground text-xs hidden sm:inline ml-2">
              Шестоъгълен стратегически шах
            </span>
          </h1>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 min-h-0 container mx-auto px-2 md:px-4 py-2 md:py-3 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Зареждане...</span>
            </div>
          </div>
        }>
          <div className={`
            h-full gap-2 md:gap-3
            ${isMobile 
              ? 'flex flex-col' 
              : 'grid grid-cols-[minmax(0,1fr)_minmax(180px,22vw)]'}
          `}>
            {/* Game Board Section */}
            <div className={`flex flex-col gap-2 overflow-hidden ${isMobile ? 'flex-1 min-h-0' : 'min-h-0'}`}>
              <div className="shrink-0">
                <GameControls
                  currentPlayer={gameState.currentPlayer}
                  gameOver={gameState.gameOver}
                  winner={gameState.winner}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  soundEnabled={soundEnabled}
                  onUndo={undo}
                  onRedo={redo}
                  onReset={resetGame}
                  onToggleSound={toggleSound}
                  gameMode={gameMode}
                  aiDifficulty={aiDifficulty}
                  isAIThinking={isAIThinking}
                  onChangeMode={handleChangeMode}
                  playerColor={playerColor}
                  aiColor={aiColor}
                  isPaused={isPaused}
                  onTogglePause={togglePause}
                  blueDifficulty={blueDifficulty}
                  redDifficulty={redDifficulty}
                  onSave={saveGame}
                  onLoad={loadGame}
                  hasSavedGame={hasSavedGame()}
                />
              </div>
              
              <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
                <HexBoard
                  pawns={gameState.pawns}
                  selectedHex={gameState.selectedHex}
                  possibleMoves={gameState.possibleMoves}
                  ricochetPath={gameState.ricochetPath}
                  onHexClick={selectHex}
                />
              </div>
            </div>

            {/* Move History Section */}
            <div className={`${isMobile ? 'h-32 shrink-0' : 'min-h-0 overflow-hidden'}`}>
              <MoveHistory
                moves={gameState.moveHistory}
                currentIndex={gameState.historyIndex}
              />
            </div>
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm shrink-0 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="container mx-auto px-3 py-0.5 text-center text-[10px] text-muted-foreground">
          Ctrl+Z/Y: Undo/Redo
        </div>
      </footer>
    </div>
  );
};

export default Index;
