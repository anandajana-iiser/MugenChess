/**
 * Grandmaster Chess Bot Engine for Custom Multiplayer Dice Chess
 *
 * Implements high-performance minimax with alpha-beta pruning, positional piece-square tables,
 * tactical capture ordering, Prince piece evaluation, and 2-pawn end-rank draw awareness.
 * Zero external chess engines or AI API calls required (100% free, fast, and local).
 */

import {
  Piece,
  PieceColor,
  Position,
  Move,
  MatchState,
  PieceType,
} from '../types/game';
import {
  getDiceEligibleMoves,
  applyMoveToBoard,
  getAllLegalMoves,
  isKingInCheck,
} from './engine';

// Base piece values in centipawns
const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  prince: 750, // Royal hybrid unit with high mobility
  queen: 900,
  king: 20000,
};

// Piece-Square Tables (White perspective, y=0 is rank 1, y=7 is rank 8)
// Values reward center control, piece development, and king safety
const PAWN_TABLE_WHITE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [0,  0,  0, 25, 25,  0,  0,  0],
  [5,  5, 10, 30, 30, 10,  5,  5],
  [10, 10, 20, 35, 35, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50], // Approaching end rank bonus
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 20, 30, 30, 20,  0,-30],
  [-30,  5, 20, 30, 30, 20,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-10, 10, 10, 15, 15, 10, 10,-10],
  [-10,  0, 15, 20, 20, 15,  0,-10],
  [-10,  5, 15, 20, 20, 15,  5,-10],
  [-10,  0, 10, 15, 15, 10,  0,-10],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const PRINCE_TABLE = [
  [-20,-10,  0,  0,  0,  0,-10,-20],
  [-10, 10, 15, 20, 20, 15, 10,-10],
  [  0, 15, 25, 30, 30, 25, 15,  0],
  [  0, 20, 30, 40, 40, 30, 20,  0],
  [  0, 20, 30, 40, 40, 30, 20,  0],
  [  0, 15, 25, 30, 30, 25, 15,  0],
  [-10, 10, 15, 20, 20, 15, 10,-10],
  [-20,-10,  0,  0,  0,  0,-10,-20],
];

const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [  0,  0,  5, 10, 10,  5,  0, -5],
  [ -5,  0,  5, 10, 10,  5,  0, -5],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

/**
 * Evaluates the board static score in centipawns from White's perspective
 */
export function evaluateBoard(
  board: (Piece | null)[][],
  whitePawnsEndRank: number,
  blackPawnsEndRank: number
): number {
  let score = 0;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (!piece) continue;

      const isWhite = piece.color === 'white';
      const baseVal = PIECE_VALUES[piece.type];

      // Positional table evaluation
      let posVal = 0;
      const tableY = isWhite ? y : 7 - y;

      switch (piece.type) {
        case 'pawn':
          posVal = PAWN_TABLE_WHITE[tableY][x];
          // Proximity to end rank bonus for pawns
          posVal += (isWhite ? y : 7 - y) * 20;
          break;
        case 'knight':
          posVal = KNIGHT_TABLE[tableY][x];
          break;
        case 'bishop':
          posVal = BISHOP_TABLE[tableY][x];
          break;
        case 'prince':
          posVal = PRINCE_TABLE[tableY][x];
          // Bonus for preserving the 3x1 first move leap option
          if (!piece.hasMoved && !piece.princeSpecialUsed) {
            posVal += 40;
          }
          break;
        case 'queen':
          posVal = QUEEN_TABLE[tableY][x];
          break;
        case 'rook':
          // Bonus for advanced rooks on 7th rank
          if (tableY === 6) posVal += 30;
          break;
        case 'king':
          // King safety: penalize early king exposure
          if (tableY > 2) posVal -= 40;
          break;
      }

      const totalPieceScore = baseVal + posVal;
      score += isWhite ? totalPieceScore : -totalPieceScore;
    }
  }

  // Two-Pawn End Rank Draw evaluation:
  // If White has 1 pawn at end rank, give massive bonus towards reaching second pawn
  if (whitePawnsEndRank === 1) score += 350;
  if (blackPawnsEndRank === 1) score -= 350;

  // King in check pressure
  if (isKingInCheck(board, 'black')) score += 80;
  if (isKingInCheck(board, 'white')) score -= 80;

  return score;
}

/**
 * Move ordering for high alpha-beta pruning efficiency
 * Prioritizes high-value captures, prince leaps, and pawn advancements
 */
