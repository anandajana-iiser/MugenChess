/**
 * Custom Multiplayer Dice Chess - Authoritative Game Engine
 *
 * Rules:
 * 1. 8x8 Board with custom corner piece layout:
 *    - White: Queen at a1, Prince at h1.
 *    - Black: Prince at a8, Queen at h8.
 *    - Rooks, Bishops, Knights, Kings and Pawns occupy the remaining initial squares.
 * 2. Prince Special Piece:
 *    - Standard Knight move (2x1 L-shape leap).
 *    - Bounded Diagonal move (1, 2, 3, or 4 squares unobstructed diagonal).
 *    - Extended 3x1 first move (usable once per Prince per game).
 * 3. Dice Roll System:
 *    - Rolls 1, 2, 3: Inexpensive pieces (Knight, Bishop).
 *    - Rolls 4, 5, 6: Expensive pieces (Rook, Queen, Prince, King, Pawn).
 *    - Fallback: If no legal moves exist for the rolled group, all valid moves unlock!
 *    - Late-game bias: when active player has < 7 pieces, bias toward 4, 5, 6.
 * 4. Draw Condition:
 *    - Game immediately draws when either player gets 2 pawns to the opponent's back rank.
 */

import {
  Piece,
  PieceColor,
  PieceType,
  Position,
  Move,
  DiceState,
  MatchState,
  MatchStatus,
  MatchResult,
} from '../types/game';

export const INEXPENSIVE_PIECES: PieceType[] = ['knight', 'bishop'];
export const EXPENSIVE_PIECES: PieceType[] = ['rook', 'queen', 'prince', 'king', 'pawn'];

export const LATE_GAME_PIECE_THRESHOLD = 7;

// Biased probability weights for late-game (when player material < 7)
export const BIASED_DICE_WEIGHTS = {
  1: 0.10,
  2: 0.10,
  3: 0.10,
  4: 0.2333,
  5: 0.2333,
  6: 0.2334,
};

/**
 * Creates the deterministic initial 8x8 board
 */
export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Rank 1 (y=0): White pieces
  // a1: Queen, b1: Knight, c1: Bishop, d1: Rook, e1: King, f1: Bishop, g1: Rook, h1: Prince
  board[0][0] = { id: 'w_q_a1', type: 'queen', color: 'white', hasMoved: false };
  board[0][1] = { id: 'w_n_b1', type: 'knight', color: 'white', hasMoved: false };
  board[0][2] = { id: 'w_b_c1', type: 'bishop', color: 'white', hasMoved: false };
  board[0][3] = { id: 'w_r_d1', type: 'rook', color: 'white', hasMoved: false };
  board[0][4] = { id: 'w_k_e1', type: 'king', color: 'white', hasMoved: false };
  board[0][5] = { id: 'w_b_f1', type: 'bishop', color: 'white', hasMoved: false };
  board[0][6] = { id: 'w_r_g1', type: 'rook', color: 'white', hasMoved: false };
  board[0][7] = { id: 'w_p_h1', type: 'prince', color: 'white', hasMoved: false, princeSpecialUsed: false };

  // Rank 2 (y=1): White pawns
  for (let x = 0; x < 8; x++) {
    board[1][x] = {
      id: `w_pawn_${x}`,
      type: 'pawn',
      color: 'white',
      hasMoved: false,
    };
  }

  // Rank 7 (y=6): Black pawns
  for (let x = 0; x < 8; x++) {
    board[6][x] = {
      id: `b_pawn_${x}`,
      type: 'pawn',
      color: 'black',
      hasMoved: false,
    };
  }

  // Rank 8 (y=7): Black pieces
  // a8: Prince, b8: Rook, c8: Bishop, d8: Rook, e8: King, f8: Bishop, g8: Knight, h8: Queen
  board[7][0] = { id: 'b_p_a8', type: 'prince', color: 'black', hasMoved: false, princeSpecialUsed: false };
  board[7][1] = { id: 'b_r_b8', type: 'rook', color: 'black', hasMoved: false };
  board[7][2] = { id: 'b_b_c8', type: 'bishop', color: 'black', hasMoved: false };
  board[7][3] = { id: 'b_r_d8', type: 'rook', color: 'black', hasMoved: false };
  board[7][4] = { id: 'b_k_e8', type: 'king', color: 'black', hasMoved: false };
  board[7][5] = { id: 'b_b_f8', type: 'bishop', color: 'black', hasMoved: false };
  board[7][6] = { id: 'b_n_g8', type: 'knight', color: 'black', hasMoved: false };
  board[7][7] = { id: 'b_q_h8', type: 'queen', color: 'black', hasMoved: false };

  return board;
}

