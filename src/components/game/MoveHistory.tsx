import React from 'react';
import { Move, axialToNotation } from '@/lib/hexUtils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoveHistoryProps {
  moves: Move[];
  currentIndex: number;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves, currentIndex }) => {
  // Group moves into pairs (blue + red)
  const movePairs: { blue?: Move; red?: Move; number: number }[] = [];
  
  moves.forEach((move, index) => {
    const pairIndex = Math.floor(index / 2);
    if (!movePairs[pairIndex]) {
      movePairs[pairIndex] = { number: pairIndex + 1 };
    }
    if (move.player === 'blue') {
      movePairs[pairIndex].blue = move;
    } else {
      movePairs[pairIndex].red = move;
    }
  });

  const formatMove = (move: Move) => {
    const from = axialToNotation(move.from);
    const to = axialToNotation(move.to);
    let text = `${from}→${to}`;
    
    if (move.isRicochet) {
      text += ' ⟲';
    }
    if (move.captured) {
      text += ' ✕';
    }
    
    return text;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full">
      <div className="bg-muted px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm text-card-foreground flex items-center gap-2">
          <span>📜</span> История на ходовете
        </h3>
      </div>
      
      <ScrollArea className="h-[300px]">
        {moves.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Няма направени ходове
          </div>
        ) : (
          <div className="p-2">
            {movePairs.map((pair, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-muted/50"
              >
                <span className="text-muted-foreground w-6 text-right font-mono">
                  {pair.number}.
                </span>
                {pair.blue && (
                  <span className="flex-1 text-blue-600 dark:text-blue-400 font-medium">
                    {formatMove(pair.blue)}
                  </span>
                )}
                {pair.red && (
                  <span className="flex-1 text-red-600 dark:text-red-400 font-medium">
                    {formatMove(pair.red)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>⟲ = Рикошет</span>
          <span>✕ = Неутрализация</span>
        </div>
      </div>
    </div>
  );
};
