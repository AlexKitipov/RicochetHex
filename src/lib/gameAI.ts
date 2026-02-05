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
  SIDE_LENGTH
} from './hexUtils';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIMove {
  from: HexCoord;
  to: HexCoord;
  score?: number;
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

// Simulate a move and return the resulting pawn state
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
  const newPawns = new Map(pawns);
  const pawn = newPawns.get(hexKey(from));
  
  if (!pawn) {
    return { newPawns, neutralized: [], recovered: [], captured: [] };
  }
  
  // Move the pawn
  newPawns.delete(hexKey(from));
  newPawns.set(hexKey(to), pawn);
  
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
  const opponent = getOpponentColor(player);
  const dangerPenalty = checkIfInDanger(to, player, newPawns);
  score -= dangerPenalty;
  
  // Evaluate resulting position
  const positionScore = evaluatePosition(newPawns, player);
  score += positionScore * 0.1; // Weight position less than immediate gains
  
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

// Minimax with alpha-beta pruning for Hard difficulty
function minimax(
  pawns: Map<string, Pawn>,
  player: PlayerColor,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  originalPlayer: PlayerColor
): number {
  // Check for terminal state or depth limit
  if (depth === 0) {
    return evaluatePosition(pawns, originalPlayer);
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
  
  // Terminal conditions
  if (blueOnTarget >= 2 || redActive === 0) {
    return originalPlayer === 'blue' ? 10000 + depth : -10000 - depth;
  }
  if (redOnTarget >= 2 || blueActive === 0) {
    return originalPlayer === 'red' ? 10000 + depth : -10000 - depth;
  }
  
  const currentPlayer = maximizingPlayer ? originalPlayer : getOpponentColor(originalPlayer);
  const moves = getAllValidMoves(pawns, currentPlayer);
  
  if (moves.length === 0) {
    return evaluatePosition(pawns, originalPlayer);
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    
    for (const move of moves) {
      const { newPawns } = simulateMove(move.from, move.to, pawns, currentPlayer);
      const evalScore = minimax(newPawns, player, depth - 1, alpha, beta, false, originalPlayer);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    
    return maxEval;
  } else {
    let minEval = Infinity;
    
    for (const move of moves) {
      const { newPawns } = simulateMove(move.from, move.to, pawns, currentPlayer);
      const evalScore = minimax(newPawns, player, depth - 1, alpha, beta, true, originalPlayer);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    
    return minEval;
  }
}


// Get best move using minimax (Hard difficulty)
export function getMinimaxMove(
  pawns: Map<string, Pawn>,
  player: PlayerColor,
  depth: number = 3
): AIMove | null {
  const allMoves = getAllValidMoves(pawns, player);
  
  console.debug('[getMinimaxMove] Starting', { player, depth, movesCount: allMoves.length });
  
  if (allMoves.length === 0) {
    console.debug('[getMinimaxMove] No valid moves available');
    return null;
  }
  
  let bestMove: AIMove | null = allMoves[0]; // Default to first move as fallback
  let bestScore = -Infinity;
  
  for (const move of allMoves) {
    const { newPawns } = simulateMove(move.from, move.to, pawns, player);
    const score = minimax(newPawns, player, depth - 1, -Infinity, Infinity, false, player);
    
    // Guard against NaN or undefined scores
    if (typeof score !== 'number' || isNaN(score)) {
      console.warn('[getMinimaxMove] Invalid score from minimax', { move, score });
      continue;
    }
    
    move.score = score;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  console.debug('[getMinimaxMove] Result', { bestMove, bestScore });
  
  // Ensure we always return a move if moves are available
  if (!bestMove && allMoves.length > 0) {
    console.warn('[getMinimaxMove] No best move selected, using first available move');
    bestMove = allMoves[0];
  }
  
  return bestMove;
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
    move = getMinimaxMove(pawns, player, 2);
    
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
