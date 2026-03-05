// AI Engine for RicochetHex game

import {
  HexCoord,
  Pawn,
  PlayerColor,
  hexKey,
  parseHexKey,
  getPossibleMoves,
  checkSandwichEffects,
  checkCapture,
  getOpponentColor,
  SIDE_LENGTH,
  generateHexGrid
} from './hexUtils';
import { initZobrist, zobristHash, ZOBRIST } from './zobrist';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIMove {
  from: HexCoord;
  to: HexCoord;
  score?: number;
}

// Transposition table for caching evaluated positions
const transpositionTable = new Map<string, { score: number; depth: number }>();

// Initialize Zobrist hashing on first use (checks ZOBRIST.initialized internally)
function ensureZobristInitialized(): void {
  if (ZOBRIST.initialized) return;
  const allHexes = generateHexGrid(SIDE_LENGTH).map(c => hexKey(c));
  initZobrist(allHexes);
}

// Deep clone pawns map to avoid mutation issues in minimax
function clonePawns(pawns: Map<string, Pawn>): Map<string, Pawn> {
  const newMap = new Map<string, Pawn>();
  pawns.forEach((pawn, key) => {
    newMap.set(key, { ...pawn });
  });
  return newMap;
}

// Create a hash of the current position using Zobrist hashing (O(1) lookup)
function hashPosition(pawns: Map<string, Pawn>, currentPlayer: PlayerColor): string {
  ensureZobristInitialized();
  return String(zobristHash(pawns, currentPlayer));
}

// Get all valid moves for a player
export function getAllValidMoves(
  pawns: Map<string, Pawn>,
  player: PlayerColor
): AIMove[] {
  const moves: AIMove[] = [];
  
  pawns.forEach((pawn, key) => {
    if (pawn.color !== player || pawn.state !== 'active') return;
    
    const from = parseHexKey(key);
    const { moves: possibleMoves } = getPossibleMoves(from, pawns);
    
    for (const to of possibleMoves) {
      moves.push({ from, to });
    }
  });
  
  return moves;
}

// Simulate a move and return the resulting pawn state (with deep clone)
function simulateMove(
  from: HexCoord,
  to: HexCoord,
  pawns: Map<string, Pawn>,
  player: PlayerColor
): {
  newPawns: Map<string, Pawn>;
  neutralized: HexCoord[];
  recovered: HexCoord[];
  captured: HexCoord[];
} {
  // Deep clone to avoid mutation issues
  const newPawns = clonePawns(pawns);
  const pawn = newPawns.get(hexKey(from));
  
  if (!pawn) {
    return { newPawns, neutralized: [], recovered: [], captured: [] };
  }
  
  // Move the pawn (create new object to avoid mutation)
  newPawns.delete(hexKey(from));
  newPawns.set(hexKey(to), { ...pawn });
  
  // Check effects
  const { neutralized, recovered } = checkSandwichEffects(to, player, newPawns);
  
  // Apply neutralizations
  for (const hex of neutralized) {
    const neutralizedPawn = newPawns.get(hexKey(hex));
    if (neutralizedPawn) {
      newPawns.set(hexKey(hex), { ...neutralizedPawn, state: 'neutralized' });
    }
  }
  
  // Apply recoveries
  for (const hex of recovered) {
    const recoveredPawn = newPawns.get(hexKey(hex));
    if (recoveredPawn) {
      newPawns.set(hexKey(hex), { ...recoveredPawn, state: 'active' });
    }
  }
  
  // Check for captures
  const captured = checkCapture(to, player, newPawns);
  
  // Remove captured pawns
  for (const hex of captured) {
    newPawns.delete(hexKey(hex));
  }
  
  return { newPawns, neutralized, recovered, captured };
}

