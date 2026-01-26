// Hexagonal grid utilities for flat-topped hexagons using axial coordinates

export const SIDE_LENGTH = 8;

export const HEX_DIRECTIONS: [number, number][] = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1]
];

export type HexCoord = { q: number; r: number };
export type PlayerColor = 'blue' | 'red';
export type PawnState = 'active' | 'neutralized';

export interface Pawn {
  color: PlayerColor;
  state: PawnState;
}

export interface Move {
  from: HexCoord;
  to: HexCoord;
  player: PlayerColor;
  isRicochet: boolean;
  captured?: HexCoord;
  moveNumber: number;
}

export interface GameState {
  pawns: Map<string, Pawn>;
  currentPlayer: PlayerColor;
  selectedHex: HexCoord | null;
  possibleMoves: HexCoord[];
  ricochetPath: HexCoord[];
  moveHistory: Move[];
  historyIndex: number;
  gameOver: boolean;
  winner: PlayerColor | null;
}

// Convert hex coord to string key for Map
export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

// Parse string key back to HexCoord
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

// Convert axial (q, r) coordinates to pixel (x, y) for flat-topped hexagons
export function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = -size * 1.5 * r; // Invert y to match logical 'top' with visual 'top'
  return { x, y };
}

// Convert pixel to axial coordinates
export function pixelToAxial(x: number, y: number, size: number): HexCoord {
  const yInverted = -y;
  const qF = (x * Math.sqrt(3) / 3 - yInverted / 3) / size;
  const rF = (yInverted * 2 / 3) / size;
  
  // Convert to cube coordinates for rounding
  let xCube = qF;
  let zCube = rF;
  let yCube = -xCube - zCube;
  
  let rx = Math.round(xCube);
  let ry = Math.round(yCube);
  let rz = Math.round(zCube);
  
  const xDiff = Math.abs(rx - xCube);
  const yDiff = Math.abs(ry - yCube);
  const zDiff = Math.abs(rz - zCube);
  
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  
  return { q: rx, r: rz };
}

// Convert axial coordinates to game notation (e.g., 'H8')
export function axialToNotation(coord: HexCoord): string {
  const columnIndex = coord.q + (SIDE_LENGTH - 1);
  const columnLetter = String.fromCharCode('A'.charCodeAt(0) + columnIndex);
  const rowNumber = coord.r + SIDE_LENGTH;
  return `${columnLetter}${rowNumber}`;
}

// Generate all hex coordinates for the board
export function generateHexGrid(sideLength: number): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -(sideLength - 1); q < sideLength; q++) {
    const r1 = Math.max(-(sideLength - 1), -q - (sideLength - 1));
    const r2 = Math.min(sideLength - 1, -q + (sideLength - 1));
    for (let r = r1; r <= r2; r++) {
      coords.push({ q, r });
    }
  }
  return coords;
}

// Check if a hex coordinate is valid on the board
export function isValidHex(coord: HexCoord, sideLength: number = SIDE_LENGTH): boolean {
  const maxCoord = sideLength - 1;
  const s = -coord.q - coord.r;
  return Math.abs(coord.q) <= maxCoord && 
         Math.abs(coord.r) <= maxCoord && 
         Math.abs(s) <= maxCoord;
}

// Get hex corner position for drawing
export function hexCorner(centerX: number, centerY: number, size: number, i: number): { x: number; y: number } {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: centerX + size * Math.cos(angleRad),
    y: centerY + size * Math.sin(angleRad)
  };
}

// Get all 6 corners of a hexagon
export function getHexCorners(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const corner = hexCorner(centerX, centerY, size, i);
    points.push(`${corner.x},${corner.y}`);
  }
  return points.join(' ');
}

