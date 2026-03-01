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
  const rafIdRef = useRef<number | null>(null);
  const lastSizeRef = useRef<number>(BASE_HEX_SIZE);
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

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // Avoid reading layout metrics like clientWidth/clientHeight here.
      // contentRect is provided by ResizeObserver and doesn't force synchronous reflow.
      const { width: containerWidth, height: containerHeight } = entry.contentRect;

      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        // Calculate scale factor based on available space - no caps for full responsiveness
        const scaleX = containerWidth / baseDimensions.width;
        const scaleY = containerHeight / baseDimensions.height;
        const scale = Math.min(scaleX, scaleY);

        const newHexSize = BASE_HEX_SIZE * scale;

        // Guard against micro updates to reduce unnecessary renders during resize.
        if (Math.abs(newHexSize - lastSizeRef.current) > 0.1) {
          lastSizeRef.current = newHexSize;
          setHexSize(newHexSize);
        }
      });
    });
    resizeObserver.observe(container);

    // Initial measurement: ResizeObserver will fire at least once after observe().

    return () => {
      resizeObserver.disconnect();
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
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
        {/* Modern dark board */}
        <defs>
          <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(225, 22%, 14%)" />
            <stop offset="50%" stopColor="hsl(225, 20%, 11%)" />
            <stop offset="100%" stopColor="hsl(225, 25%, 9%)" />
          </linearGradient>

          {/* Subtle grid pattern */}
          <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="60" height="60">
            <rect width="60" height="60" fill="none" />
            <path d="M0 30 L60 30" stroke="hsl(225, 15%, 18%)" strokeWidth="0.3" opacity="0.5" />
            <path d="M30 0 L30 60" stroke="hsl(225, 15%, 18%)" strokeWidth="0.3" opacity="0.5" />
          </pattern>
          
          <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="hsl(0,0%,0%)" floodOpacity="0.5" />
          </filter>

          <filter id="selectedGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="hsl(45,95%,55%)" floodOpacity="0.5" />
          </filter>
          
          <filter id="pawnShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(0,0%,0%)" floodOpacity="0.6" />
          </filter>

          <linearGradient id="bluePawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(200, 80%, 70%)" />
            <stop offset="50%" stopColor="hsl(210, 85%, 55%)" />
            <stop offset="100%" stopColor="hsl(215, 90%, 38%)" />
          </linearGradient>

          <linearGradient id="redPawnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(350, 75%, 72%)" />
            <stop offset="50%" stopColor="hsl(355, 80%, 58%)" />
            <stop offset="100%" stopColor="hsl(0, 85%, 40%)" />
          </linearGradient>

          <linearGradient id="neutralizedBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(35, 70%, 55%)" />
            <stop offset="100%" stopColor="hsl(35, 60%, 40%)" />
          </linearGradient>

          <linearGradient id="neutralizedRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(150, 50%, 45%)" />
            <stop offset="100%" stopColor="hsl(150, 45%, 32%)" />
          </linearGradient>

          {/* Border gradient */}
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(175, 80%, 45%)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="hsl(35, 95%, 55%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(175, 80%, 45%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Board background */}
        <rect 
          x="0" 
          y="0" 
          width={boardWidth} 
          height={boardHeight} 
          rx="16"
          fill="url(#boardGradient)" 
          stroke="url(#borderGradient)"
          strokeWidth="2"
        />
        <rect 
          x="0" 
          y="0" 
          width={boardWidth} 
          height={boardHeight} 
          rx="16"
          fill="url(#gridPattern)" 
          opacity="0.5"
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

        {/* Pawns - use pawn id as key for animation tracking */}
        {Array.from(pawns.entries()).map(([key, pawn]) => {
          const coord = { 
            q: parseInt(key.split(',')[0]), 
            r: parseInt(key.split(',')[1]) 
          };
          const pixel = axialToPixel(coord.q, coord.r, hexSize);
          const centerX = pixel.x + offsetX;
          const centerY = pixel.y + offsetY;
          
          // Use color+number as stable key so animation tracks across positions
          const pawnId = `${pawn.color}-${pawn.number}`;
          
          return (
            <GamePawn
              key={pawnId}
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
