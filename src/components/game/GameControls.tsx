import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, RotateCcw, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  onToggleSound
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Player Indicator */}
      <div className="text-center">
        {gameOver ? (
          <div className="space-y-2">
            <p className="text-lg font-bold text-foreground">🏆 Игра Приключи!</p>
            <p className={`text-xl font-bold ${winner === 'blue' ? 'text-blue-600' : 'text-red-600'}`}>
              {winner === 'blue' ? '🔵 Сините' : '🔴 Червените'} печелят!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Ход на:</p>
            <div className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg
              ${currentPlayer === 'blue' 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}
            `}>
              {currentPlayer === 'blue' ? '🔵 Сините' : '🔴 Червените'}
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="gap-1"
        >
          <Undo2 className="h-4 w-4" />
          <span className="hidden sm:inline">Назад</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="gap-1"
        >
          <Redo2 className="h-4 w-4" />
          <span className="hidden sm:inline">Напред</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Нова игра</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className="gap-1"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
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
    </div>
  );
};
