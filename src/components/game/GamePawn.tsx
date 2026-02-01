import React, { useEffect, useState, useRef } from 'react';
import { PlayerColor } from '@/lib/hexUtils';

interface GamePawnProps {
  centerX: number;
  centerY: number;
  size: number;
  color: PlayerColor;
  number: number;
  isNeutralized: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export const GamePawn: React.FC<GamePawnProps> = ({
  centerX,
  centerY,
  size,
  color,
  number,
  isNeutralized,
  isSelected,
  onClick
}) => {
  const [displayPos, setDisplayPos] = useState({ x: centerX, y: centerY });
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPosRef = useRef({ x: centerX, y: centerY });
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayPos({ x: centerX, y: centerY });
      prevPosRef.current = { x: centerX, y: centerY };
      return;
    }

    // Check if position actually changed (not just resize)
    const prevPos = prevPosRef.current;
    const dx = Math.abs(centerX - prevPos.x);
    const dy = Math.abs(centerY - prevPos.y);
    
    // Only animate if the move is significant (actual move, not just resize scaling)
    // We detect a move vs resize by checking if the ratio of movement to size changed
    const significantMove = dx > size * 0.5 || dy > size * 0.5;

    if (significantMove) {
      setIsAnimating(true);
      // Small delay to ensure CSS transition kicks in
      requestAnimationFrame(() => {
        setDisplayPos({ x: centerX, y: centerY });
      });
      
      // Reset animation state after transition completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 350);
      
      prevPosRef.current = { x: centerX, y: centerY };
      return () => clearTimeout(timer);
    } else {
      // Just update position without animation (resize case)
      setDisplayPos({ x: centerX, y: centerY });
      prevPosRef.current = { x: centerX, y: centerY };
    }
  }, [centerX, centerY, size]);

  const radius = size / 1.15;
  
  let gradientId = color === 'blue' ? 'bluePawnGradient' : 'redPawnGradient';
  if (isNeutralized) {
    gradientId = color === 'blue' ? 'neutralizedBlueGradient' : 'neutralizedRedGradient';
  }

  const textColor = color === 'blue' && !isNeutralized ? 'white' : 'black';

  return (
    <g 
      filter="url(#pawnShadow)" 
      className="cursor-pointer"
      onClick={onClick}
      style={{
        transform: `translate(${displayPos.x}px, ${displayPos.y}px)`,
        transition: isAnimating ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      }}
    >
      {/* Main pawn circle */}
      <circle
        cx={0}
        cy={0}
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
        cx={-radius * 0.25}
        cy={-radius * 0.25}
        rx={radius * 0.35}
        ry={radius * 0.25}
        className="fill-white/30 pointer-events-none"
      />
      
      {/* Pawn number */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={size * 0.45}
        fontWeight="bold"
        className="pointer-events-none select-none"
      >
        {number}
      </text>
      
      {/* Neutralized X mark */}
      {isNeutralized && (
        <>
          <line
            x1={-radius * 0.4}
            y1={-radius * 0.4}
            x2={radius * 0.4}
            y2={radius * 0.4}
            className="stroke-[hsl(var(--primary)/0.6)]"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1={radius * 0.4}
            y1={-radius * 0.4}
            x2={-radius * 0.4}
            y2={radius * 0.4}
            className="stroke-[hsl(var(--primary)/0.6)]"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      
      {/* Bounce animation on move */}
      {isAnimating && (
        <circle
          cx={0}
          cy={0}
          r={radius * 1.3}
          fill="none"
          stroke={color === 'blue' ? 'hsl(var(--pawn-blue))' : 'hsl(var(--pawn-red))'}
          strokeWidth="2"
          opacity="0.5"
          className="animate-ping"
          style={{ animationDuration: '0.5s', animationIterationCount: '1' }}
        />
      )}
    </g>
  );
};
