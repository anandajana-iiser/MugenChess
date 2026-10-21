import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './components/Dashboard';
import { MatchView } from './components/MatchView';
import { ChallengeModal } from './components/ChallengeModal';
import { RulesModal } from './components/RulesModal';
import { BotMatchModal } from './components/BotMatchModal';
import { MatchState, PieceColor, Position } from './types/game';
import {
  createInitialBoard,
  rollAuthoritativeDice,
  executeMove,
  resignMatch,
  handleTimeout,
} from './game/engine';
import { getBestBotMove } from './game/bot';
import { sounds } from './utils/audio';
import { Crown } from 'lucide-react';

function AppContent() {
  const { user, isLoading } = useAuth();
  const {
    activeMatch: socketMatch,
    incomingChallenge,
    respondChallenge,
    clearActiveMatch: clearSocketMatch,
  } = useSocket();

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);

  // Local Grandmaster Bot Match State (zero database clutter, ephemeral)
  const [botMatch, setBotMatch] = useState<MatchState | null>(null);
  const [botPlayerColor, setBotPlayerColor] = useState<PieceColor>('white');
  const [botDifficulty, setBotDifficulty] = useState<'grandmaster' | 'master'>('grandmaster');
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Run Bot turn
  const runBotTurn = useCallback(
    (currentMatch: MatchState, color: PieceColor) => {
      setIsBotThinking(true);

      // EDIT 2 & Check Defense: If dice are permanently disabled or Bot is in check, skip dice roll and move directly!
      if (!currentMatch.diceActive || currentMatch.inCheck === color) {
        setTimeout(() => {
          const depth = botDifficulty === 'grandmaster' ? 3 : 2;
          const bestMove = getBestBotMove(currentMatch, color, depth);

          if (bestMove) {
            const res = executeMove(currentMatch, bestMove.from, bestMove.to);
            if (res.success) {
              setBotMatch(res.state);
              if (res.state.status === 'completed') {
                sounds.playGameOver();
              } else if (bestMove.captured) {
                sounds.playCapture();
              } else {
                sounds.playMove();
              }
            }
          }
          setIsBotThinking(false);
        }, 600);
        return;
      }

      // Normal turn: Bot rolls dice after brief delay
      setTimeout(() => {
        const dice = rollAuthoritativeDice(currentMatch.board, color);
        sounds.playDiceRoll();

        const matchWithDice: MatchState = {
          ...currentMatch,
          dice,
          updatedAt: Date.now(),
        };
        setBotMatch(matchWithDice);

        // Phase 2: Bot computes best move using Minimax + PST
        setTimeout(() => {
          const depth = botDifficulty === 'grandmaster' ? 3 : 2;
          const bestMove = getBestBotMove(matchWithDice, color, depth);

          if (bestMove) {
            const res = executeMove(matchWithDice, bestMove.from, bestMove.to);
            if (res.success) {
              setBotMatch(res.state);
              if (res.state.status === 'completed') {
                sounds.playGameOver();
              } else if (bestMove.captured) {
                sounds.playCapture();
              } else {
                sounds.playMove();
              }
            }
          }
          setIsBotThinking(false);
        }, 500);
      }, 500);
    },
    [botDifficulty]
  );

  // Start instant match against Grandmaster Bot with chosen timer (2m or 5m) and move suggestions setting
  const handleStartBotMatch = (
    playerColor: PieceColor,
    difficulty: 'grandmaster' | 'master',
    timeControl: 120 | 300 = 300,
    moveSuggestions: 'included' | 'excluded' = 'included'
  ) => {
    if (!user) return;
    setIsBotModalOpen(false);
    setBotPlayerColor(playerColor);
    setBotDifficulty(difficulty);

    const botUser = {
      userId: 'usr_bot_gm',
      username: 'grandmaster_bot',
      displayName: difficulty === 'grandmaster' ? 'Grandmaster Bot' : 'Master Bot',
      avatarId: 'avatar_prince',
    };

    const now = Date.now();
    const initialMatch: MatchState = {
      id: `bot_match_${now}`,
      whitePlayer: playerColor === 'white' ? {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarId: user.avatarId,
      } : botUser,
      blackPlayer: playerColor === 'black' ? {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarId: user.avatarId,
      } : botUser,
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
      moveSuggestions,
      totalCaptures: 0,
      diceActive: true,
      timeControl,
      whiteTimeRemaining: timeControl,
      blackTimeRemaining: timeControl,
      lastTurnStartTime: now,
      createdAt: now,
      updatedAt: now,
    };

    setBotMatch(initialMatch);
    sounds.playChallenge();

    // If bot is playing White, take first turn
    if (playerColor === 'black') {
      runBotTurn(initialMatch, 'white');
    }
  };

  // Bot Match Timer Countdown & Timeout evaluation
  useEffect(() => {
    if (!botMatch || botMatch.status !== 'active') return;

    const interval = setInterval(() => {
      setBotMatch((prev) => {
        if (!prev || prev.status !== 'active') return prev;

        const isWhiteTurn = prev.turn === 'white';
        const currentRemaining = isWhiteTurn ? prev.whiteTimeRemaining : prev.blackTimeRemaining;
        const newRemaining = Math.max(0, currentRemaining - 1);

        if (newRemaining <= 0) {
          // Timeout occurred! Evaluate timeout with > 7 piece advantage rule
          const finished = handleTimeout(prev, prev.turn);
          sounds.playGameOver();
          return finished;
        }

        return {
          ...prev,
          whiteTimeRemaining: isWhiteTurn ? newRemaining : prev.whiteTimeRemaining,
          blackTimeRemaining: !isWhiteTurn ? newRemaining : prev.blackTimeRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [botMatch?.status, botMatch?.turn]);

  // Bot Match: Human Rolls Dice
  const handleBotMatchRoll = () => {
    if (!botMatch || botMatch.status !== 'active') return;
    if (botMatch.diceActive === false) return; // EDIT 2: Dice disabled after 3 captures
    if (botMatch.turn !== botPlayerColor) return;
    if (botMatch.dice && !botMatch.dice.isConsumed) return;

    const dice = rollAuthoritativeDice(botMatch.board, botPlayerColor);
    sounds.playDiceRoll();
    setBotMatch({
      ...botMatch,
      dice,
      updatedAt: Date.now(),
    });
  };

  // Bot Match: Human Moves Piece
  const handleBotMatchMove = (from: Position, to: Position) => {
    if (!botMatch || botMatch.status !== 'active') return;
    if (botMatch.turn !== botPlayerColor) return;

    const res = executeMove(botMatch, from, to);
    if (!res.success) return;

    setBotMatch(res.state);

    if (res.state.status === 'completed') {
      sounds.playGameOver();
      return;
    }

    const lastMove = res.state.moveHistory[res.state.moveHistory.length - 1];
    if (lastMove?.captured) {
      sounds.playCapture();
    } else {
      sounds.playMove();
    }

    // Trigger Bot's turn
    const botColor: PieceColor = botPlayerColor === 'white' ? 'black' : 'white';
    runBotTurn(res.state, botColor);
  };

  // Bot Match: Resign
  const handleBotMatchResign = () => {
    if (!botMatch || !user) return;
    const resMatch = resignMatch(botMatch, user.id);
    setBotMatch(resMatch);
    sounds.playGameOver();
  };

  // Exit match view
  const handleExitMatch = () => {
    if (botMatch) {
      setBotMatch(null); // Clean up bot match immediately (zero storage clutter)
    } else {
      clearSocketMatch();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center text-slate-100 gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
          <Crown className="w-5 h-5" />
        </div>
        <span className="text-xs text-slate-400 font-medium">Connecting to Dice Chess...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthModal />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </>
    );
  }

  const activeGame = botMatch || socketMatch;

  return (
    <>
      {activeGame ? (
        <MatchView
          onOpenRules={() => setIsRulesOpen(true)}
          onExit={handleExitMatch}
          overrideMatch={botMatch || undefined}
          customOnRoll={botMatch ? handleBotMatchRoll : undefined}
          customOnMove={botMatch ? handleBotMatchMove : undefined}
          customOnResign={botMatch ? handleBotMatchResign : undefined}
          isBotMatch={Boolean(botMatch)}
          isBotThinking={isBotThinking}
        />
      ) : (
        <Dashboard
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenBotModal={() => setIsBotModalOpen(true)}
        />
      )}

      {/* Global Real-Time Incoming Challenge Modal */}
      <ChallengeModal
        challenge={incomingChallenge}
        onAccept={(id) => respondChallenge(id, 'accept')}
        onDecline={(id) => respondChallenge(id, 'decline')}
      />

      {/* Full Game Rulebook Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Instant Grandmaster Bot Match Modal */}
      <BotMatchModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        onStartBotMatch={handleStartBotMatch}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
