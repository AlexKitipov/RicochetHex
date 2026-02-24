// Zobrist Hashing for fast position hashing in transposition table

import type { Pawn, PlayerColor } from './hexUtils';

// Zobrist table structure
export const ZOBRIST = {
  table: new Map<string, number>(),
  player: {
    blue: random64(),
    red: random64(),
  },
  initialized: false,
};

// Generate a 64-bit-like random number (using 32-bit XOR for JS compatibility)
function random64(): number {
  const hi = Math.floor(Math.random() * 0xFFFFFFFF);
  const lo = Math.floor(Math.random() * 0xFFFFFFFF);
  return (hi ^ lo) >>> 0;
}

// Generate unique key for hex+color+state combination
function keyFor(hex: string, color: PlayerColor, state: Pawn['state']): string {
  return `${hex}_${color}_${state}`;
}

// Initialize Zobrist table with all possible combinations
export function initZobrist(allHexKeys: string[]): void {
  // Double-check to prevent re-initialization
  if (ZOBRIST.initialized || ZOBRIST.table.size > 0) return;
  
  const colors: PlayerColor[] = ['blue', 'red'];
  const states: Pawn['state'][] = ['active', 'neutralized'];
  
  for (const hex of allHexKeys) {
    for (const color of colors) {
      for (const state of states) {
        const k = keyFor(hex, color, state);
        ZOBRIST.table.set(k, random64());
      }
    }
  }
  
  ZOBRIST.initialized = true;
}

// Calculate hash of current position - O(n) where n is pawn count
export function zobristHash(
  pawns: Map<string, Pawn>,
  currentPlayer: PlayerColor
): number {
  let h = 0;
  
  pawns.forEach((pawn, hex) => {
    const k = keyFor(hex, pawn.color, pawn.state);
    const v = ZOBRIST.table.get(k);
    if (v !== undefined) {
      h ^= v;
    }
  });
  
  h ^= ZOBRIST.player[currentPlayer];
  
  return h >>> 0;
}
