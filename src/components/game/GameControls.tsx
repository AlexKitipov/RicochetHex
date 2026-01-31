import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, RotateCcw, Volume2, VolumeX, HelpCircle, Bot, Users, ArrowLeft, Loader2, Pause, Play, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  redDifficulty = 'medium'
}) => {
  return <div className="bg-card border border-border rounded-lg p-4 space-y-4 py-[8px]">
      {/* Game Mode Badge */}
      <div className="flex items-center justify-center gap-2">
        <div className={`
          inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
          ${gameMode === 'ai-vs-ai' ? 'bg-chart-5/10 text-chart-5' : gameMode === 'vs-ai' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
        `}>
          {gameMode === 'ai-vs-ai' ? <>
              <Eye className="h-3 w-3" />
              AI vs AI (🔵{difficultyLabels[blueDifficulty]} vs 🔴{difficultyLabels[redDifficulty]})
            </> : gameMode === 'vs-ai' ? <>
              <Bot className="h-3 w-3" />
              Срещу AI ({difficultyLabels[aiDifficulty]})
              <span className="ml-1">
                • Ти: {playerColor === 'blue' ? '🔵' : '🔴'}
              </span>
            </> : <>
              <Users className="h-3 w-3" />
              Локален мултиплейър
            </>}
        </div>
      </div>
      
      {/* Player Indicator */}
      <div className="text-center">
        {gameOver ? <div className="space-y-2">
            <p className="text-lg font-bold text-foreground">🏆 Игра Приключи!</p>
            <p className={`text-xl font-bold ${winner === 'blue' ? 'text-blue-600' : 'text-red-600'}`}>
              {winner === 'blue' ? '🔵 Сините' : '🔴 Червените'} печелят!
            </p>
          </div> : <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ход на:</p>
            <div className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg
              ${currentPlayer === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}
            `}>
              {isAIThinking ? <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI мисли...
                </> : isPaused && gameMode === 'ai-vs-ai' ? <>
                  {currentPlayer === 'blue' ? '🔵 Сините' : '🔴 Червените'}
                  <span className="text-sm font-normal ml-1">(пауза)</span>
                </> : <>
                  {currentPlayer === 'blue' ? '🔵 Сините' : '🔴 Червените'}
                  {gameMode === 'vs-ai' && currentPlayer === aiColor && ' (AI)'}
                  {gameMode === 'ai-vs-ai' && ' (AI)'}
                </>}
            </div>
          </div>}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        {/* Pause/Play button for AI vs AI */}
        {gameMode === 'ai-vs-ai' && !gameOver && onTogglePause && <Button variant={isPaused ? "default" : "outline"} size="sm" onClick={onTogglePause} className="gap-1">
            {isPaused ? <>
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Продължи</span>
              </> : <>
                <Pause className="h-4 w-4" />
                <span className="hidden sm:inline">Пауза</span>
              </>}
          </Button>}
        
        <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-1">
          <Undo2 className="h-4 w-4" />
          <span className="hidden sm:inline">Назад</span>
        </Button>
        
        <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} className="gap-1">
          <Redo2 className="h-4 w-4" />
          <span className="hidden sm:inline">Напред</span>
        </Button>
        
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1">
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Нова игра</span>
        </Button>
        
        <Button variant="outline" size="sm" onClick={onToggleSound} className="gap-1">
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        
        <Button variant="outline" size="sm" onClick={onChangeMode} className="gap-1" disabled={isAIThinking}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Меню</span>
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Правила</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">📜 Правила на играта</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-4 text-left text-sm">
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">🎯 Цел</h4>
                    <p>Докарайте 3 или повече от вашите активни пешки до задния ред на противника.</p>
                  </section>
                  
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">♟️ Движение</h4>
                    <p>Пешките се движат по права линия във всяка от 6-те посоки на шестоъгълната мрежа. Движението продължава докато не срещне:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Друга пешка (спира преди нея)</li>
                      <li>Край на дъската (рикошет!)</li>
                    </ul>
                  </section>
                  
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">⟲ Рикошет</h4>
                    <p>Когато пешка удари ръба на дъската, тя се отразява и продължава в нова посока. Пешката може да спре на всяка точка по пътя си.</p>
                  </section>
                  
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">✕ Неутрализация</h4>
                    <p>Ако след ход противникова пешка остане "захваната" между две ваши пешки в права линия, тя се неутрализира (не може да се движи повече, но остава на дъската).</p>
                  </section>
                  
                  <section>
                    <h4 className="font-semibold text-foreground mb-1">⌨️ Клавишни комбинации</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Z</kbd> - Назад</li>
                      <li><kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Y</kbd> - Напред</li>
                    </ul>
                  </section>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};