// Calculate wall ricochet direction
export function calculateRicochetDirection(
  entryDirection: [number, number], 
  wallAxis: 'q' | 'r' | 's'
): [number, number] {
  const [dqIn, drIn] = entryDirection;
  let dqOut: number, drOut: number;
  
  if (wallAxis === 'q') {
    dqOut = -dqIn;
    drOut = drIn + dqIn;
  } else if (wallAxis === 'r') {
    dqOut = dqIn + drIn;
    drOut = -drIn;
  } else { // s = -q-r
    dqOut = -drIn;
    drOut = -dqIn;
  }
  
  return [dqOut, drOut];
}

// Determine which wall axis was hit
export function getWallAxis(
  currentHex: HexCoord, 
  direction: [number, number], 
  maxCoord: number
): 'q' | 'r' | 's' {
  const [dq, dr] = direction;
  const nextQ = currentHex.q + dq;
  const nextR = currentHex.r + dr;
  const nextS = -nextQ - nextR;
  
  if (Math.abs(nextQ) > maxCoord) return 'q';
  if (Math.abs(nextR) > maxCoord) return 'r';
  if (Math.abs(nextS) > maxCoord) return 's';
  
  // Fallback based on dominant direction component
  if (Math.abs(dq) > Math.abs(dr)) return 'q';
  if (Math.abs(dr) > Math.abs(dq)) return 'r';
  return 's';
}

// Get straight line path from a hex in a direction
export function getStraightLinePath(
  startHex: HexCoord,
  direction: [number, number],
  pawns: Map<string, Pawn>,
  sideLength: number = SIDE_LENGTH
): {
  path: HexCoord[];
  obstacleType: 'board_edge' | 'pawn' | null;
  obstacleLocation: HexCoord | null;
  wallAxis: 'q' | 'r' | 's' | null;
} {
  const path: HexCoord[] = [];
  let currentHex = startHex;
  const [dq, dr] = direction;
  const maxCoord = sideLength - 1;
  
  while (true) {
    const nextHex: HexCoord = { 
      q: currentHex.q + dq, 
      r: currentHex.r + dr 
    };
    
    // Check if off board
    if (!isValidHex(nextHex, sideLength)) {
      return {
        path,
        obstacleType: 'board_edge',
        obstacleLocation: currentHex,
        wallAxis: getWallAxis(currentHex, direction, maxCoord)
      };
    }
    
    // Check if occupied by pawn
    if (pawns.has(hexKey(nextHex))) {
      return {
        path,
        obstacleType: 'pawn',
        obstacleLocation: nextHex,
        wallAxis: null
      };
    }
    
    // Valid empty hex
    path.push(nextHex);
    currentHex = nextHex;
  }
}

// Get all possible moves for a pawn including ricochets
export function getPossibleMoves(
  startHex: HexCoord,
  pawns: Map<string, Pawn>,
  sideLength: number = SIDE_LENGTH
): { moves: HexCoord[]; ricochetPath: HexCoord[] } {
  const pawn = pawns.get(hexKey(startHex));
  if (!pawn || pawn.state === 'neutralized') {
    return { moves: [], ricochetPath: [] };
  }
  
  const allMoves: HexCoord[] = [];
  const ricochetPath: HexCoord[] = [];
  
  for (const direction of HEX_DIRECTIONS) {
    const { path, obstacleType, obstacleLocation, wallAxis } = 
      getStraightLinePath(startHex, direction, pawns, sideLength);
    
    allMoves.push(...path);
    
    // Handle wall ricochet
    if (obstacleType === 'board_edge' && wallAxis && obstacleLocation) {
      // Add the edge hex as a valid move
      if (!allMoves.some(m => m.q === obstacleLocation.q && m.r === obstacleLocation.r)) {
        allMoves.push(obstacleLocation);
      }
      ricochetPath.push(obstacleLocation);
      
      const ricochetDir = calculateRicochetDirection(direction, wallAxis);
      const ricochetResult = getStraightLinePath(
        obstacleLocation, 
        ricochetDir, 
        pawns, 
        sideLength
      );
      
      allMoves.push(...ricochetResult.path);
      ricochetPath.push(...ricochetResult.path);
    }
  }
  
  return { moves: allMoves, ricochetPath };
}