function orderMoves(moves: Move[], board: (Piece | null)[][]): Move[] {
  return moves.slice().sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured) {
      scoreA += PIECE_VALUES[a.captured.type] * 10 - PIECE_VALUES[a.piece.type];
    }
    if (b.captured) {
      scoreB += PIECE_VALUES[b.captured.type] * 10 - PIECE_VALUES[b.piece.type];
    }

    // Prince special moves get high tactical attention
    if (a.isSpecialPrinceMove) scoreA += 50;
    if (b.isSpecialPrinceMove) scoreB += 50;

    // Pawn advancement toward opponent end rank
    if (a.piece.type === 'pawn') {
      const advA = a.piece.color === 'white' ? a.to.y : 7 - a.to.y;
      scoreA += advA * 15;
    }
    if (b.piece.type === 'pawn') {
      const advB = b.piece.color === 'white' ? b.to.y : 7 - b.to.y;
      scoreB += advB * 15;
    }

    return scoreB - scoreA;
  });
}

/**
 * Minimax with Alpha-Beta pruning
 */
function minimax(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  whitePawnsEndRank: number,
  blackPawnsEndRank: number
): number {
  if (depth === 0) {
    return evaluateBoard(board, whitePawnsEndRank, blackPawnsEndRank);
  }

  const color: PieceColor = isMaximizing ? 'white' : 'black';
  const allMoves = getAllLegalMoves(board, color);

  if (allMoves.length === 0) {
    if (isKingInCheck(board, color)) {
      // Checkmate
      return isMaximizing ? -999999 + (4 - depth) : 999999 - (4 - depth);
    }
    // Stalemate
    return 0;
  }

  const ordered = orderMoves(allMoves, board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const nextBoard = applyMoveToBoard(board, move);
      const newWhitePawns =
        move.piece.type === 'pawn' && move.to.y === 7 ? whitePawnsEndRank + 1 : whitePawnsEndRank;

      if (newWhitePawns >= 2) {
        // Two pawn draw condition
        return 0;
      }

      const evalScore = minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        false,
        newWhitePawns,
        blackPawnsEndRank
      );
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of ordered) {
      const nextBoard = applyMoveToBoard(board, move);
      const newBlackPawns =
        move.piece.type === 'pawn' && move.to.y === 0 ? blackPawnsEndRank + 1 : blackPawnsEndRank;

      if (newBlackPawns >= 2) {
        // Two pawn draw condition
        return 0;
      }

      const evalScore = minimax(
        nextBoard,
        depth - 1,
        alpha,
        beta,
        true,
        whitePawnsEndRank,
        newBlackPawns
      );
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

/**
 * Computes the Grandmaster-level move for the bot
 */
export function getBestBotMove(
  match: MatchState,
  botColor: PieceColor,
  depth: number = 3
): Move | null {
  const isDiceActive = match.diceActive ?? true;
  const isBotInCheck = match.inCheck === botColor;

  // If dice are active and bot is not in check, a dice roll is mandatory.
  // If dice are removed (normal chess after 3 captures) or in check, bot moves directly!
  if (isDiceActive && !isBotInCheck && !match.dice) return null;

  const eligibleMoves = (!isDiceActive || isBotInCheck)
    ? getAllLegalMoves(match.board, botColor)
    : getDiceEligibleMoves(
        match.board,
        botColor,
        match.dice,
        match.inCheck
      ).eligibleMoves;

  if (eligibleMoves.length === 0) return null;
  if (eligibleMoves.length === 1) return eligibleMoves[0];

  const orderedMoves = orderMoves(eligibleMoves, match.board);
  const isWhite = botColor === 'white';

  let bestMove: Move = orderedMoves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of orderedMoves) {
    const nextBoard = applyMoveToBoard(match.board, move);
    let nextWhitePawns = match.whitePawnsReachedEndRank;
    let nextBlackPawns = match.blackPawnsReachedEndRank;

    if (move.piece.type === 'pawn') {
      if (isWhite && move.to.y === 7) nextWhitePawns += 1;
      if (!isWhite && move.to.y === 0) nextBlackPawns += 1;
    }

    // Two-pawn draw immediate evaluation
    if ((isWhite && nextWhitePawns >= 2) || (!isWhite && nextBlackPawns >= 2)) {
      const currentEval = evaluateBoard(match.board, match.whitePawnsReachedEndRank, match.blackPawnsReachedEndRank);
      // If bot is behind in material, draw is a great outcome!
      if ((isWhite && currentEval < -200) || (!isWhite && currentEval > 200)) {
        return move;
      }
    }

    const score = minimax(
      nextBoard,
      depth - 1,
      alpha,
      beta,
      !isWhite,
      nextWhitePawns,
      nextBlackPawns
    );

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
    }
  }

  return bestMove;
}
