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
  
  // Use inline fill colors matching our dark theme tokens
  const fillColor = hexColor === 'light' 
    ? 'hsl(225, 15%, 22%)' 
    : 'hsl(225, 20%, 15%)';
  
  let strokeColor = 'hsl(225, 15%, 28%)';
  let strokeWidth = 0.8;
  let glowFilter = '';
  
  if (isSelected) {
    strokeColor = 'hsl(45, 95%, 55%)';
    strokeWidth = 2.5;
    glowFilter = 'url(#selectedGlow)';
  } else if (isRicochet) {
    strokeColor = 'hsl(280, 75%, 60%)';
    strokeWidth = 2;
  } else if (isPossibleMove) {
    strokeColor = 'hsl(150, 70%, 45%)';
    strokeWidth = 1.5;
  }

  return (
    <g 
      className="cursor-pointer"
      onClick={onClick}
      style={{ transition: 'opacity 0.15s' }}
    >
      <polygon
        points={points}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        filter={glowFilter || 'url(#hexShadow)'}
      />
      
      {/* Move indicator */}
      {isPossibleMove && !isRicochet && (
        <circle
          cx={centerX}
          cy={centerY}
          r={size / 4}
          fill="hsl(150, 70%, 45%)"
          opacity={0.5}
        />
      )}
      
      {/* Ricochet indicator */}
      {isRicochet && (
        <circle
          cx={centerX}
          cy={centerY}
          r={size / 4}
          fill="hsl(280, 75%, 60%)"
          opacity={0.6}
        />
      )}
      
      {/* Hex label */}
      <text
        x={centerX}
        y={centerY + size * 0.35}
        textAnchor="middle"
        fill="hsl(225, 10%, 40%)"
        fontSize="5"
        fontWeight="500"
        className="pointer-events-none select-none"
      >
        {axialToNotation(coord)}
      </text>
    </g>
  );
};
