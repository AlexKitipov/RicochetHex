import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Bot, Zap, Brain, Sparkles } from 'lucide-react';
import type { AIDifficulty } from '@/lib/gameAI';
import type { PlayerColor } from '@/lib/hexUtils';

export type GameMode = 'local' | 'vs-ai';

interface GameModeSelectorProps {
  onStart: (mode: GameMode, difficulty: AIDifficulty, playerColor: PlayerColor) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('local');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');

  const handleStart = () => {
    onStart(selectedMode, difficulty, playerColor);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            🎮 Избери режим
          </CardTitle>
          <CardDescription>
            Играй локално с приятел или срещу AI противник
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selection */}
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setSelectedMode(value as GameMode)}
            className="grid grid-cols-2 gap-4"
          >
            {/* Local Multiplayer */}
            <div>
              <RadioGroupItem
                value="local"
                id="local"
                className="peer sr-only"
              />
              <Label
                htmlFor="local"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <Users className="mb-3 h-8 w-8 text-primary" />
                <span className="text-lg font-medium">Локален</span>
                <span className="text-xs text-muted-foreground">Мултиплейър</span>
              </Label>
            </div>

            {/* VS AI */}
            <div>
              <RadioGroupItem
                value="vs-ai"
                id="vs-ai"
                className="peer sr-only"
              />
              <Label
                htmlFor="vs-ai"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <Bot className="mb-3 h-8 w-8 text-destructive" />
                <span className="text-lg font-medium">Срещу AI</span>
                <span className="text-xs text-muted-foreground">Компютърен противник</span>
              </Label>
            </div>
          </RadioGroup>

          {/* AI Options (only shown when AI mode is selected) */}
          {selectedMode === 'vs-ai' && (
            <div className="space-y-5 animate-fade-in">
              {/* Difficulty Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Трудност на AI:</Label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as AIDifficulty)}
                  className="grid grid-cols-3 gap-3"
                >
                  <div>
                    <RadioGroupItem
                      value="easy"
                      id="easy"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="easy"
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Zap className="h-4 w-4 text-chart-4" />
                      <span className="font-medium">Лесно</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="medium"
                      id="medium"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="medium"
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Brain className="h-4 w-4 text-chart-5" />
                      <span className="font-medium">Средно</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="hard"
                      id="hard"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="hard"
                      className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Sparkles className="h-4 w-4 text-destructive" />
                      <span className="font-medium">Трудно</span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {difficulty === 'easy' 
                    ? '🎲 AI избира случайни валидни ходове'
                    : difficulty === 'medium'
                    ? '🧠 AI оценява и избира стратегически най-добрите ходове'
                    : '♟️ AI използва minimax алгоритъм за оптимална игра'
                  }
                </p>
              </div>

              {/* Player Color Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Твоят цвят:</Label>
                <RadioGroup
                  value={playerColor}
                  onValueChange={(value) => setPlayerColor(value as PlayerColor)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <RadioGroupItem
                      value="blue"
                      id="blue"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="blue"
                      className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 [&:has([data-state=checked])]:border-blue-500 cursor-pointer transition-all"
                    >
                      <span className="text-2xl">🔵</span>
                      <span className="font-medium">Сините</span>
                      <span className="text-xs text-muted-foreground">Първи ход</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="red"
                      id="red"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="red"
                      className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10 [&:has([data-state=checked])]:border-red-500 cursor-pointer transition-all"
                    >
                      <span className="text-2xl">🔴</span>
                      <span className="font-medium">Червените</span>
                      <span className="text-xs text-muted-foreground">Втори ход</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Start Button */}
          <Button 
            onClick={handleStart} 
            className="w-full text-lg py-6"
            size="lg"
          >
            🚀 Започни игра
          </Button>

          {/* Game Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>🔵 Сините започват първи</p>
            {selectedMode === 'vs-ai' && (
              <p>
                {playerColor === 'blue' 
                  ? '🤖 AI играе с червените' 
                  : '🤖 AI играе със сините (първи ход)'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
