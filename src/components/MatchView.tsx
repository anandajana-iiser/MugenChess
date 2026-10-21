import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ChessBoard } from './ChessBoard';
import { DiceRoller } from './DiceRoller';
import { PrinceRulesCard } from './PrinceRulesCard';
import { AvatarDisplay } from './Avatars';
import { ChessPiece } from './ChessPiece';
import { PieceColor, Position, MatchState, Piece, Move } from '../types/game';
import {
  ArrowLeft,
  Flag,
  BookOpen,
  Trophy,
  History,
  Shield,
  Layers,
  Crown,
  Clock,
  Timer,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface MatchViewProps {
  onOpenRules: () => void;
  onExit: () => void;
  overrideMatch?: MatchState;
  customOnRoll?: () => void;
  customOnMove?: (from: Position, to: Position) => void;
  customOnResign?: () => void;
  isBotMatch?: boolean;
  isBotThinking?: boolean;
}

export const MatchView: React.FC<MatchViewProps> = ({
  onOpenRules,
  onExit,
  overrideMatch,
  customOnRoll,
  customOnMove,
  customOnResign,
  isBotMatch = false,
  isBotThinking = false,
}) => {
  const { user } = useAuth();
  const { activeMatch: socketMatch, rollDice: socketRoll, makeMove: socketMove, resignMatch: socketResign } = useSocket();
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const activeMatch = overrideMatch || socketMatch;
  const rollDice = customOnRoll || socketRoll;
  const makeMove = customOnMove || socketMove;
  const resignMatch = customOnResign || socketResign;

  if (!user || !activeMatch) return null;

  const isWhite = activeMatch.whitePlayer.userId === user.id;
  const myColor: PieceColor = isWhite ? 'white' : 'black';
  const opponent = isWhite ? activeMatch.blackPlayer : activeMatch.whitePlayer;
  const isMyTurn = activeMatch.turn === myColor;
  const isGameOver = activeMatch.status === 'completed';

  // Last move
  const lastMove =
    activeMatch.moveHistory.length > 0
      ? activeMatch.moveHistory[activeMatch.moveHistory.length - 1]
      : undefined;

  // Determine if Prince's special 3x1 first move has been consumed
  let princeSpecialUsed = false;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const p = activeMatch.board[y][x];
      if (p && p.type === 'prince' && p.color === myColor) {
        princeSpecialUsed = Boolean(p.princeSpecialUsed || p.hasMoved);
      }
    }
  }

  const handleMakeMove = (from: Position, to: Position) => {
    makeMove(from, to);
  };

  const handleConfirmResign = () => {
    resignMatch();
    setShowResignConfirm(false);
  };

  const myPawnsEndRank = isWhite
    ? activeMatch.whitePawnsReachedEndRank
    : activeMatch.blackPawnsReachedEndRank;
  const oppPawnsEndRank = isWhite
    ? activeMatch.blackPawnsReachedEndRank
    : activeMatch.whitePawnsReachedEndRank;

  // Live Clocks (5m or 2m)
  const defaultTime = activeMatch.timeControl || 300;
  const [displayWhiteTime, setDisplayWhiteTime] = useState<number>(activeMatch.whiteTimeRemaining ?? defaultTime);
  const [displayBlackTime, setDisplayBlackTime] = useState<number>(activeMatch.blackTimeRemaining ?? defaultTime);

  useEffect(() => {
    setDisplayWhiteTime(activeMatch.whiteTimeRemaining ?? defaultTime);
    setDisplayBlackTime(activeMatch.blackTimeRemaining ?? defaultTime);
  }, [activeMatch.whiteTimeRemaining, activeMatch.blackTimeRemaining, defaultTime]);

  useEffect(() => {
    if (isGameOver) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - (activeMatch.lastTurnStartTime || now)) / 1000);
      if (activeMatch.turn === 'white') {
        const remaining = Math.max(0, (activeMatch.whiteTimeRemaining ?? defaultTime) - elapsed);
        setDisplayWhiteTime(remaining);
      } else {
        const remaining = Math.max(0, (activeMatch.blackTimeRemaining ?? defaultTime) - elapsed);
        setDisplayBlackTime(remaining);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isGameOver, activeMatch.turn, activeMatch.lastTurnStartTime, activeMatch.whiteTimeRemaining, activeMatch.blackTimeRemaining, defaultTime]);

  function formatClock(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  }

  // Active Pieces Count & 7-Piece Advantage Tracker
  let whitePiecesCount = 0;
  let blackPiecesCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = activeMatch.board[r][c];
      if (p) {
        if (p.color === 'white') whitePiecesCount++;
        else if (p.color === 'black') blackPiecesCount++;
      }
    }
  }
  const pieceDiff = Math.abs(whitePiecesCount - blackPiecesCount);
  const hasMajorPieceAdvantage = pieceDiff > 7;
  const pieceLeader: PieceColor | null =
    hasMajorPieceAdvantage ? (whitePiecesCount > blackPiecesCount ? 'white' : 'black') : null;

  return (
    <div className="min-h-screen bg-[#0a0e14] text-slate-100 flex flex-col">
      {/* Top Header HUD */}
      <header className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-[#12161f]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <AvatarDisplay avatarId={opponent.avatarId} size="sm" />
            <div>
              <span className="text-xs font-bold text-slate-100 block">vs {opponent.displayName}</span>
              <span className="text-[10px] text-slate-400">
                Playing as {isWhite ? 'White' : 'Black'}
              </span>
            </div>
          </div>
        </div>

        {/* Clocks & Turn HUD Banner */}
        <div className="flex items-center gap-2.5">
          {/* White Clock Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
              activeMatch.turn === 'white' && !isGameOver
                ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            } ${
              displayWhiteTime <= 10 && !isGameOver && activeMatch.turn === 'white'
                ? 'border-rose-500 text-rose-400 animate-pulse'
                : ''
            }`}
            title="White Clock"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300 shadow-sm" />
            <span>{formatClock(displayWhiteTime)}</span>
          </div>

          {/* Turn Banner */}
          {!isGameOver ? (
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                isMyTurn
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-slate-800/80 text-slate-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  activeMatch.turn === 'white' ? 'bg-slate-200' : 'bg-slate-900 border border-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isMyTurn
                  ? (activeMatch.diceActive === false ? 'Your Turn (Normal Chess)' : 'Your Turn')
                  : isBotThinking
                  ? 'Grandmaster Bot Thinking...'
                  : `${activeMatch.turn === 'white' ? 'White' : 'Black'}’s Turn`}
              </span>
            </div>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Match Completed
            </span>
          )}

          {/* Black Clock Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
              activeMatch.turn === 'black' && !isGameOver
                ? 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            } ${
              displayBlackTime <= 10 && !isGameOver && activeMatch.turn === 'black'
                ? 'border-rose-500 text-rose-400 animate-pulse'
                : ''
            }`}
            title="Black Clock"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600 shadow-sm" />
            <span>{formatClock(displayBlackTime)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRules}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {!isGameOver && (
            <button
              onClick={() => setShowResignConfirm(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resign</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Arena Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Desktop 3 cols): Clocks, Piece Diff, Target, Material, Move History */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
          {/* Match Timer & Piece Advantage Status Card */}
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Match Clocks ({activeMatch.timeControl === 120 ? '2 Min' : '5 Min'})
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                Diff &gt; 7 rule active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  activeMatch.turn === 'white' && !isGameOver
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-[#0d1117] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-slate-100 border border-slate-300" />
                  <span className="text-[10px] text-slate-400 font-semibold">White</span>
                </div>
                <span
                  className={`text-lg font-mono font-black block ${
                    displayWhiteTime <= 10 && activeMatch.turn === 'white' && !isGameOver
                      ? 'text-rose-400 animate-pulse'
                      : displayWhiteTime <= 30 && activeMatch.turn === 'white' && !isGameOver
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}
                >
                  {formatClock(displayWhiteTime)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {whitePiecesCount} pieces
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  activeMatch.turn === 'black' && !isGameOver
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-[#0d1117] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-600" />
                  <span className="text-[10px] text-slate-400 font-semibold">Black</span>
                </div>
                <span
                  className={`text-lg font-mono font-black block ${
                    displayBlackTime <= 10 && activeMatch.turn === 'black' && !isGameOver
                      ? 'text-rose-400 animate-pulse'
                      : displayBlackTime <= 30 && activeMatch.turn === 'black' && !isGameOver
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}
                >
                  {formatClock(displayBlackTime)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {blackPiecesCount} pieces
                </span>
              </div>
            </div>

            {/* Piece count difference info */}
            <div className="pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Piece Difference:</span>
                <span
                  className={`font-mono font-bold ${
                    hasMajorPieceAdvantage ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {pieceDiff} {hasMajorPieceAdvantage ? '(> 7)' : '(≤ 7)'}
                </span>
              </div>
              {hasMajorPieceAdvantage ? (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-snug flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>
                      {pieceLeader === 'white' ? 'White' : 'Black'} leads by {pieceDiff} pieces (&gt;7).
                    </strong>{' '}
                    If any timer ends, {pieceLeader === 'white' ? 'White' : 'Black'} wins automatically!
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 leading-tight">
                  * Difference ≤ 7: if either timer runs out, that player loses automatically.
                </p>
              )}
            </div>
          </div>

          {/* Pawn Draw Target Tracker */}
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              2-Pawn Draw Target
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Your End-Rank Pawns:</span>
                <span className="font-mono font-bold text-amber-400">{myPawnsEndRank} / 2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Opponent End-Rank Pawns:</span>
                <span className="font-mono font-semibold text-slate-400">{oppPawnsEndRank} / 2</span>
              </div>
              <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${(myPawnsEndRank / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Captured Pieces Bar */}
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Captured Material
              </h4>
              <span className="text-[10px] font-mono text-amber-400">
                {activeMatch.diceActive === false
                  ? 'Normal Chess Active'
                  : `${Math.max(0, 3 - ((activeMatch.capturedByWhite?.length || 0) + (activeMatch.capturedByBlack?.length || 0)))} to normal chess`}
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Captured by White:</span>
                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {activeMatch.capturedByWhite.map((p, i) => (
                    <div key={i} className="w-5 h-5">
                      <ChessPiece type={p.type} color="black" />
                    </div>
                  ))}
                  {activeMatch.capturedByWhite.length === 0 && (
                    <span className="text-[10px] text-slate-600">None yet</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Captured by Black:</span>
                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {activeMatch.capturedByBlack.map((p, i) => (
                    <div key={i} className="w-5 h-5">
                      <ChessPiece type={p.type} color="white" />
                    </div>
                  ))}
                  {activeMatch.capturedByBlack.length === 0 && (
                    <span className="text-[10px] text-slate-600">None yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Move History */}
          <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col max-h-[360px]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              Move History ({activeMatch.moveHistory.length})
            </h4>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/80 text-xs font-mono pr-1">
              {activeMatch.moveHistory.map((m, idx) => (
                <div key={idx} className="py-1.5 flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 w-6">#{idx + 1}</span>
                  <span className="text-amber-300 font-semibold">{m.san}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {activeMatch.moveHistory.length === 0 && (
                <div className="py-4 text-center text-slate-600 text-[11px]">
                  No moves recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column (Desktop 5-6 cols): The 8x8 Chessboard */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          {/* Mobile compact 2-pawn draw & piece status banner */}
          <div className="flex lg:hidden w-full flex-col gap-1.5 bg-[#161b22] border border-slate-800 rounded-xl p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">2-Pawn Draw:</span>
              <span className="font-mono font-bold text-amber-400">
                You: {myPawnsEndRank}/2 · Opponent: {oppPawnsEndRank}/2
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">
                Pieces: <span className="text-slate-200 font-semibold">{whitePiecesCount}W</span> vs{' '}
                <span className="text-slate-200 font-semibold">{blackPiecesCount}B</span> (Diff: {pieceDiff})
              </span>
              {hasMajorPieceAdvantage ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  &gt;7 Rule Active ({pieceLeader === 'white' ? 'White' : 'Black'} leads)
                </span>
              ) : (
                <span className="text-slate-500 font-mono">Diff ≤ 7 (Time-out rule)</span>
              )}
            </div>
          </div>

          <ChessBoard
            board={activeMatch.board}
            turn={activeMatch.turn}
            myColor={myColor}
            dice={activeMatch.dice}
            lastMove={lastMove}
            inCheck={activeMatch.inCheck}
            isInteractive={!isGameOver}
            onMove={handleMakeMove}
            flipped={!isWhite}
            showMoveSuggestions={activeMatch.moveSuggestions !== 'excluded'}
            diceActive={activeMatch.diceActive ?? true}
          />
        </div>

        {/* Right Column (Desktop 4 cols): Dice Roller & Prince Rules Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* EDIT 2: Dice Control or Dice Removed Notice */}
          {activeMatch.diceActive !== false ? (
            <DiceRoller
              dice={activeMatch.dice}
              isMyTurn={isMyTurn}
              myColor={myColor}
              onRoll={rollDice}
              disabled={isGameOver}
              isInCheck={activeMatch.inCheck === myColor}
            />
          ) : (
            <div className="bg-[#161b22] border border-amber-500/40 rounded-xl p-4 flex flex-col items-center text-center gap-2 shadow-sm animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">
                  Dice removed — normal chess begins
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  3 captures have occurred! Dice rolling, category limits, and fallbacks are permanently disabled for this match. Any legal move is permitted on your turn.
                </p>
              </div>
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-300">
                <span>Standard Chess Rules Active</span>
              </div>
            </div>
          )}

          {/* Persistent Prince Rules Explanation Panel */}
          <PrinceRulesCard
            myColor={myColor}
            princeSpecialUsed={princeSpecialUsed}
          />
        </div>
      </main>

      {/* Resign Confirmation Modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-100 flex flex-col gap-4">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Resign Game?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to resign? Your opponent will be awarded the victory.
            </p>
            <div className="flex items-center gap-2.5 mt-2">
              <button
                onClick={handleConfirmResign}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 font-bold text-xs rounded-lg transition-colors cursor-pointer text-white"
              >
                Yes, Resign
              </button>
              <button
                onClick={() => setShowResignConfirm(false)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 font-medium text-xs rounded-lg transition-colors cursor-pointer text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Victory / Draw Modal */}
      {isGameOver && activeMatch.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#161b22] border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              {activeMatch.result.winner === 'draw' ? (
                <Crown className="w-7 h-7 text-amber-400" />
              ) : (
                <Trophy className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-100">
                {activeMatch.result.winner === 'draw'
                  ? 'Game Drawn!'
                  : (activeMatch.result.winner === 'white' && isWhite) ||
                    (activeMatch.result.winner === 'black' && !isWhite)
                  ? 'Victory!'
                  : 'Defeat'}
              </h3>
              <p className="text-xs text-amber-300 font-medium mt-1">
                {activeMatch.result.reason === 'two_pawns_end_rank_draw' &&
                  'Draw Condition: Two Pawns reached opponent’s end rank!'}
                {activeMatch.result.reason === 'checkmate' && 'Game won by Checkmate!'}
                {activeMatch.result.reason === 'resignation' && 'Game ended by Resignation.'}
                {activeMatch.result.reason === 'stalemate' && 'Game ended in Stalemate.'}
                {activeMatch.result.reason === 'timeout' && 'Game won on Time (Timeout)!'}
                {activeMatch.result.reason === 'timeout_piece_advantage' &&
                  'Victory by Timeout with 7+ Piece Advantage!'}
              </p>
              {activeMatch.result.explanation && (
                <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {activeMatch.result.explanation}
                </p>
              )}
            </div>

            <div className="w-full bg-[#0d1117] p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-around">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">White</span>
                <span className="font-semibold text-slate-200">{activeMatch.whitePlayer.displayName}</span>
              </div>
              <span className="font-mono font-bold text-amber-400">VS</span>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Black</span>
                <span className="font-semibold text-slate-200">{activeMatch.blackPlayer.displayName}</span>
              </div>
            </div>

            <button
              onClick={onExit}
              className="w-full mt-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 font-bold text-xs text-slate-950 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
