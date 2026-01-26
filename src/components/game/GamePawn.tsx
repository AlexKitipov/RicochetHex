import React from 'react';
import { PlayerColor } from '@/lib/hexUtils';

interface GamePawnProps {
  centerX: number;
  centerY: number;
  size: number;
  color: PlayerColor;
  isNeutralized: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export const GamePawn: React.FC<GamePawnProps> = ({
  centerX,
  centerY,
  size,
  color,
  isNeutralized,
  isSelected,
  onClick
}) => {
  const radius = size / 2.8;
  
  let gradientId = color === 'blue' ? 'bluePawnGradient' : 'redPawnGradient';
  if (isNeutralized) {
    gradientId = color === 'blue' ? 'neutralizedBlueGradient' : 'neutralizedRedGradient';
  }

  return (
    <g 
      filter="url(#pawnShadow)" 
      className="cursor-pointer"
      onClick={onClick}
    >
      {/* Main pawn circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill={`url(#${gradientId})`}
        className={`
          transition-all duration-200
          ${isSelected ? 'stroke-[hsl(var(--hex-selected))]' : 'stroke-[hsl(var(--primary)/0.5)]'}
        `}
        strokeWidth={isSelected ? 3 : 1.5}
      />
      
      {/* Highlight effect */}
      <ellipse
        cx={centerX - radius * 0.25}
        cy={centerY - radius * 0.25}
        rx={radius * 0.35}
        ry={radius * 0.25}
        className="fill-white/30 pointer-events-none"
      />
      
      {/* Inner detail circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.5}
        className="fill-none stroke-white/20"
        strokeWidth="1"
      />
      
      {/* Neutralized X mark */}
      {isNeutralized && (
        <>
          <line
            x1={centerX - radius * 0.4}
            y1={centerY - radius * 0.4}
            x2={centerX + radius * 0.4}
            y2={centerY + radius * 0.4}
            className="stroke-[hsl(var(--primary)/0.6)]"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={centerX + radius * 0.4}
            y1={centerY - radius * 0.4}
            x2={centerX - radius * 0.4}
            y2={centerY + radius * 0.4}
            className="stroke-[hsl(var(--primary)/0.6)]"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
};
