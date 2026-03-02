import React from 'react';
import { Move, axialToNotation } from '@/lib/hexUtils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MoveHistoryProps {
  moves: Move[];
  currentIndex: number;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves, currentIndex }) => {
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
    if (move.isRicochet) text += ' ⟲';
    if (move.neutralized) text += ' ⊘';
    if (move.recovered) text += ' ↺';
    if (move.captured) text += ' ✕';
    return text;
  };

  return (
    <div className="glass rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border/50">
        <h3 className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          History
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        {moves.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-xs">
            No moves yet
          </div>
        ) : (
          <div className="p-1.5">
            {movePairs.map((pair, index) => (
              <div 
                key={index}
                className="flex items-center gap-1.5 py-1 px-2 rounded-md text-xs hover:bg-secondary/50 transition-colors"
              >
                <span className="text-muted-foreground w-5 text-right font-mono text-[10px]">
                  {pair.number}.
                </span>
                {pair.blue && (
                  <span className="flex-1 text-glow-blue font-medium text-[11px]">
                    {formatMove(pair.blue)}
                  </span>
                )}
                {pair.red && (
                  <span className="flex-1 text-glow-red font-medium text-[11px]">
                    {formatMove(pair.red)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="px-3 py-1.5 border-t border-border/50 text-[9px] text-muted-foreground">
        <div className="flex gap-2 flex-wrap">
          <span>⟲ Ricochet</span>
          <span>⊘ Neutr.</span>
          <span>↺ Recov.</span>
          <span>✕ Capt.</span>
        </div>
      </div>
    </div>
  );
};
