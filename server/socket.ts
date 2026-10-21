import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { db } from './db';
import { getUserIdFromSession } from './auth';
import {
  MatchState,
  Challenge,
  Position,
  PieceColor,
} from '../src/types/game';
import {
  createInitialBoard,
  rollAuthoritativeDice,
  executeMove,
  resignMatch,
  handleTimeout,
} from '../src/game/engine';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  matchId?: string;
  isAlive?: boolean;
}

export function initWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of userId -> Set of WebSockets
  const userSockets = new Map<string, Set<ExtendedWebSocket>>();
  // Map of matchId -> Set of WebSockets
  const matchRooms = new Map<string, Set<ExtendedWebSocket>>();

  function sendToUser(userId: string, data: any) {
    const sockets = userSockets.get(userId);
    if (sockets) {
      const payload = JSON.stringify(data);
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  function broadcastToMatch(matchId: string, data: any) {
    const sockets = matchRooms.get(matchId);
    if (sockets) {
      const payload = JSON.stringify(data);
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  function broadcastPresence() {
    const onlineUserIds = Array.from(userSockets.keys());
    const payload = JSON.stringify({ type: 'presence:update', onlineUserIds });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, data);
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const set = userSockets.get(ws.userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            userSockets.delete(ws.userId);
            broadcastPresence();
          }
        }
      }

      if (ws.matchId) {
        const set = matchRooms.get(ws.matchId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) {
            matchRooms.delete(ws.matchId);
          }
        }
      }
    });
  });

  // Keep-alive ping interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client: WebSocket) => {
      const extWs = client as ExtendedWebSocket;
      if (!extWs.isAlive) return extWs.terminate();
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  function handleMessage(ws: ExtendedWebSocket, data: any) {
    switch (data.type) {
      case 'auth': {
        const { token } = data;
        const userId = getUserIdFromSession(token);
        if (userId) {
          ws.userId = userId;
          if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
          }
          userSockets.get(userId)!.add(ws);
          ws.send(JSON.stringify({ type: 'auth:success', userId }));
          broadcastPresence();
        } else {
          ws.send(JSON.stringify({ type: 'auth:failed', message: 'Invalid token' }));
        }
        break;
      }

      case 'challenge:send': {
        if (!ws.userId) return;
        const { targetUserId } = data;
        if (!targetUserId || targetUserId === ws.userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid target player' }));
          return;
        }

        const sender = db.findUserById(ws.userId);
        const recipient = db.findUserById(targetUserId);
        if (!sender || !recipient) {
          ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
          return;
        }

        // Prevent duplicate pending challenge between same two users
        for (const c of db.challenges.values()) {
          if (
            c.status === 'pending' &&
            c.challenger.userId === ws.userId &&
            c.challenged.userId === targetUserId &&
            c.expiresAt > Date.now()
          ) {
            ws.send(JSON.stringify({ type: 'error', message: 'Challenge already pending' }));
            return;
          }
        }

        const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const timeControl: 120 | 300 = data.timeControl === 120 ? 120 : 300;
        const moveSuggestions: 'included' | 'excluded' =
          data.moveSuggestions === 'excluded' ? 'excluded' : 'included';
        const challenge: Challenge = {
          id: challengeId,
          challenger: {
            userId: sender.id,
            username: sender.username,
            displayName: sender.displayName,
            avatarId: sender.avatarId,
          },
          challenged: {
            userId: recipient.id,
            username: recipient.username,
            displayName: recipient.displayName,
            avatarId: recipient.avatarId,
          },
          status: 'pending',
          timeControl,
          moveSuggestions,
          createdAt: Date.now(),
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiration
        };

        db.saveChallenge(challenge);

        // Notify recipient in real time
        sendToUser(recipient.id, { type: 'challenge:incoming', challenge });
        // Confirm to sender
        ws.send(JSON.stringify({ type: 'challenge:sent', challenge }));
        break;
      }

      case 'challenge:respond': {
        if (!ws.userId) return;
        const { challengeId, action } = data; // 'accept' or 'decline'
        const challenge = db.challenges.get(challengeId);

        if (!challenge) {
          ws.send(JSON.stringify({ type: 'error', message: 'Challenge not found' }));
          return;
        }

        if (challenge.challenged.userId !== ws.userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authorized to respond' }));
          return;
        }

        if (challenge.status !== 'pending' || challenge.expiresAt < Date.now()) {
          ws.send(JSON.stringify({ type: 'error', message: 'Challenge is no longer valid' }));
          return;
        }

        if (action === 'accept') {
          challenge.status = 'accepted';
          const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          challenge.matchId = matchId;
          db.saveChallenge(challenge);

          const duration = challenge.timeControl || 300;
          const now = Date.now();

          // Create authoritative initial match with chosen timer (2m or 5m)
          const initialMatch: MatchState = {
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
            moveSuggestions: challenge.moveSuggestions || 'included',
            totalCaptures: 0,
            diceActive: true,
            timeControl: duration,
            whiteTimeRemaining: duration,
            blackTimeRemaining: duration,
            lastTurnStartTime: now,
            createdAt: now,
            updatedAt: now,
          };

          db.saveMatch(initialMatch);

          // Broadcast match start to both players
          sendToUser(challenge.challenger.userId, {
            type: 'match:started',
            matchId,
            match: initialMatch,
          });
          sendToUser(challenge.challenged.userId, {
            type: 'match:started',
            matchId,
            match: initialMatch,
          });
        } else {
          challenge.status = 'declined';
          db.saveChallenge(challenge);
          sendToUser(challenge.challenger.userId, {
            type: 'challenge:declined',
            challengeId,
            challengedName: challenge.challenged.displayName,
          });
          ws.send(JSON.stringify({ type: 'challenge:updated', challenge }));
        }
        break;
      }

      case 'challenge:cancel': {
        if (!ws.userId) return;
        const { challengeId } = data;
        const challenge = db.challenges.get(challengeId);
        if (challenge && challenge.challenger.userId === ws.userId && challenge.status === 'pending') {
          challenge.status = 'cancelled';
          db.saveChallenge(challenge);
          sendToUser(challenge.challenged.userId, { type: 'challenge:cancelled', challengeId });
          ws.send(JSON.stringify({ type: 'challenge:updated', challenge }));
        }
        break;
      }

      case 'match:join': {
        if (!ws.userId) return;
        const { matchId } = data;
        const match = db.matches.get(matchId);
        if (!match) {
          ws.send(JSON.stringify({ type: 'error', message: 'Match not found' }));
          return;
        }

        // Leave previous match room if any
        if (ws.matchId && matchRooms.has(ws.matchId)) {
          matchRooms.get(ws.matchId)!.delete(ws);
        }

        ws.matchId = matchId;
        if (!matchRooms.has(matchId)) {
          matchRooms.set(matchId, new Set());
        }
        matchRooms.get(matchId)!.add(ws);

        ws.send(JSON.stringify({ type: 'match:state', match }));
        break;
      }

      case 'match:roll': {
        if (!ws.userId || !ws.matchId) return;
        const match = db.matches.get(ws.matchId);
        if (!match || match.status !== 'active') {
          ws.send(JSON.stringify({ type: 'error', message: 'Match is not active' }));
          return;
        }

        // Verify it is user's turn
        const userColor: PieceColor | null =
          match.whitePlayer.userId === ws.userId
            ? 'white'
            : match.blackPlayer.userId === ws.userId
            ? 'black'
            : null;

        if (userColor !== match.turn) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not your turn to roll' }));
          return;
        }

        // EDIT 2: If dice are permanently disabled for this match, reject roll
        if (match.diceActive === false) {
          ws.send(JSON.stringify({ type: 'error', message: 'Dice are removed for this match — normal chess is active.' }));
          return;
        }

        // Verify dice not already rolled
        if (match.dice && !match.dice.isConsumed) {
          ws.send(JSON.stringify({ type: 'error', message: 'Dice already rolled for this turn' }));
          return;
        }

        const dice = rollAuthoritativeDice(match.board, match.turn);
        match.dice = dice;
        match.updatedAt = Date.now();
        db.saveMatch(match);

        broadcastToMatch(match.id, {
          type: 'match:dice_rolled',
          matchId: match.id,
          dice,
          match,
        });
        break;
      }

      case 'match:move': {
        if (!ws.userId || !ws.matchId) return;
        const match = db.matches.get(ws.matchId);
        if (!match || match.status !== 'active') {
          ws.send(JSON.stringify({ type: 'error', message: 'Match is not active' }));
          return;
        }

        const userColor: PieceColor | null =
          match.whitePlayer.userId === ws.userId
            ? 'white'
            : match.blackPlayer.userId === ws.userId
            ? 'black'
            : null;

        if (userColor !== match.turn) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not your turn to move' }));
          return;
        }

        const { from, to }: { from: Position; to: Position } = data;
        const result = executeMove(match, from, to);

        if (!result.success) {
          ws.send(JSON.stringify({ type: 'error', message: result.error || 'Invalid move' }));
          return;
        }

        const updatedMatch = result.state;
        db.saveMatch(updatedMatch);

        // If completed, update win/loss statistics
        if (updatedMatch.status === 'completed' && updatedMatch.result) {
          updateStatsOnGameOver(updatedMatch);
        }

        broadcastToMatch(updatedMatch.id, {
          type: 'match:moved',
          matchId: updatedMatch.id,
          match: updatedMatch,
          lastMove: updatedMatch.moveHistory[updatedMatch.moveHistory.length - 1],
        });
        break;
      }

      case 'match:resign': {
        if (!ws.userId || !ws.matchId) return;
        const match = db.matches.get(ws.matchId);
        if (!match || match.status !== 'active') return;

        const updatedMatch = resignMatch(match, ws.userId);
        db.saveMatch(updatedMatch);
        updateStatsOnGameOver(updatedMatch);

        broadcastToMatch(updatedMatch.id, {
          type: 'match:resigned',
          matchId: updatedMatch.id,
          match: updatedMatch,
        });
        break;
      }
    }
  }

  function updateStatsOnGameOver(match: MatchState) {
    if (!match.result) return;
    const whiteUser = db.findUserById(match.whitePlayer.userId);
    const blackUser = db.findUserById(match.blackPlayer.userId);

    if (whiteUser) {
      whiteUser.stats.totalGames += 1;
      if (match.result.winner === 'white') whiteUser.stats.wins += 1;
      else if (match.result.winner === 'black') whiteUser.stats.losses += 1;
      else if (match.result.winner === 'draw') whiteUser.stats.draws += 1;
      db.saveUser(whiteUser);
    }

    if (blackUser) {
      blackUser.stats.totalGames += 1;
      if (match.result.winner === 'black') blackUser.stats.wins += 1;
      else if (match.result.winner === 'white') blackUser.stats.losses += 1;
      else if (match.result.winner === 'draw') blackUser.stats.draws += 1;
      db.saveUser(blackUser);
    }

    // Zero-bloat guarantee: delete completed match document after 45 seconds so no old games are stored
    setTimeout(() => {
      db.deleteMatch(match.id);
    }, 45000);
  }

  // Periodic 1-second authoritative timer ticker for active matches
  setInterval(() => {
    const now = Date.now();
    for (const match of db.matches.values()) {
      if (match.status !== 'active') continue;

      const elapsed = Math.max(0, (now - (match.lastTurnStartTime || now)) / 1000);
      let isTimedOut = false;
      let timedOutColor: PieceColor = 'white';

      if (match.turn === 'white') {
        const remaining = (match.whiteTimeRemaining ?? match.timeControl ?? 300) - elapsed;
        if (remaining <= 0) {
          isTimedOut = true;
          timedOutColor = 'white';
        }
      } else {
        const remaining = (match.blackTimeRemaining ?? match.timeControl ?? 300) - elapsed;
        if (remaining <= 0) {
          isTimedOut = true;
          timedOutColor = 'black';
        }
      }

      if (isTimedOut) {
        const finishedMatch = handleTimeout(match, timedOutColor);
        db.saveMatch(finishedMatch);
        updateStatsOnGameOver(finishedMatch);
        broadcastToMatch(finishedMatch.id, {
          type: 'match:state',
          matchId: finishedMatch.id,
          match: finishedMatch,
        });
      }
    }
  }, 1000);

  // Periodic cleanup of expired/cancelled challenges every 60 seconds
  setInterval(() => {
    db.cleanupOldChallenges();
  }, 60000);
}