export function isInsideBoard(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function posToNotation(pos: Position): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  return `${files[pos.x]}${pos.y + 1}`;
}

export function notationToPos(str: string): Position | null {
  if (str.length !== 2) return null;
  const fileChar = str[0].toLowerCase();
  const rankChar = str[1];
  const x = fileChar.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = parseInt(rankChar, 10) - 1;
  if (isInsideBoard(x, y)) {
    return { x, y };
  }
  return null;
}

/**
 * Counts the remaining pieces for a given color
 */
export function countRemainingPieces(board: (Piece | null)[][], color: PieceColor): number {
  let count = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.color === color) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Generates an authoritative dice roll result based on piece count
 */
export function rollAuthoritativeDice(
  board: (Piece | null)[][],
  turn: PieceColor,
  forcedValue?: number
): DiceState {
  const piecesRemaining = countRemainingPieces(board, turn);
  const isBiased = piecesRemaining < LATE_GAME_PIECE_THRESHOLD;

  let rolledValue: number;

  if (forcedValue && forcedValue >= 1 && forcedValue <= 6) {
    rolledValue = forcedValue;
  } else if (!isBiased) {
    rolledValue = Math.floor(Math.random() * 6) + 1;
  } else {
    // Biased distribution
    const r = Math.random();
    let accumulated = 0;
    rolledValue = 6;
    for (const [valStr, weight] of Object.entries(BIASED_DICE_WEIGHTS)) {
      accumulated += weight;
      if (r <= accumulated) {
        rolledValue = parseInt(valStr, 10);
        break;
      }
    }
  }

  const category = rolledValue <= 3 ? 'inexpensive' : 'expensive';
  const eligiblePieceTypes = category === 'inexpensive' ? INEXPENSIVE_PIECES : EXPENSIVE_PIECES;

  return {
    rolledValue,
    category,
    eligiblePieceTypes,
    isFallbackAnyPiece: false,
    isConsumed: false,
    probabilityMode: isBiased ? 'biased_late_game' : 'uniform',
    rolledAt: Date.now(),
  };
}

/**
 * Clones a board state deeply
 */
export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map((row) =>
    row.map((piece) => (piece ? { ...piece } : null))
  );
}

/**
 * Find King position for color
 */
