import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Users, Bot, Zap, Brain } from 'lucide-react';
import type { AIDifficulty } from '@/lib/gameAI';

export type GameMode = 'local' | 'vs-ai';

interface GameModeSelectorProps {
  onStart: (mode: GameMode, difficulty: AIDifficulty) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('local');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('easy');

  const handleStart = () => {
    onStart(selectedMode, difficulty);
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
                <Users className="mb-3 h-8 w-8 text-blue-600" />
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
                <Bot className="mb-3 h-8 w-8 text-red-600" />
                <span className="text-lg font-medium">Срещу AI</span>
                <span className="text-xs text-muted-foreground">Компютърен противник</span>
              </Label>
            </div>
          </RadioGroup>

          {/* Difficulty Selection (only shown when AI mode is selected) */}
          {selectedMode === 'vs-ai' && (
            <div className="space-y-3 animate-fade-in">
              <Label className="text-sm font-medium">Трудност на AI:</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as AIDifficulty)}
                className="grid grid-cols-2 gap-3"
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
                    <Zap className="h-4 w-4 text-yellow-500" />
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
                    <Brain className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Средно</span>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {difficulty === 'easy' 
                  ? '🎲 AI избира случайни валидни ходове'
                  : '🧠 AI оценява и избира стратегически най-добрите ходове'
                }
              </p>
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
              <p>🔴 AI играе с червените</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
