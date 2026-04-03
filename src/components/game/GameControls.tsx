import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, RotateCcw, Volume2, VolumeX, HelpCircle, Bot, Users, ArrowLeft, Loader2, Pause, Play, Eye, Save, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { AIDifficulty } from '@/lib/gameAI';
import type { PlayerColor } from '@/lib/hexUtils';

type GameMode = 'local' | 'vs-ai' | 'ai-vs-ai';

const difficultyLabels: Record<AIDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
};

interface GameControlsProps {
  currentPlayer: 'blue' | 'red';
  gameOver: boolean;
  winner: 'blue' | 'red' | null;
  canUndo: boolean;
  canRedo: boolean;
  soundEnabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  isAIThinking: boolean;
  onChangeMode: () => void;
  playerColor: PlayerColor;
  aiColor: PlayerColor;
  isPaused?: boolean;
  onTogglePause?: () => void;
  blueDifficulty?: AIDifficulty;
  redDifficulty?: AIDifficulty;
  onSave?: () => boolean;
  onLoad?: () => void;
  hasSavedGame?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  currentPlayer,
  gameOver,
  winner,
  canUndo,
  canRedo,
  soundEnabled,
  onUndo,
  onRedo,
  onReset,
  onToggleSound,
  gameMode,
  aiDifficulty,
  isAIThinking,
  onChangeMode,
  playerColor,
  aiColor,
  isPaused = false,
  onTogglePause,
  blueDifficulty = 'medium',
  redDifficulty = 'medium',
  onSave,
  onLoad,
  hasSavedGame = false
}) => {
  const handleSave = () => {
    if (onSave) {
      const success = onSave();
      if (success) {
        toast.success('Game saved!');
      } else {
        toast.error('Failed to save game');
      }
    }
  };

  const handleLoad = () => {
    if (onLoad) {
      onLoad();
      toast.success('Game loaded!');
    }
  };

  return (
    <div className="glass rounded-xl px-3 py-2 space-y-1.5">
      {/* Game Mode Badge + Player Indicator */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider
          ${gameMode === 'ai-vs-ai' 
            ? 'bg-accent/10 text-accent border border-accent/20' 
            : gameMode === 'vs-ai' 
            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
            : 'bg-primary/10 text-primary border border-primary/20'}
        `}>
          {gameMode === 'ai-vs-ai' ? <>
              <Eye className="h-2.5 w-2.5" />
              AI vs AI
            </> : gameMode === 'vs-ai' ? <>
              <Bot className="h-2.5 w-2.5" />
              vs AI ({difficultyLabels[aiDifficulty]})
            </> : <>
              <Users className="h-2.5 w-2.5" />
              Local
            </>}
        </div>
      
        {/* Player Indicator */}
        {gameOver ? (
          <div className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs
            ${winner === 'blue' 
              ? 'bg-glow-blue/15 text-glow-blue border border-glow-blue/30 shadow-[0_0_10px_hsl(210_85%_55%/0.2)]' 
              : 'bg-glow-red/15 text-glow-red border border-glow-red/30 shadow-[0_0_10px_hsl(355_80%_58%/0.2)]'}
          `}>
            🏆 {winner === 'blue' ? 'Blue' : 'Red'} wins!
          </div>
        ) : (
          <div className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold text-xs transition-all duration-300
            ${currentPlayer === 'blue' 
              ? 'bg-glow-blue/10 text-glow-blue border border-glow-blue/25' 
              : 'bg-glow-red/10 text-glow-red border border-glow-red/25'}
          `}>
            {isAIThinking ? <>
                <Loader2 className="h-3 w-3 animate-spin" />
                AI thinking...
              </> : isPaused && gameMode === 'ai-vs-ai' ? <>
                <div className={`w-2 h-2 rounded-full ${currentPlayer === 'blue' ? 'bg-glow-blue' : 'bg-glow-red'}`} aria-hidden="true" />
                Paused
              </> : <>
                <div className={`w-2 h-2 rounded-full ${currentPlayer === 'blue' ? 'bg-glow-blue' : 'bg-glow-red'} animate-glow-pulse`} aria-hidden="true" />
                Turn: {currentPlayer === 'blue' ? 'Blue' : 'Red'}
                {gameMode === 'vs-ai' && currentPlayer === aiColor && ' (AI)'}
                {gameMode === 'ai-vs-ai' && ' (AI)'}
              </>}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center gap-1">
        {gameMode === 'ai-vs-ai' && !gameOver && onTogglePause && (
          <Button 
            variant={isPaused ? "default" : "outline"} 
            size="icon" 
            className="h-7 w-7 rounded-lg" 
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume game" : "Pause game"}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
        )}
        
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onReset} aria-label="New Game">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {onSave && (
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={handleSave} disabled={isAIThinking} aria-label="Save game">
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
        
        {onLoad && hasSavedGame && (
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={handleLoad} disabled={isAIThinking} aria-label="Load game">
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
        )}
        
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onToggleSound} aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}>
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={onChangeMode} disabled={isAIThinking} aria-label="Back to menu">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" aria-label="Game rules">
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto glass border-border">
            <DialogHeader>
              <DialogTitle className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Game Rules
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-left text-sm">
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">🎯 Objective</h4>
                    <p>Move 3+ active pawns to the opponent's back row to win.</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">♟️ Movement</h4>
                    <p>Pawns slide in a straight line (6 directions) until hitting another pawn or the board edge (ricochet).</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">✕ Neutralization</h4>
                    <p>A pawn trapped between two of yours in a straight line becomes neutralized.</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">⌨️ Shortcuts</h4>
                    <p><kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs border border-border">Ctrl+Z</kbd> Undo · <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs border border-border">Ctrl+Y</kbd> Redo</p>
                  </section>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
