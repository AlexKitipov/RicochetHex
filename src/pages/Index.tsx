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
  
  const { 
    gameState, 
    selectHex, 
    undo, 
    redo, 
    resetGame: baseResetGame, 
    canUndo, 
    canRedo,
    isAIThinking,
    aiColor
  } = useAIGame({ mode: gameMode, difficulty: aiDifficulty, playerColor });
  
  const { soundEnabled, toggleSound } = useSoundEffects();
  const isMobile = useIsMobile();
  
  const handleStartGame = (mode: GameMode, difficulty: AIDifficulty, color: PlayerColor) => {
    setGameMode(mode);
    setAIDifficulty(difficulty);
    setPlayerColor(color);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center">
            ♟️ RicochetHex
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Шестоъгълен стратегически шах с рикошет
          </p>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-6">
        <div className={`
          grid gap-6
          ${isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px]'}
        `}>
          {/* Game Board Section */}
          <div className="space-y-4">
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
            />
            
            <div className="flex justify-center overflow-auto py-4">
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
          <div className={isMobile ? 'order-first' : ''}>
            <MoveHistory
              moves={gameState.moveHistory}
              currentIndex={gameState.historyIndex}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          Локален мултиплейър режим • Ctrl+Z/Y за Undo/Redo
        </div>
      </footer>
    </div>
  );
};

export default Index;
