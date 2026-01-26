import React from 'react';
import { HexBoard } from '@/components/game/HexBoard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { GameControls } from '@/components/game/GameControls';
import { useGameState } from '@/hooks/useGameState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { 
    gameState, 
    selectHex, 
    undo, 
    redo, 
    resetGame, 
    canUndo, 
    canRedo 
  } = useGameState();
  
  const { soundEnabled, toggleSound } = useSoundEffects();
  const isMobile = useIsMobile();

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
