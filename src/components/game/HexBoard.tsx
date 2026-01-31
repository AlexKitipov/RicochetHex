import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { HexCoord, Pawn, hexKey, axialToPixel, getHexCorners, generateHexGrid, getHexColor, SIDE_LENGTH } from '@/lib/hexUtils';
import { HexCell } from './HexCell';
import { GamePawn } from './GamePawn';

interface HexBoardProps {
  pawns: Map<string, Pawn>;
  selectedHex: HexCoord | null;
  possibleMoves: HexCoord[];
  ricochetPath: HexCoord[];
  onHexClick: (hex: HexCoord) => void;
}

const BASE_HEX_SIZE = 28;
const BOARD_PADDING = 40;

export const HexBoard: React.FC<HexBoardProps> = ({
  pawns,
  selectedHex,
  possibleMoves,
  ricochetPath,
  onHexClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hexSize, setHexSize] = useState(BASE_HEX_SIZE);
  const hexGrid = useMemo(() => generateHexGrid(SIDE_LENGTH), []);

  // Calculate base board dimensions (used to determine scale)
  const baseDimensions = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    hexGrid.forEach(coord => {
      const pixel = axialToPixel(coord.q, coord.r, BASE_HEX_SIZE);
      minX = Math.min(minX, pixel.x - BASE_HEX_SIZE);
      maxX = Math.max(maxX, pixel.x + BASE_HEX_SIZE);
      minY = Math.min(minY, pixel.y - BASE_HEX_SIZE);
      maxY = Math.max(maxY, pixel.y + BASE_HEX_SIZE);
    });

    return {
      width: maxX - minX + BOARD_PADDING * 2,
      height: maxY - minY + BOARD_PADDING * 2
    };
  }, [hexGrid]);

  // Resize observer to adapt hex size to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate scale factor based on available space
      const scaleX = containerWidth / baseDimensions.width;
      const scaleY = containerHeight / baseDimensions.height;
      const scale = Math.min(scaleX, scaleY, 1.5); // Cap at 1.5x to prevent too large
      
      const newHexSize = Math.max(16, Math.floor(BASE_HEX_SIZE * scale)); // Min size 16
      setHexSize(newHexSize);
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    updateSize();

    return () => resizeObserver.disconnect();
  }, [baseDimensions]);

  // Calculate board dimensions based on current hex size
  const { boardWidth, boardHeight, offsetX, offsetY } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    hexGrid.forEach(coord => {
      const pixel = axialToPixel(coord.q, coord.r, hexSize);
      minX = Math.min(minX, pixel.x - hexSize);
      maxX = Math.max(maxX, pixel.x + hexSize);
      minY = Math.min(minY, pixel.y - hexSize);
      maxY = Math.max(maxY, pixel.y + hexSize);
    });

    return {
      boardWidth: maxX - minX + BOARD_PADDING * 2,
      boardHeight: maxY - minY + BOARD_PADDING * 2,
      offsetX: -minX + BOARD_PADDING,
      offsetY: -minY + BOARD_PADDING
    };
  }, [hexGrid, hexSize]);

  const isSelected = useCallback((coord: HexCoord) => {
    return selectedHex?.q === coord.q && selectedHex?.r === coord.r;
  }, [selectedHex]);

  const isPossibleMove = useCallback((coord: HexCoord) => {
    return possibleMoves.some(m => m.q === coord.q && m.r === coord.r);
  }, [possibleMoves]);

  const isRicochet = useCallback((coord: HexCoord) => {
    return ricochetPath.some(r => r.q === coord.q && r.r === coord.r);
  }, [ricochetPath]);

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full min-h-[240px] max-w-full max-h-full overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full drop-shadow-2xl"
      >
        {/* Wood texture background */}
        <defs>
          <pattern id="woodPattern" patternUnits="userSpaceOnUse" width="100" height="100">
            <rect width="100" height="100" fill="hsl(var(--board-light))" />
            <path d="M0 20 Q25 18 50 20 T100 20" stroke="hsl(var(--board-grain))" strokeWidth="0.5" fill="none" opacity="0.3" />
            <path d="M0 40 Q30 42 60 40 T100 40" stroke="hsl(var(--board-grain))" strokeWidth="0.3" fill="none" opacity="0.2" />
            <path d="M0 60 Q20 58 40 60 T100 60" stroke="hsl(var(--board-grain))" strokeWidth="0.4" fill="none" opacity="0.25" />
            <path d="M0 80 Q35 82 70 80 T100 80" stroke="hsl(var(--board-grain))" strokeWidth="0.3" fill="none" opacity="0.2" />
          </pattern>
          
          <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
          
          <filter id="pawnShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.4" />
          </filter>

          <linearGradient id="bluePawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--pawn-blue-light))" />
            <stop offset="50%" stopColor="hsl(var(--pawn-blue))" />
            <stop offset="100%" stopColor="hsl(var(--pawn-blue-dark))" />
          </linearGradient>

          <linearGradient id="redPawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--pawn-red-light))" />
            <stop offset="50%" stopColor="hsl(var(--pawn-red))" />
            <stop offset="100%" stopColor="hsl(var(--pawn-red-dark))" />
          </linearGradient>

          <linearGradient id="neutralizedBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(50, 90%, 60%)" />
            <stop offset="100%" stopColor="hsl(45, 85%, 45%)" />
          </linearGradient>

          <linearGradient id="neutralizedRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(140, 60%, 50%)" />
            <stop offset="100%" stopColor="hsl(140, 55%, 35%)" />
          </linearGradient>
        </defs>

        {/* Board background */}
        <rect 
          x="0" 
          y="0" 
          width={boardWidth} 
          height={boardHeight} 
          rx="12"
          fill="url(#woodPattern)" 
          className="stroke-[hsl(var(--primary))]"
          strokeWidth="4"
        />

        {/* Hex cells */}
        {hexGrid.map(coord => {
          const pixel = axialToPixel(coord.q, coord.r, hexSize);
          const centerX = pixel.x + offsetX;
          const centerY = pixel.y + offsetY;
          
          return (
            <HexCell
              key={hexKey(coord)}
              coord={coord}
              centerX={centerX}
              centerY={centerY}
              size={hexSize}
              hexColor={getHexColor(coord.q, coord.r)}
              isSelected={isSelected(coord)}
              isPossibleMove={isPossibleMove(coord)}
              isRicochet={isRicochet(coord)}
              onClick={() => onHexClick(coord)}
            />
          );
        })}

        {/* Pawns */}
        {Array.from(pawns.entries()).map(([key, pawn]) => {
          const coord = { 
            q: parseInt(key.split(',')[0]), 
            r: parseInt(key.split(',')[1]) 
          };
          const pixel = axialToPixel(coord.q, coord.r, hexSize);
          const centerX = pixel.x + offsetX;
          const centerY = pixel.y + offsetY;
          
          return (
            <GamePawn
              key={key}
              centerX={centerX}
              centerY={centerY}
              size={hexSize}
              color={pawn.color}
              number={pawn.number}
              isNeutralized={pawn.state === 'neutralized'}
              isSelected={isSelected(coord)}
              onClick={() => onHexClick(coord)}
            />
          );
        })}
      </svg>
    </div>
  );
};