// Check if a move is a ricochet move
export function isRicochetMove(
  from: HexCoord,
  to: HexCoord,
  ricochetPath: HexCoord[]
): boolean {
  return ricochetPath.some(h => h.q === to.q && h.r === to.r);
}

// Get opponent color
export function getOpponentColor(color: PlayerColor): PlayerColor {
  return color === 'blue' ? 'red' : 'blue';
}

// Check for neutralization after a move
export function checkNeutralization(
  movedToHex: HexCoord,
  playerColor: PlayerColor,
  pawns: Map<string, Pawn>
): HexCoord | null {
  const opponentColor = getOpponentColor(playerColor);
  
  for (const [dq, dr] of HEX_DIRECTIONS) {
    const neighborHex: HexCoord = { 
      q: movedToHex.q + dq, 
      r: movedToHex.r + dr 
    };
    const neighborPawn = pawns.get(hexKey(neighborHex));
    
    if (neighborPawn && neighborPawn.color === opponentColor && neighborPawn.state === 'active') {
      // Check for ally on the other side
      const allyHex: HexCoord = { 
        q: neighborHex.q + dq, 
        r: neighborHex.r + dr 
      };
      const allyPawn = pawns.get(hexKey(allyHex));
      
      if (allyPawn && allyPawn.color === playerColor && allyPawn.state === 'active') {
        return neighborHex; // This pawn should be neutralized
      }
    }
  }
  
  return null;
}

// Check win condition (3+ active pawns on opponent's back rank)
export function checkWinCondition(
  pawns: Map<string, Pawn>,
  sideLength: number = SIDE_LENGTH
): PlayerColor | null {
  const blueWinRank = -(sideLength - 1); // Blue wins on red's back rank (bottom)
  const redWinRank = sideLength - 1; // Red wins on blue's back rank (top)
  
  let blueOnRedRank = 0;
  let redOnBlueRank = 0;
  
  pawns.forEach((pawn, key) => {
    if (pawn.state !== 'active') return;
    
    const coord = parseHexKey(key);
    
    if (pawn.color === 'blue' && coord.r === blueWinRank) {
      blueOnRedRank++;
    } else if (pawn.color === 'red' && coord.r === redWinRank) {
      redOnBlueRank++;
    }
  });
  
  if (blueOnRedRank >= 3) return 'blue';
  if (redOnBlueRank >= 3) return 'red';
  return null;
}

// Create initial pawns setup
export function createInitialPawns(sideLength: number = SIDE_LENGTH): Map<string, Pawn> {
  const pawns = new Map<string, Pawn>();
  const hexGrid = generateHexGrid(sideLength);
  
  // Blue pawns in top three rows (r = 7, 6, 5 for sideLength=8)
  for (let rVal = sideLength - 1; rVal >= sideLength - 3; rVal--) {
    hexGrid.forEach(coord => {
      if (coord.r === rVal) {
        pawns.set(hexKey(coord), { color: 'blue', state: 'active' });
      }
    });
  }
  
  // Red pawns in bottom three rows (r = -7, -6, -5 for sideLength=8)
  for (let rVal = -(sideLength - 1); rVal <= -(sideLength - 3); rVal++) {
    hexGrid.forEach(coord => {
      if (coord.r === rVal) {
        pawns.set(hexKey(coord), { color: 'red', state: 'active' });
      }
    });
  }
  
  return pawns;
}

// Get hex color for checkerboard pattern
export function getHexColor(q: number, r: number): 'light' | 'dark' {
  // Use a pattern based on (q + r) % 3 for hex grid coloring
  const sum = q + r;
  return ((sum % 3) + 3) % 3 === 0 ? 'light' : 'dark';
}
