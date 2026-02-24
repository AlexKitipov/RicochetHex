import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, RotateCcw, Volume2, VolumeX, HelpCircle, Bot, Users, ArrowLeft, Loader2, Pause, Play, Eye, Save, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { AIDifficulty } from '@/lib/gameAI';
import type { PlayerColor } from '@/lib/hexUtils';

type GameMode = 'local' | 'vs-ai' | 'ai-vs-ai';

const difficultyLabels: Record<AIDifficulty, string> = {
  easy: 'Лесно',
  medium: 'Средно',
  hard: 'Трудно'
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
        toast.success('Играта е запазена!');
      } else {
        toast.error('Грешка при запазване');
      }
    }
  };

  const handleLoad = () => {
    if (onLoad) {
      onLoad();
      toast.success('Играта е заредена!');
    }
  };
  return <div className="bg-card border border-border rounded-lg px-3 py-2 space-y-1.5">
      {/* Game Mode Badge + Player Indicator - Combined row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
          ${gameMode === 'ai-vs-ai' ? 'bg-chart-5/10 text-chart-5' : gameMode === 'vs-ai' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
        `}>
          {gameMode === 'ai-vs-ai' ? <>
              <Eye className="h-2.5 w-2.5" />
              AI vs AI (🔵{difficultyLabels[blueDifficulty]} vs 🔴{difficultyLabels[redDifficulty]})
            </> : gameMode === 'vs-ai' ? <>
              <Bot className="h-2.5 w-2.5" />
              vs AI ({difficultyLabels[aiDifficulty]}) • Ти: {playerColor === 'blue' ? '🔵' : '🔴'}
            </> : <>
              <Users className="h-2.5 w-2.5" />
              Локален
            </>}
        </div>
      
        {/* Player Indicator - inline */}
        {gameOver ? <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">🏆</span>
            <span className={`text-xs font-bold ${winner === 'blue' ? 'text-blue-600' : 'text-red-600'}`}>
              {winner === 'blue' ? '🔵 Сините' : '🔴 Червените'} печелят!
            </span>
          </div> : <div className={`
            inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-xs
            ${currentPlayer === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}
          `}>
            {isAIThinking ? <>
                <Loader2 className="h-3 w-3 animate-spin" />
                AI мисли...
              </> : isPaused && gameMode === 'ai-vs-ai' ? <>
                {currentPlayer === 'blue' ? '🔵' : '🔴'} (пауза)
              </> : <>
                Ход: {currentPlayer === 'blue' ? '🔵' : '🔴'}
                {gameMode === 'vs-ai' && currentPlayer === aiColor && ' AI'}
                {gameMode === 'ai-vs-ai' && ' AI'}
              </>}
          </div>}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center gap-1">
        {/* Pause/Play button for AI vs AI */}
        {gameMode === 'ai-vs-ai' && !gameOver && onTogglePause && <Button variant={isPaused ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={onTogglePause}>
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>}
        
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onUndo} disabled={!canUndo} title="Назад">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onRedo} disabled={!canRedo} title="Напред">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onReset} title="Нова игра">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Save/Load buttons */}
        {onSave && (
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleSave} disabled={isAIThinking} title="Запази">
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
        
        {onLoad && hasSavedGame && (
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleLoad} disabled={isAIThinking} title="Зареди">
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
        )}
        
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onToggleSound} title={soundEnabled ? "Изключи звук" : "Включи звук"}>
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </Button>
        
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={onChangeMode} disabled={isAIThinking} title="Меню">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7" title="Правила">
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">📜 Правила на играта</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-left text-sm">
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">🎯 Цел</h4>
                    <p>Докарайте 3+ активни пешки до задния ред на противника.</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">♟️ Движение</h4>
                    <p>Пешките се движат по права линия в 6 посоки до пешка или ръб (рикошет).</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">✕ Неутрализация</h4>
                    <p>Пешка захваната между две ваши в права линия се неутрализира.</p>
                  </section>
                  <section>
                    <h4 className="font-semibold text-foreground mb-0.5">⌨️ Клавиши</h4>
                    <p><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Z</kbd> Назад · <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Y</kbd> Напред</p>
                  </section>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};