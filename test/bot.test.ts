/**
 * Unit Test for Grandmaster Chess Bot Engine
 */

import { createInitialBoard, rollAuthoritativeDice, executeMove } from '../src/game/engine';
import { evaluateBoard, getBestBotMove } from '../src/game/bot';
import { MatchState } from '../src/types/game';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`BOT TEST FAILED: ${msg}`);
  console.log(`✓ ${msg}`);
}

console.log('=== RUNNING GRANDMASTER BOT TESTS ===');

const board = createInitialBoard();

// 1. Initial board symmetry evaluation
const initialScore = evaluateBoard(board, 0, 0);
assert(Math.abs(initialScore) <= 20, `Initial board evaluation is balanced (score: ${initialScore})`);

// 2. Bot selects a valid move from initial position with Dice roll 5 (Pawns / Expensive pieces)
const matchState: MatchState = {
  id: 'test_bot_match',
  whitePlayer: { userId: 'bot', username: 'gm_bot', displayName: 'GM Bot', avatarId: 'avatar_prince' },
  blackPlayer: { userId: 'human', username: 'player', displayName: 'Player', avatarId: 'avatar_knight' },
  board: createInitialBoard(),
  turn: 'white',
  status: 'active',
  dice: rollAuthoritativeDice(board, 'white', 5),
  whitePawnsReachedEndRank: 0,
  blackPawnsReachedEndRank: 0,
  capturedByWhite: [],
  capturedByBlack: [],
  moveHistory: [],
  inCheck: null,
  result: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const bestMove = getBestBotMove(matchState, 'white', 3);
assert(bestMove !== null, 'Bot successfully computed a best move for roll 5');
assert(bestMove?.from !== undefined && bestMove?.to !== undefined, 'Computed move has valid coordinates');

// Execute the bot move
const exec = executeMove(matchState, bestMove!.from, bestMove!.to);
assert(exec.success, 'Bot move successfully passes authoritative rules engine');

// 3. Tactical Capture Test: place free undefended Queen in front of White Knight
const tacticalBoard = createInitialBoard();
// White Knight on b1 (x=1, y=0), place Black Queen on c3 (x=2, y=2)
tacticalBoard[2][2] = { id: 'b_q_trap', type: 'queen', color: 'black', hasMoved: true };
const tacticalMatch: MatchState = {
  ...matchState,
  board: tacticalBoard,
  turn: 'white',
  dice: rollAuthoritativeDice(tacticalBoard, 'white', 1), // Roll 1 allows Knight
};

const captureMove = getBestBotMove(tacticalMatch, 'white', 3);
assert(captureMove !== null, 'Bot computes move for tactical scenario');
assert(
  captureMove?.to.x === 2 && captureMove?.to.y === 2,
  'Bot tactically prioritizes capturing the free Black Queen on c3'
);

console.log('=== ALL BOT TESTS PASSED! ===');
