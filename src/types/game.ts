/**
 * Types for Custom Multiplayer Dice Chess
 */

export type PieceColor = 'white' | 'black';

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king' | 'prince';

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
  // Specific to Prince: whether the extended 3x1 first move has been consumed
  princeSpecialUsed?: boolean;
}

export interface Position {
  x: number; // 0 (file a) to 7 (file h)
  y: number; // 0 (rank 1) to 7 (rank 8)
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  isSpecialPrinceMove?: boolean;
  isPromotion?: boolean;
  promotedTo?: PieceType;
  san?: string; // Standard algebraic notation
  timestamp: number;
}

export type DiceCategory = 'inexpensive' | 'expensive';

export interface DiceState {
  rolledValue: number; // 1 to 6
  category: DiceCategory;
  eligiblePieceTypes: PieceType[];
  isFallbackAnyPiece: boolean; // True if rolled category had 0 valid moves and unlocked all pieces
  isConsumed: boolean;
  probabilityMode: 'uniform' | 'biased_late_game';
  rolledAt: number;
}

export type MatchStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export type GameEndReason = 
  | 'checkmate' 
  | 'two_pawns_end_rank_draw' 
  | 'resignation' 
  | 'stalemate' 
  | 'timeout' 
  | 'timeout_piece_advantage'
  | 'agreement_draw';

export interface MatchResult {
  winner: PieceColor | 'draw' | null;
  reason: GameEndReason | null;
  winnerUserId?: string;
  completedAt?: number;
  explanation?: string;
}

export interface MatchState {
  id: string;
  whitePlayer: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
  };
  blackPlayer: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
  };
  board: (Piece | null)[][]; // 8x8 grid [y][x], where y=0 is rank 1, y=7 is rank 8
  turn: PieceColor;
  status: MatchStatus;
  dice: DiceState | null;
  whitePawnsReachedEndRank: number;
  blackPawnsReachedEndRank: number;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  moveHistory: Move[];
  inCheck: PieceColor | null;
  result: MatchResult | null;
  // Move hints setting: 'included' (show valid move dots/tints) or 'excluded' (hide move hints)
  moveSuggestions: 'included' | 'excluded';
  // Dice removal rule: dice stay active until a combined total of 3 captures, then diceActive becomes false (normal chess)
  totalCaptures: number;
  diceActive: boolean;
  // Timer fields: 120 seconds (2 mins) or 300 seconds (5 mins)
  timeControl: 120 | 300;
  whiteTimeRemaining: number; // in seconds
  blackTimeRemaining: number; // in seconds
  lastTurnStartTime: number; // timestamp ms
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarId: string;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
  };
  createdAt: number;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export interface Challenge {
  id: string;
  challenger: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
  };
  challenged: {
    userId: string;
    username: string;
    displayName: string;
    avatarId: string;
  };
  status: ChallengeStatus;
  timeControl: 120 | 300; // 2 minutes or 5 minutes
  moveSuggestions?: 'included' | 'excluded';
  matchId?: string;
  createdAt: number;
  expiresAt: number;
}
