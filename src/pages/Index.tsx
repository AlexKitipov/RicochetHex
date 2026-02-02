import React, { useState } from 'react';
import { HexBoard } from '@/components/game/HexBoard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { GameControls } from '@/components/game/GameControls';
import { GameModeSelector, GameMode } from '@/components/game/GameModeSelector';
import { useAIGame } from '@/hooks/useAIGame';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PlayerColor } from '@/lib/hexUtils';
import type { AIDifficulty } from '@/lib/gameAI';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('easy');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');
  const [blueDifficulty, setBlueDifficulty] = useState<AIDifficulty>('medium');
  const [redDifficulty, setRedDifficulty] = useState<AIDifficulty>('medium');
  
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
  
  const { soundEnabled, toggleSound } = useSoundEffects();
  const isMobile = useIsMobile();
  
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
  
  // Show mode selector if game hasn't started
  if (!gameStarted) {
    return <GameModeSelector onStart={handleStartGame} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Compact Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="container mx-auto px-4 py-1">
          <h1 className="text-sm md:text-base font-bold text-foreground text-center">
            ♟️ RicochetHex <span className="font-normal text-muted-foreground text-xs hidden sm:inline">— Шестоъгълен стратегически шах</span>
          </h1>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 min-h-0 container mx-auto px-2 md:px-4 py-2 md:py-3 overflow-hidden">
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
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-border bg-card shrink-0">
        <div className="container mx-auto px-3 py-0.5 text-center text-[10px] text-muted-foreground">
          Ctrl+Z/Y: Undo/Redo
        </div>
      </footer>
    </div>
  );
};

export default Index;
