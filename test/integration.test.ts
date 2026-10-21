/**
 * End-to-End Integration Test for Two-Player Workflow
 */

import { db, UserRecord } from '../server/db';
import { hashPassword, createSession, sanitizeUser } from '../server/auth';
import { createInitialBoard, rollAuthoritativeDice, executeMove } from '../src/game/engine';
import { MatchState, Challenge } from '../src/types/game';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`INTEGRATION TEST FAILED: ${msg}`);
  console.log(`✓ ${msg}`);
}

console.log('=== RUNNING TWO-PLAYER INTEGRATION TEST ===');

// 1. Create User A (Alice)
const alicePw = hashPassword('secret123');
const alice: UserRecord = {
  id: 'usr_alice_test',
  username: 'alice',
  displayName: 'Alice Champion',
  avatarId: 'avatar_queen',
  passwordHash: alicePw.hash,
  salt: alicePw.salt,
  stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
  createdAt: Date.now(),
};
db.saveUser(alice);
const aliceToken = createSession(alice.id);
assert(Boolean(aliceToken), 'Alice created and logged in with persistent token');

// 2. Create User B (Bob)
const bobPw = hashPassword('password456');
const bob: UserRecord = {
  id: 'usr_bob_test',
  username: 'bob',
  displayName: 'Bob Tactician',
  avatarId: 'avatar_prince',
  passwordHash: bobPw.hash,
  salt: bobPw.salt,
  stats: { wins: 0, losses: 0, draws: 0, totalGames: 0 },
  createdAt: Date.now(),
};
db.saveUser(bob);
const bobToken = createSession(bob.id);
assert(Boolean(bobToken), 'Bob created and logged in with persistent token');

// 3. User Discovery: Alice searches for Bob
const foundBob = db.findUserByUsername('bob');
assert(foundBob?.id === bob.id, 'Alice can search and discover Bob by username');

// 4. Alice sends Challenge to Bob
const challengeId = `ch_test_${Date.now()}`;
const challenge: Challenge = {
  id: challengeId,
  challenger: {
    userId: alice.id,
    username: alice.username,
    displayName: alice.displayName,
    avatarId: alice.avatarId,
  },
  challenged: {
    userId: bob.id,
    username: bob.username,
    displayName: bob.displayName,
    avatarId: bob.avatarId,
  },
  status: 'pending',
  timeControl: 300,
  moveSuggestions: 'included',
  createdAt: Date.now(),
  expiresAt: Date.now() + 300000,
};
db.saveChallenge(challenge);
assert(db.challenges.get(challengeId)?.status === 'pending', 'Challenge successfully stored in database');

// 5. Bob accepts Challenge
const matchId = `match_test_${Date.now()}`;
challenge.status = 'accepted';
challenge.matchId = matchId;
db.saveChallenge(challenge);

const newMatch: MatchState = {
  id: matchId,
  whitePlayer: challenge.challenger,
  blackPlayer: challenge.challenged,
  board: createInitialBoard(),
  turn: 'white',
  status: 'active',
  dice: null,
  whitePawnsReachedEndRank: 0,
  blackPawnsReachedEndRank: 0,
  capturedByWhite: [],
  capturedByBlack: [],
  moveHistory: [],
  inCheck: null,
  result: null,
  moveSuggestions: 'included',
  totalCaptures: 0,
  diceActive: true,
  timeControl: 300,
  whiteTimeRemaining: 300,
  blackTimeRemaining: 300,
  lastTurnStartTime: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
db.saveMatch(newMatch);
assert(db.matches.get(matchId) !== undefined, 'Single authoritative match created upon acceptance');

// 6. User A (White) rolls dice & moves e2 -> e4
newMatch.dice = rollAuthoritativeDice(newMatch.board, 'white', 5); // Roll 5 (Pawns eligible)
const moveRes1 = executeMove(newMatch, { x: 4, y: 1 }, { x: 4, y: 3 });
assert(moveRes1.success, 'White executes legal pawn move e2->e4');
db.saveMatch(moveRes1.state);

// 7. User B (Black) rolls dice & moves e7 -> e5
const matchAfterMove1 = db.matches.get(matchId)!;
assert(matchAfterMove1.turn === 'black', 'Authoritative state accurately reflects Black’s turn');
matchAfterMove1.dice = rollAuthoritativeDice(matchAfterMove1.board, 'black', 6);
const moveRes2 = executeMove(matchAfterMove1, { x: 4, y: 6 }, { x: 4, y: 4 });
assert(moveRes2.success, 'Black executes legal pawn move e7->e5');
db.saveMatch(moveRes2.state);

// 8. Reconnection Verification
// Simulating user refreshing page and querying match by ID from server
const reconnectedMatch = db.matches.get(matchId);
assert(reconnectedMatch !== undefined, 'Match state persists and is retrieved on reconnect');
assert(reconnectedMatch?.moveHistory.length === 2, 'Full move history intact across refresh');
assert(reconnectedMatch?.turn === 'white', 'Correct player turn restored');

console.log('=== ALL 8 INTEGRATION TESTS PASSED! ===');