export function findKingPosition(
  board: (Piece | null)[][],
  color: PieceColor
): Position | null {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.color === color && piece.type === 'king') {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * Computes pseudo-legal moves for a piece without king-safety checks
 */
export function getPseudoLegalMoves(
  board: (Piece | null)[][],
  from: Position
): Move[] {
  const piece = board[from.y][from.x];
  if (!piece) return [];

  const moves: Move[] = [];
  const color = piece.color;
  const enemyColor: PieceColor = color === 'white' ? 'black' : 'white';

  const addMove = (
    to: Position,
    extra: { isSpecialPrinceMove?: boolean; isPromotion?: boolean } = {}
  ) => {
    if (!isInsideBoard(to.x, to.y)) return;
    const destPiece = board[to.y][to.x];
    if (destPiece && destPiece.color === color) return; // Cannot capture own piece

    moves.push({
      from,
      to,
      piece: { ...piece },
      captured: destPiece ? { ...destPiece } : undefined,
      isSpecialPrinceMove: extra.isSpecialPrinceMove,
      isPromotion: extra.isPromotion,
      timestamp: Date.now(),
    });
  };

  // PAWN
  if (piece.type === 'pawn') {
    const forward = color === 'white' ? 1 : -1;
    const startRank = color === 'white' ? 1 : 6;
    const promoRank = color === 'white' ? 7 : 0;

    // 1 square forward
    const nextY = from.y + forward;
    if (isInsideBoard(from.x, nextY) && !board[nextY][from.x]) {
      addMove({ x: from.x, y: nextY }, { isPromotion: nextY === promoRank });

      // 2 squares forward from start rank
      const doubleY = from.y + 2 * forward;
      if (from.y === startRank && isInsideBoard(from.x, doubleY) && !board[doubleY][from.x]) {
        addMove({ x: from.x, y: doubleY });
      }
    }

    // Diagonals captures
    const captureOffsets = [-1, 1];
    for (const dx of captureOffsets) {
      const capX = from.x + dx;
      const capY = from.y + forward;
      if (isInsideBoard(capX, capY)) {
        const destPiece = board[capY][capX];
        if (destPiece && destPiece.color === enemyColor) {
          addMove({ x: capX, y: capY }, { isPromotion: capY === promoRank });
        }
      }
    }
  }

  // KNIGHT
  if (piece.type === 'knight') {
    const knightOffsets = [
      { dx: 1, dy: 2 },
      { dx: 2, dy: 1 },
      { dx: 2, dy: -1 },
      { dx: 1, dy: -2 },
      { dx: -1, dy: -2 },
      { dx: -2, dy: -1 },
      { dx: -2, dy: 1 },
      { dx: -1, dy: 2 },
    ];
    for (const off of knightOffsets) {
      addMove({ x: from.x + off.dx, y: from.y + off.dy });
    }
  }

  // BISHOP
  if (piece.type === 'bishop' || piece.type === 'queen') {
    const diagDirs = [
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 },
    ];
    for (const dir of diagDirs) {
      let step = 1;
      while (true) {
        const toX = from.x + dir.dx * step;
        const toY = from.y + dir.dy * step;
        if (!isInsideBoard(toX, toY)) break;
        const destPiece = board[toY][toX];
        if (!destPiece) {
          addMove({ x: toX, y: toY });
        } else {
          if (destPiece.color === enemyColor) {
            addMove({ x: toX, y: toY });
          }
          break; // Blocked
        }
        step++;
      }
    }
  }

  // ROOK
  if (piece.type === 'rook' || piece.type === 'queen') {
    const orthDirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const dir of orthDirs) {
      let step = 1;
      while (true) {
        const toX = from.x + dir.dx * step;
        const toY = from.y + dir.dy * step;
        if (!isInsideBoard(toX, toY)) break;
        const destPiece = board[toY][toX];
        if (!destPiece) {
          addMove({ x: toX, y: toY });
        } else {
          if (destPiece.color === enemyColor) {
            addMove({ x: toX, y: toY });
          }
          break; // Blocked
        }
        step++;
      }
    }
  }

  // KING
  if (piece.type === 'king') {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        addMove({ x: from.x + dx, y: from.y + dy });
      }
    }
  }

  // PRINCE
  if (piece.type === 'prince') {
    // 1. Knight movement (standard 2x1 leap)
    const knightOffsets = [
      { dx: 1, dy: 2 },
      { dx: 2, dy: 1 },
      { dx: 2, dy: -1 },
      { dx: 1, dy: -2 },
      { dx: -1, dy: -2 },
      { dx: -2, dy: -1 },
      { dx: -2, dy: 1 },
      { dx: -1, dy: 2 },
    ];
    for (const off of knightOffsets) {
      addMove({ x: from.x + off.dx, y: from.y + off.dy });
    }

    // 2. Bounded diagonal movement (1, 2, 3, or 4 squares unobstructed diagonal)
    const diagDirs = [
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 },
    ];
    for (const dir of diagDirs) {
      for (let dist = 1; dist <= 4; dist++) {
        const toX = from.x + dir.dx * dist;
        const toY = from.y + dir.dy * dist;
        if (!isInsideBoard(toX, toY)) break;
        const destPiece = board[toY][toX];
        if (!destPiece) {
          addMove({ x: toX, y: toY });
        } else {
          if (destPiece.color === enemyColor) {
            addMove({ x: toX, y: toY });
          }
          break; // Blocked by any piece
        }
      }
    }

    // 3. Extended 3x1 knight jump on first move only
    if (!piece.princeSpecialUsed && !piece.hasMoved) {
      const extendedKnightOffsets = [
        { dx: 1, dy: 3 },
        { dx: 3, dy: 1 },
        { dx: 3, dy: -1 },
        { dx: 1, dy: -3 },
        { dx: -1, dy: -3 },
        { dx: -3, dy: -1 },
        { dx: -3, dy: 1 },
        { dx: -1, dy: 3 },
      ];
      for (const off of extendedKnightOffsets) {
        addMove(
          { x: from.x + off.dx, y: from.y + off.dy },
          { isSpecialPrinceMove: true }
        );
      }
    }
  }

  return moves;
}

