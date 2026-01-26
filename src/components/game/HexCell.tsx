import React from 'react';
import { HexCoord, getHexCorners, axialToNotation } from '@/lib/hexUtils';

interface HexCellProps {
  coord: HexCoord;
  centerX: number;
  centerY: number;
  size: number;
  hexColor: 'light' | 'dark';
  isSelected: boolean;
  isPossibleMove: boolean;
  isRicochet: boolean;
  onClick: () => void;
}

export const HexCell: React.FC<HexCellProps> = ({
  coord,
  centerX,
  centerY,
  size,
  hexColor,
  isSelected,
  isPossibleMove,
  isRicochet,
  onClick
}) => {
  const points = getHexCorners(centerX, centerY, size);
  
  let fillClass = hexColor === 'light' 
    ? 'fill-[hsl(var(--hex-light))]' 
    : 'fill-[hsl(var(--hex-dark))]';
  
  let strokeClass = 'stroke-amber-800/30';
  let strokeWidth = 1;
  
  if (isSelected) {
    strokeClass = 'stroke-[hsl(var(--hex-selected))]';
    strokeWidth = 3;
  } else if (isRicochet) {
    strokeClass = 'stroke-[hsl(var(--hex-ricochet))]';
    strokeWidth = 2.5;
  } else if (isPossibleMove) {
    strokeClass = 'stroke-[hsl(var(--hex-possible))]';
    strokeWidth = 2;
  }

  return (
    <g 
      className="cursor-pointer transition-all duration-150 hover:brightness-110"
      onClick={onClick}
    >
      <polygon
        points={points}
        className={`${fillClass} ${strokeClass}`}
        strokeWidth={strokeWidth}
        filter="url(#hexShadow)"
      />
      
      {/* Move indicator dot */}
      {isPossibleMove && !isRicochet && (
        <circle
          cx={centerX}
          cy={centerY}
          r={size / 4}
          className="fill-[hsl(var(--hex-possible))] opacity-60"
        />
      )}
      
      {/* Ricochet indicator */}
      {isRicochet && (
        <circle
          cx={centerX}
          cy={centerY}
          r={size / 4}
          className="fill-[hsl(var(--hex-ricochet))] opacity-70"
        />
      )}
      
      {/* Hex notation label */}
      <text
        x={centerX}
        y={centerY + size * 0.35}
        textAnchor="middle"
        className="fill-amber-900/40 text-[6px] font-medium pointer-events-none select-none"
      >
        {axialToNotation(coord)}
      </text>
    </g>
  );
};
