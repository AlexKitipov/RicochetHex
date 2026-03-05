import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Bot, Zap, Brain, Sparkles, Eye, ChevronRight, Globe } from 'lucide-react';
import type { AIDifficulty } from '@/lib/gameAI';
import type { PlayerColor } from '@/lib/hexUtils';

export type GameMode = 'local' | 'vs-ai' | 'ai-vs-ai';

interface GameModeSelectorProps {
  onStart: (
    mode: GameMode, 
    difficulty: AIDifficulty, 
    playerColor: PlayerColor,
    blueDifficulty?: AIDifficulty,
    redDifficulty?: AIDifficulty
  ) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('local');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('blue');
  const [blueDifficulty, setBlueDifficulty] = useState<AIDifficulty>('medium');
  const [redDifficulty, setRedDifficulty] = useState<AIDifficulty>('medium');

  const handleStart = () => {
    onStart(selectedMode, difficulty, playerColor, blueDifficulty, redDifficulty);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-slide-up">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              RicochetHex
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Hexagonal strategic chess</p>
        </div>

        {/* Main card */}
        <div className="glass rounded-2xl p-6 space-y-5 shadow-xl">
          {/* Mode Selection */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 block">
              Game Mode
            </label>
            <RadioGroup
              value={selectedMode}
              onValueChange={(value) => setSelectedMode(value as GameMode)}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { value: 'local' as GameMode, icon: Users, label: 'Local', sub: '2 players' },
                { value: 'vs-ai' as GameMode, icon: Bot, label: 'vs AI', sub: '1 player' },
                { value: 'ai-vs-ai' as GameMode, icon: Eye, label: 'AI vs AI', sub: 'Spectate' },
              ].map(({ value, icon: Icon, label, sub }) => (
                <div key={value}>
                  <RadioGroupItem value={value} id={value} className="peer sr-only" />
                  <Label
                    htmlFor={value}
                    className={`
                      flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border 
                      bg-secondary/50 p-3 cursor-pointer transition-all duration-200
                      hover:bg-secondary hover:border-primary/30
                      peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 
                      peer-data-[state=checked]:shadow-glow-cyan
                      [&:has([data-state=checked])]:border-primary
                    `}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground">{sub}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* VS AI Options */}
          {selectedMode === 'vs-ai' && (
            <div className="space-y-4 animate-slide-up">
              {/* Difficulty */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                  AI Difficulty
                </label>
                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as AIDifficulty)}
                  className="grid grid-cols-3 gap-2"
                >
                  {[
                    { value: 'easy' as AIDifficulty, icon: Zap, label: 'Easy', color: 'text-emerald-400' },
                    { value: 'medium' as AIDifficulty, icon: Brain, label: 'Medium', color: 'text-amber-400' },
                    { value: 'hard' as AIDifficulty, icon: Sparkles, label: 'Hard', color: 'text-red-400' },
                  ].map(({ value, icon: Icon, label, color }) => (
                    <div key={value}>
                      <RadioGroupItem value={value} id={value} className="peer sr-only" />
                      <Label
                        htmlFor={value}
                        className={`
                          flex items-center justify-center gap-1.5 rounded-lg border border-border
                          bg-secondary/30 p-2.5 cursor-pointer transition-all duration-200
                          hover:bg-secondary/60 hover:border-primary/20
                          peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/10
                          [&:has([data-state=checked])]:border-primary/50
                        `}
                      >
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                        <span className="text-xs font-medium">{label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  {difficulty === 'easy' 
                    ? 'AI picks random moves'
                    : difficulty === 'medium'
                    ? 'AI evaluates strategically'
                    : 'AI uses minimax algorithm'
                  }
                </p>
              </div>

              {/* Player Color */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 block">
                  Your Color
                </label>
                <RadioGroup
                  value={playerColor}
                  onValueChange={(value) => setPlayerColor(value as PlayerColor)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div>
                    <RadioGroupItem value="blue" id="blue" className="peer sr-only" />
                    <Label
                      htmlFor="blue"
                      className={`
                        flex flex-col items-center justify-center gap-1 rounded-xl border border-border
                        bg-secondary/30 p-3 cursor-pointer transition-all duration-200
                        hover:bg-glow-blue/10 hover:border-glow-blue/30
                        peer-data-[state=checked]:border-glow-blue/60 peer-data-[state=checked]:bg-glow-blue/15 
                        peer-data-[state=checked]:shadow-[0_0_15px_hsl(210_85%_55%/0.2)]
                        [&:has([data-state=checked])]:border-glow-blue/60
                      `}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg" />
                       <span className="text-xs font-semibold">Blue</span>
                       <span className="text-[10px] text-muted-foreground">First move</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="red" id="red" className="peer sr-only" />
                    <Label
                      htmlFor="red"
                      className={`
                        flex flex-col items-center justify-center gap-1 rounded-xl border border-border
                        bg-secondary/30 p-3 cursor-pointer transition-all duration-200
                        hover:bg-glow-red/10 hover:border-glow-red/30
                        peer-data-[state=checked]:border-glow-red/60 peer-data-[state=checked]:bg-glow-red/15
                        peer-data-[state=checked]:shadow-[0_0_15px_hsl(355_80%_58%/0.2)]
                        [&:has([data-state=checked])]:border-glow-red/60
                      `}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg" />
                       <span className="text-xs font-semibold">Red</span>
                       <span className="text-[10px] text-muted-foreground">Second move</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* AI vs AI Options */}
          {selectedMode === 'ai-vs-ai' && (
            <div className="space-y-3 animate-slide-up">
              <div className="grid grid-cols-2 gap-3">
                {/* Blue AI */}
                <div className="space-y-2">
                   <label className="text-[10px] font-medium uppercase tracking-wider text-glow-blue flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-glow-blue" /> Blue AI
                  </label>
                  <RadioGroup
                    value={blueDifficulty}
                    onValueChange={(value) => setBlueDifficulty(value as AIDifficulty)}
                    className="space-y-1"
                  >
                    {[
                       { value: 'easy' as AIDifficulty, label: 'Easy', icon: Zap },
                       { value: 'medium' as AIDifficulty, label: 'Medium', icon: Brain },
                       { value: 'hard' as AIDifficulty, label: 'Hard', icon: Sparkles }
                    ].map(({ value, label, icon: Icon }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`blue-${value}`} />
                        <Label htmlFor={`blue-${value}`} className="flex items-center gap-1 cursor-pointer text-xs">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Red AI */}
                <div className="space-y-2">
                   <label className="text-[10px] font-medium uppercase tracking-wider text-glow-red flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-glow-red" /> Red AI
                  </label>
                  <RadioGroup
                    value={redDifficulty}
                    onValueChange={(value) => setRedDifficulty(value as AIDifficulty)}
                    className="space-y-1"
                  >
                    {[
                       { value: 'easy' as AIDifficulty, label: 'Easy', icon: Zap },
                       { value: 'medium' as AIDifficulty, label: 'Medium', icon: Brain },
                       { value: 'hard' as AIDifficulty, label: 'Hard', icon: Sparkles }
                    ].map(({ value, label, icon: Icon }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`red-${value}`} />
                        <Label htmlFor={`red-${value}`} className="flex items-center gap-1 cursor-pointer text-xs">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
               <p className="text-[10px] text-muted-foreground text-center">
                 Watch two AIs compete against each other
               </p>
            </div>
          )}

          {/* Start Button */}
          <Button 
            onClick={handleStart} 
            className="w-full text-sm font-semibold py-5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-glow-cyan transition-all duration-300 rounded-xl group"
            size="lg"
          >
            Start Game
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>

          {/* Game Info */}
          <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
            <p className="flex items-center justify-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-glow-blue inline-block" /> Blue moves first
             </p>
             {selectedMode === 'vs-ai' && (
               <p>
                 {playerColor === 'blue' 
                   ? 'AI plays as Red' 
                   : 'AI plays as Blue (first move)'}
               </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