/**
 * Checks if the King of given color is currently in check
 */
export function isKingInCheck(
  board: (Piece | null)[][],
  color: PieceColor
): boolean {
  const kingPos = findKingPosition(board, color);
  if (!kingPos) return false;

  const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.color === opponentColor) {
        const enemyMoves = getPseudoLegalMoves(board, { x, y });
        for (const m of enemyMoves) {
          if (m.to.x === kingPos.x && m.to.y === kingPos.y) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Applies a move to a cloned board
 */
export function applyMoveToBoard(
  board: (Piece | null)[][],
  move: Move
): (Piece | null)[][] {
  const newBoard = cloneBoard(board);
  const movingPiece = { ...newBoard[move.from.y][move.from.x]! };

  movingPiece.hasMoved = true;
  if (move.isSpecialPrinceMove) {
    movingPiece.princeSpecialUsed = true;
  }

  // Pawn promotion to Queen
  if (move.isPromotion || (movingPiece.type === 'pawn' && (move.to.y === 0 || move.to.y === 7))) {
    movingPiece.type = 'queen';
  }

  newBoard[move.from.y][move.from.x] = null;
  newBoard[move.to.y][move.to.x] = movingPiece;

  return newBoard;
}

/**
 * Computes strictly legal moves for a piece (excluding moves that leave King in check)
 */
export function getLegalMovesForSquare(
  board: (Piece | null)[][],
  from: Position
): Move[] {
  const piece = board[from.y][from.x];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, from);
  const legalMoves: Move[] = [];

  for (const move of pseudoMoves) {
    const nextBoard = applyMoveToBoard(board, move);
    if (!isKingInCheck(nextBoard, piece.color)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

/**
 * Returns all strictly legal moves for all pieces of a color
 */
export function getAllLegalMoves(
  board: (Piece | null)[][],
  color: PieceColor
): Move[] {
  const moves: Move[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece && piece.color === color) {
        moves.push(...getLegalMovesForSquare(board, { x, y }));
      }
    }
  }
  return moves;
}

/**
 * Evaluates dice eligibility and handles check defense & user's fallback rule:
 * 1. If currently in check: bypass dice entirely and allow any legal check-resolving move.
 * 2. If not in check: check rolled category eligibility.
 * 3. Fallback: If 0 legal moves exist for rolled category, unlock all valid moves.
 */
export function getDiceEligibleMoves(
  board: (Piece | null)[][],
  turn: PieceColor,
  dice: DiceState | null,
  inCheck?: PieceColor | null
): {
  eligibleMoves: Move[];
  isFallback: boolean;
  isCheckDefense: boolean;
  eligiblePieceTypes: PieceType[];
} {
  const allMoves = getAllLegalMoves(board, turn);

  // Fallacy fix: When in check, player can move King or any piece to escape check without dice roll!
  if (inCheck === turn) {
    return {
      eligibleMoves: allMoves,
      isFallback: false,
      isCheckDefense: true,
      eligiblePieceTypes: ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'prince'],
    };
  }

  if (!dice) {
    return { eligibleMoves: [], isFallback: false, isCheckDefense: false, eligiblePieceTypes: [] };
  }

  // Filter moves to only pieces matching dice's eligible piece types
  const categoryMoves = allMoves.filter((m) =>
    dice.eligiblePieceTypes.includes(m.piece.type)
  );

  if (categoryMoves.length > 0) {
    return {
      eligibleMoves: categoryMoves,
      isFallback: false,
      isCheckDefense: false,
      eligiblePieceTypes: dice.eligiblePieceTypes,
    };
  }

  // Fallback: If 0 legal moves exist for rolled category, unlock ALL valid moves for this player!
  return {
    eligibleMoves: allMoves,
    isFallback: true,
    isCheckDefense: false,
    eligiblePieceTypes: ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'prince'],
  };
}

/**
 * Executes a committed move and updates authoritative match state
 */