// Evaluate a board position for a player
export function evaluatePosition(
  pawns: Map<string, Pawn>,
  player: PlayerColor
): number {
  let score = 0;
  const opponent = getOpponentColor(player);
  
  // Target ranks (win conditions)
  const playerTargetRank = player === 'blue' ? -(SIDE_LENGTH - 1) : (SIDE_LENGTH - 1);
  
  let playerActivePawns = 0;
  let opponentActivePawns = 0;
  let playerOnTargetRank = 0;
  
  pawns.forEach((pawn, key) => {
    const coord = parseHexKey(key);
    
    if (pawn.color === player) {
      if (pawn.state === 'active') {
        playerActivePawns++;
        
        // Bonus for being on target rank
        if (coord.r === playerTargetRank) {
          score += 100;
          playerOnTargetRank++;
        } else {
          // Bonus for advancing toward target
          const distanceToTarget = player === 'blue' 
            ? coord.r - playerTargetRank 
            : playerTargetRank - coord.r;
          score += (14 - distanceToTarget) * 3; // More points for being closer
        }
      } else {
        // Penalty for neutralized pawns
        score -= 15;
      }
    } else {
      if (pawn.state === 'active') {
        opponentActivePawns++;
        
        // Penalty if opponent is close to winning
        const opponentTargetRank = opponent === 'blue' ? -(SIDE_LENGTH - 1) : (SIDE_LENGTH - 1);
        if (coord.r === opponentTargetRank) {
          score -= 100;
        }
      }
    }
  });
  
  // Bonus for having more active pawns
  score += (playerActivePawns - opponentActivePawns) * 10;
  
  // Big bonus for being close to winning
  if (playerOnTargetRank >= 2) {
    score += 50;
  }
  
  return score;
}

// Evaluate a specific move
export function evaluateMove(
  from: HexCoord,
  to: HexCoord,
  pawns: Map<string, Pawn>,
  player: PlayerColor
): number {
  let score = 0;
  
  // Simulate the move
  const { newPawns, neutralized, recovered, captured } = simulateMove(from, to, pawns, player);
  
  // Target rank for this player
  const targetRank = player === 'blue' ? -(SIDE_LENGTH - 1) : (SIDE_LENGTH - 1);
  
  // +50 points for reaching the back rank
  if (to.r === targetRank) {
    score += 50;
  }
  
  // +30 points for moving forward (toward target)
  const forwardProgress = player === 'blue' 
    ? from.r - to.r  // Blue moves to lower r
    : to.r - from.r; // Red moves to higher r
  
  if (forwardProgress > 0) {
    score += forwardProgress * 10;
  }
  
  // +60 points for each capture
  score += captured.length * 60;
  
  // +40 points for each neutralization
  score += neutralized.length * 40;
  
  // +25 points for each recovery
  score += recovered.length * 25;
  
  // Check if this move puts the pawn in danger of being neutralized
  const dangerPenalty = checkIfInDanger(to, player, newPawns);
  score -= dangerPenalty;
  
  // Evaluate resulting position with reduced weight to avoid dominating immediate gains
  const positionScore = evaluatePosition(newPawns, player);
  score += positionScore * 0.03;
  
  return score;
}

// Check if a position is in danger of being neutralized
function checkIfInDanger(
  hex: HexCoord,
  player: PlayerColor,
  pawns: Map<string, Pawn>
): number {
  const opponent = getOpponentColor(player);
  const HEX_DIRECTIONS: [number, number][] = [
    [1, 0], [1, -1], [0, -1],
    [-1, 0], [-1, 1], [0, 1]
  ];
  
  let danger = 0;
  
  for (const [dq, dr] of HEX_DIRECTIONS) {
    const neighbor1: HexCoord = { q: hex.q + dq, r: hex.r + dr };
    const neighbor2: HexCoord = { q: hex.q - dq, r: hex.r - dr };
    
    const pawn1 = pawns.get(hexKey(neighbor1));
    const pawn2 = pawns.get(hexKey(neighbor2));
    
    // Check if there's an opponent pawn that could sandwich this pawn
    if (pawn1?.color === opponent && pawn1.state === 'active') {
      // Check if there's an empty space on the other side where opponent could move
      if (!pawn2) {
        danger += 10;
      }
    }
    
    if (pawn2?.color === opponent && pawn2.state === 'active') {
      if (!pawn1) {
        danger += 10;
      }
    }
  }
  
  return danger;
}

// Get a random valid move (Easy difficulty)
export function getRandomMove(
  pawns: Map<string, Pawn>,
  player: PlayerColor
): AIMove | null {
  const allMoves = getAllValidMoves(pawns, player);
  
  if (allMoves.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * allMoves.length);
  return allMoves[randomIndex];
}

