import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { MatchState, Challenge, Position } from '../types/game';
import { sounds } from '../utils/audio';

interface SocketContextType {
  isConnected: boolean;
  onlineUserIds: string[];
  incomingChallenge: Challenge | null;
  activeMatch: MatchState | null;
  matchError: string | null;
  sendChallenge: (
    targetUserId: string,
    timeControl?: 120 | 300,
    moveSuggestions?: 'included' | 'excluded'
  ) => void;
  respondChallenge: (challengeId: string, action: 'accept' | 'decline') => void;
  cancelChallenge: (challengeId: string) => void;
  joinMatch: (matchId: string) => void;
  rollDice: () => void;
  makeMove: (from: Position, to: Position) => void;
  resignMatch: () => void;
  clearIncomingChallenge: () => void;
  clearActiveMatch: () => void;
  clearMatchError: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<Challenge | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchState | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Authenticate socket connection
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'presence:update':
            setOnlineUserIds(msg.onlineUserIds || []);
            break;

          case 'challenge:incoming':
            setIncomingChallenge(msg.challenge);
            sounds.playChallenge();
            break;

          case 'challenge:declined':
            setMatchError(`${msg.challengedName || 'Opponent'} declined your challenge.`);
            break;

          case 'challenge:cancelled':
            setIncomingChallenge((prev) => (prev?.id === msg.challengeId ? null : prev));
            break;

          case 'match:started':
            setActiveMatch(msg.match);
            setIncomingChallenge(null);
            sounds.playChallenge();
            break;

          case 'match:state':
            setActiveMatch(msg.match);
            break;

          case 'match:dice_rolled':
            setActiveMatch(msg.match);
            sounds.playDiceRoll();
            break;

          case 'match:moved':
            setActiveMatch(msg.match);
            if (msg.match.status === 'completed') {
              sounds.playGameOver();
            } else if (msg.lastMove?.captured) {
              sounds.playCapture();
            } else {
              sounds.playMove();
            }
            break;

          case 'match:resigned':
            setActiveMatch(msg.match);
            sounds.playGameOver();
            break;

          case 'error':
            setMatchError(msg.message);
            break;
        }
      } catch (err) {
        console.error('Socket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Reconnect after 3 seconds if token still present
      if (token) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket encountered error:', err);
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      setIncomingChallenge(null);
      setActiveMatch(null);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, connect]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  const sendChallenge = (
    targetUserId: string,
    timeControl: 120 | 300 = 300,
    moveSuggestions: 'included' | 'excluded' = 'included'
  ) => {
    setMatchError(null);
    send({ type: 'challenge:send', targetUserId, timeControl, moveSuggestions });
  };

  const respondChallenge = (challengeId: string, action: 'accept' | 'decline') => {
    setMatchError(null);
    send({ type: 'challenge:respond', challengeId, action });
    if (action === 'decline') {
      setIncomingChallenge(null);
    }
  };

  const cancelChallenge = (challengeId: string) => {
    send({ type: 'challenge:cancel', challengeId });
  };

  const joinMatch = (matchId: string) => {
    setMatchError(null);
    send({ type: 'match:join', matchId });
  };

  const rollDice = () => {
    setMatchError(null);
    send({ type: 'match:roll' });
  };

  const makeMove = (from: Position, to: Position) => {
    setMatchError(null);
    send({ type: 'match:move', from, to });
  };

  const resignMatch = () => {
    send({ type: 'match:resign' });
  };

  const clearIncomingChallenge = () => setIncomingChallenge(null);
  const clearActiveMatch = () => setActiveMatch(null);
  const clearMatchError = () => setMatchError(null);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineUserIds,
        incomingChallenge,
        activeMatch,
        matchError,
        sendChallenge,
        respondChallenge,
        cancelChallenge,
        joinMatch,
        rollDice,
        makeMove,
        resignMatch,
        clearIncomingChallenge,
        clearActiveMatch,
        clearMatchError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
}