export function executeMove(
  currentState: MatchState,
  from: Position,
  to: Position
): { success: boolean; state: MatchState; error?: string } {
  if (currentState.status !== 'active') {
    return { success: false, state: currentState, error: 'Match is not active.' };
  }

  const isDiceActive = currentState.diceActive ?? true;
  const isPlayerInCheck = currentState.inCheck === currentState.turn;

  // Dice roll is required ONLY if dice are active AND NOT in check!
  if (isDiceActive && !isPlayerInCheck && (!currentState.dice || currentState.dice.isConsumed)) {
    return { success: false, state: currentState, error: 'Must roll dice before moving.' };
  }

  // If dice are disabled (normal chess after 3 captures) or player in check, all legal moves are eligible
  const eligibleMoves = (!isDiceActive || isPlayerInCheck)
    ? getAllLegalMoves(currentState.board, currentState.turn)
    : getDiceEligibleMoves(
        currentState.board,
        currentState.turn,
        currentState.dice,
        currentState.inCheck
      ).eligibleMoves;

  const matchedMove = eligibleMoves.find(
    (m) =>
      m.from.x === from.x &&
      m.from.y === from.y &&
      m.to.x === to.x &&
      m.to.y === to.y
  );

  if (!matchedMove) {
    return {
      success: false,
      state: currentState,
      error: isPlayerInCheck
        ? 'Illegal move: you must get out of check.'
        : !isDiceActive
        ? 'Illegal move.'
        : 'Illegal move for current dice roll.',
    };
  }

  const piece = currentState.board[from.y][from.x]!;
  const newBoard = applyMoveToBoard(currentState.board, matchedMove);

  // Check captured piece
  const capturedPiece = currentState.board[to.y][to.x];
  const capturedByWhite = [...currentState.capturedByWhite];
  const capturedByBlack = [...currentState.capturedByBlack];
  let totalCaptures = currentState.totalCaptures ?? (currentState.capturedByWhite.length + currentState.capturedByBlack.length);

  if (capturedPiece) {
    if (currentState.turn === 'white') {
      capturedByWhite.push(capturedPiece);
    } else {
      capturedByBlack.push(capturedPiece);
    }
    totalCaptures += 1;
  }

  // EDIT 2: Dice vanish after 3 captures. Permanently disabled for this match.
  const nextDiceActive = isDiceActive && totalCaptures < 3;

  // Check Two-Pawn End Rank Draw condition
  let whitePawnsEndRank = currentState.whitePawnsReachedEndRank;
  let blackPawnsEndRank = currentState.blackPawnsReachedEndRank;

  if (piece.type === 'pawn') {
    if (currentState.turn === 'white' && to.y === 7) {
      whitePawnsEndRank += 1;
    } else if (currentState.turn === 'black' && to.y === 0) {
      blackPawnsEndRank += 1;
    }
  }

  const nextTurn: PieceColor = currentState.turn === 'white' ? 'black' : 'white';
  const nextInCheck = isKingInCheck(newBoard, nextTurn) ? nextTurn : null;

  // Evaluate game end conditions:
  // User confirmed precedence: Checkmate victory takes priority over two-pawn end rank draw!
  let result: MatchResult | null = null;
  let nextStatus: MatchStatus = currentState.status;

  const opponentAllMoves = getAllLegalMoves(newBoard, nextTurn);
  const isOpponentCheckmate = opponentAllMoves.length === 0 && nextInCheck !== null;
  const isOpponentStalemate = opponentAllMoves.length === 0 && nextInCheck === null;

  if (isOpponentCheckmate) {
    // 1. Checkmate takes top priority!
    result = {
      winner: currentState.turn,
      reason: 'checkmate',
      winnerUserId:
        currentState.turn === 'white'
          ? currentState.whitePlayer.userId
          : currentState.blackPlayer.userId,
      completedAt: Date.now(),
    };
    nextStatus = 'completed';
  } else if (whitePawnsEndRank >= 2 || blackPawnsEndRank >= 2) {
    // 2. Two-Pawn Draw takes priority over normal play
    result = {
      winner: 'draw',
      reason: 'two_pawns_end_rank_draw',
      completedAt: Date.now(),
    };
    nextStatus = 'completed';
  } else if (isOpponentStalemate) {
    // 3. Stalemate
    result = {
      winner: 'draw',
      reason: 'stalemate',
      completedAt: Date.now(),
    };
    nextStatus = 'completed';
  }

  const recordedMove: Move = {
    ...matchedMove,
    san: `${piece.type[0].toUpperCase()}${posToNotation(from)}→${posToNotation(to)}`,
    timestamp: Date.now(),
  };

  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - (currentState.lastTurnStartTime || now)) / 1000);
  let whiteTimeRemaining = currentState.whiteTimeRemaining ?? currentState.timeControl ?? 300;
  let blackTimeRemaining = currentState.blackTimeRemaining ?? currentState.timeControl ?? 300;

  if (currentState.turn === 'white') {
    whiteTimeRemaining = Math.max(0, whiteTimeRemaining - elapsedSeconds);
  } else {
    blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsedSeconds);
  }

  const updatedState: MatchState = {
    ...currentState,
    board: newBoard,
    turn: nextStatus === 'completed' ? currentState.turn : nextTurn,
    status: nextStatus,
    dice: null, // Clear dice roll for next turn
    whitePawnsReachedEndRank: whitePawnsEndRank,
    blackPawnsReachedEndRank: blackPawnsEndRank,
    capturedByWhite,
    capturedByBlack,
    totalCaptures,
    diceActive: nextDiceActive,
    moveSuggestions: currentState.moveSuggestions ?? 'included',
    moveHistory: [...currentState.moveHistory, recordedMove],
    inCheck: nextInCheck,
    result,
    whiteTimeRemaining,
    blackTimeRemaining,
    lastTurnStartTime: now,
    updatedAt: now,
  };

  return { success: true, state: updatedState };
}