// Get the best move (Medium difficulty)
export function getBestMove(
  pawns: Map<string, Pawn>,
  player: PlayerColor
): AIMove | null {
  const allMoves = getAllValidMoves(pawns, player);
  
  if (allMoves.length === 0) return null;
  
  let bestMove = allMoves[0];
  let bestScore = -Infinity;
  
  for (const move of allMoves) {
    const score = evaluateMove(move.from, move.to, pawns, player);
    move.score = score;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  // Add some randomness to avoid predictability (pick from top 3 moves)
  const sortedMoves = allMoves
    .filter(m => m.score !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);
  
  if (sortedMoves.length > 0) {
    const randomTop = Math.floor(Math.random() * sortedMoves.length);
    return sortedMoves[randomTop];
  }
  
  return bestMove;
}

// Cheap move ordering heuristic for inside minimax (avoids expensive evaluateMove)
function cheapMoveScore(
  from: HexCoord,
  to: HexCoord,
  pawns: Map<string, Pawn>,
  player: PlayerColor
): number {
  let score = 0;
  const targetRank = player === 'blue' ? -(SIDE_LENGTH - 1) : (SIDE_LENGTH - 1);
  
  // Bonus for reaching target rank
  if (to.r === targetRank) score += 50;
  
  // Forward progress
  const forward = player === 'blue' ? from.r - to.r : to.r - from.r;
  if (forward > 0) score += forward * 10;
  
  // Bonus for landing on opponent (capture potential)
  const targetPawn = pawns.get(hexKey(to));
  if (targetPawn && targetPawn.color !== player) score += 40;
  
  return score;
}

// Minimax with alpha-beta pruning and transposition table
function minimax(
  pawns: Map<string, Pawn>,
  currentPlayer: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  originalPlayer: PlayerColor
): number {
  // Check transposition table
  const hash = hashPosition(pawns, currentPlayer);
  const cached = transpositionTable.get(hash);
  if (cached !== undefined && cached.depth >= depth) {
    return cached.score;
  }
  
  // Check for terminal state or depth limit
  if (depth === 0) {
    const evalScore = evaluatePosition(pawns, originalPlayer);
    transpositionTable.set(hash, { score: evalScore, depth });
    return evalScore;
  }
  
  // Check for game over conditions
  const targetRankBlue = -(SIDE_LENGTH - 1);
  const targetRankRed = SIDE_LENGTH - 1;
  
  let blueOnTarget = 0;
  let redOnTarget = 0;
  let blueActive = 0;
  let redActive = 0;
  
  pawns.forEach((pawn, key) => {
    const coord = parseHexKey(key);
    if (pawn.state === 'active') {
      if (pawn.color === 'blue') {
        blueActive++;
        if (coord.r === targetRankBlue) blueOnTarget++;
      } else {
        redActive++;
        if (coord.r === targetRankRed) redOnTarget++;
      }
    }
  });
  
  // Terminal conditions - win requires 3 pawns on target rank
  if (blueOnTarget >= 3 || redActive === 0) {
    const val = originalPlayer === 'blue' ? 10000 + depth : -10000 - depth;
    transpositionTable.set(hash, { score: val, depth });
    return val;
  }
  if (redOnTarget >= 3 || blueActive === 0) {
    const val = originalPlayer === 'red' ? 10000 + depth : -10000 - depth;
    transpositionTable.set(hash, { score: val, depth });
    return val;
  }
  
  const moves = getAllValidMoves(pawns, currentPlayer);
  
  if (moves.length === 0) {
    const evalScore = evaluatePosition(pawns, originalPlayer);
    transpositionTable.set(hash, { score: evalScore, depth });
    return evalScore;
  }
  
  // Use cheap heuristic for move ordering (not full evaluateMove which is too expensive)
  const orderedMoves = moves
    .map(m => ({
      ...m,
      score: cheapMoveScore(m.from, m.to, pawns, currentPlayer),
    }))
    .sort((a, b) => (maximizingPlayer ? (b.score ?? 0) - (a.score ?? 0) : (a.score ?? 0) - (b.score ?? 0)));
  
  // Properly alternate players each turn
  const nextPlayer = getOpponentColor(currentPlayer);
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    
    for (const move of orderedMoves) {
      const { newPawns } = simulateMove(move.from, move.to, pawns, currentPlayer);
      const evalScore = minimax(newPawns, nextPlayer, depth - 1, alpha, beta, false, originalPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    
    transpositionTable.set(hash, { score: maxEval, depth });
    return maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of orderedMoves) {
      const { newPawns } = simulateMove(move.from, move.to, pawns, currentPlayer);
      const evalScore = minimax(newPawns, nextPlayer, depth - 1, alpha, beta, true, originalPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    
    transpositionTable.set(hash, { score: minEval, depth });
    return minEval;
  }
}

// Clear transposition table (call between games or when it gets too large)
export function clearTranspositionTable(): void {
  transpositionTable.clear();
}

// Get best move using minimax with iterative deepening (Hard difficulty)
export function getMinimaxMove(
  pawns: Map<string, Pawn>,
  player: PlayerColor,
  maxDepth: number = 3  // SHERIFF FIX: Reduced from 4 to 3
): AIMove | null {
  const allMoves = getAllValidMoves(pawns, player);
  
  console.debug('[getMinimaxMove] Starting', { player, maxDepth, movesCount: allMoves.length });
  
  if (allMoves.length === 0) {
    console.debug('[getMinimaxMove] No valid moves available');
    return null;
  }
  
  // SHERIFF FIX: Clear transposition table at each move to avoid stale/toxic entries
  transpositionTable.clear();
  
  // Move ordering: evaluate moves tactically for better alpha-beta pruning
  const orderedMoves = allMoves
    .map(move => ({
      ...move,
      score: evaluateMove(move.from, move.to, pawns, player),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  
  let bestMove: AIMove | null = null;
  let bestScore = -Infinity;
  
  // Iterative deepening - start shallow, go deeper
  for (let depth = 2; depth <= maxDepth; depth++) {
    let depthBestMove: AIMove | null = null;
    let depthBestScore = -Infinity;
    
    for (const move of orderedMoves) {
      const { newPawns } = simulateMove(move.from, move.to, pawns, player);
      const score = minimax(
        newPawns, 
        getOpponentColor(player), 
        depth - 1, 
        -Infinity, 
        Infinity, 
        false, 
        player
      );
      
      // Guard against NaN or undefined scores
      if (typeof score !== 'number' || isNaN(score)) {
        console.warn('[getMinimaxMove] Invalid score from minimax', { move, score, depth });
        continue;
      }
      
      if (score > depthBestScore) {
        depthBestScore = score;
        depthBestMove = { ...move, score };
      }
    }
    
    // Update best move if this depth found a better one
    if (depthBestMove && depthBestScore > bestScore) {
      bestScore = depthBestScore;
      bestMove = depthBestMove;
    }
    
    console.debug('[getMinimaxMove] Depth complete', { depth, bestScore, bestMove });
  }
  
  // Ensure we always return a move if moves are available
  if (!bestMove && orderedMoves.length > 0) {
    console.warn('[getMinimaxMove] No best move selected, using first available move');
    bestMove = orderedMoves[0];
  }
  
  console.debug('[getMinimaxMove] Final result', { bestMove, bestScore });
  return bestMove;
}

// Reset AI state (call between games)
export function resetAIState(): void {
  clearTranspositionTable();
}

// Main AI function to get the AI's move based on difficulty
export function getAIMove(
  pawns: Map<string, Pawn>,
  player: PlayerColor,
  difficulty: AIDifficulty
): AIMove | null {
  console.debug('[getAIMove] Called', { player, difficulty, pawnsCount: pawns.size });
  
  let move: AIMove | null = null;
  
  if (difficulty === 'easy') {
    move = getRandomMove(pawns, player);
  } else if (difficulty === 'hard') {
    // SHERIFF FIX: Fixed depth of 3 for stability
    move = getMinimaxMove(pawns, player, 3);
    
    // Fallback: if minimax fails, try getBestMove
    if (!move) {
      console.warn('[getAIMove] Minimax returned null, falling back to getBestMove');
      move = getBestMove(pawns, player);
    }
    
    // Final fallback: try random move
    if (!move) {
      console.warn('[getAIMove] getBestMove also failed, falling back to getRandomMove');
      move = getRandomMove(pawns, player);
    }
  } else {
    // medium difficulty
    move = getBestMove(pawns, player);
  }
  
  console.debug('[getAIMove] Final result', { move, difficulty });
  return move;
}