/**
 * Resign match
 */
export function resignMatch(
  currentState: MatchState,
  resigningUserId: string
): MatchState {
  if (currentState.status !== 'active') return currentState;

  const isWhite = currentState.whitePlayer.userId === resigningUserId;
  const isBlack = currentState.blackPlayer.userId === resigningUserId;
  if (!isWhite && !isBlack) return currentState;

  const winner: PieceColor = isWhite ? 'black' : 'white';
  const winnerUserId = isWhite ? currentState.blackPlayer.userId : currentState.whitePlayer.userId;

  return {
    ...currentState,
    status: 'completed',
    result: {
      winner,
      reason: 'resignation',
      winnerUserId,
      completedAt: Date.now(),
      explanation: `${isWhite ? 'White' : 'Black'} resigned.`,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Count active pieces remaining on board for each player
 */
export function countBoardPieces(board: (Piece | null)[][]): { white: number; black: number } {
  let white = 0;
  let black = 0;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const piece = board[y][x];
      if (piece) {
        if (piece.color === 'white') white++;
        else if (piece.color === 'black') black++;
      }
    }
  }
  return { white, black };
}

/**
 * Handle player timer expiration with custom piece-difference rule:
 * - If piece difference > 7: player with MORE pieces is declared winner regardless of whose timer ran out!
 * - If piece difference <= 7: player whose timer ran out loses automatically.
 */
export function handleTimeout(
  currentState: MatchState,
  timedOutColor: PieceColor
): MatchState {
  if (currentState.status !== 'active') return currentState;

  const counts = countBoardPieces(currentState.board);
  const diff = Math.abs(counts.white - counts.black);

  let winner: PieceColor;
  let reason: GameEndReason;
  let explanation: string;

  if (diff > 7) {
    // When piece difference is strictly more than 7, player with more pieces is declared the winner!
    winner = counts.white > counts.black ? 'white' : 'black';
    const leaderCount = counts[winner];
    const trailerCount = counts[winner === 'white' ? 'black' : 'white'];
    reason = 'timeout_piece_advantage';
    explanation = `Timer expired for ${timedOutColor}, but piece difference is ${diff} (> 7). ${
      winner === 'white' ? 'White' : 'Black'
    } has ${leaderCount} pieces vs ${trailerCount} and wins by overwhelming piece advantage!`;
  } else {
    // Difference is <= 7: player whose timer ran out loses automatically
    winner = timedOutColor === 'white' ? 'black' : 'white';
    reason = 'timeout';
    explanation = `Timer expired for ${timedOutColor}. Piece difference is ${diff} (<= 7). ${
      winner === 'white' ? 'White' : 'Black'
    } wins on time!`;
  }

  const winnerUserId =
    winner === 'white'
      ? currentState.whitePlayer.userId
      : currentState.blackPlayer.userId;

  return {
    ...currentState,
    status: 'completed',
    whiteTimeRemaining: timedOutColor === 'white' ? 0 : currentState.whiteTimeRemaining,
    blackTimeRemaining: timedOutColor === 'black' ? 0 : currentState.blackTimeRemaining,
    result: {
      winner,
      reason,
      winnerUserId,
      completedAt: Date.now(),
      explanation,
    },
    updatedAt: Date.now(),
  };
}
