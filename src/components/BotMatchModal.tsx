import React, { useState } from 'react';
import { Bot, Sparkles, X, Swords } from 'lucide-react';
import { PieceColor } from '../types/game';

interface BotMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBotMatch: (
    playerColor: PieceColor,
    difficulty: 'grandmaster' | 'master',
    timeControl: 120 | 300,
    moveSuggestions: 'included' | 'excluded'
  ) => void;
}

export const BotMatchModal: React.FC<BotMatchModalProps> = ({
  isOpen,
  onClose,
  onStartBotMatch,
}) => {
  const [playerColor, setPlayerColor] = useState<PieceColor>('white');
  const [difficulty, setDifficulty] = useState<'grandmaster' | 'master'>('grandmaster');
  const [timeControl, setTimeControl] = useState<120 | 300>(300); // 5 mins default
  const [moveSuggestions, setMoveSuggestions] = useState<'included' | 'excluded'>('included');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#161b22] border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                Play vs Grandmaster Bot
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Instant play · Zero matchmaking · Top-level calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Choice */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Choose Your Side
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlayerColor('white')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                playerColor === 'white'
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 shadow-sm" />
              <span className="text-xs font-bold">Play as White</span>
              <span className="text-[10px] text-slate-400">Moves first</span>
            </button>

            <button
              type="button"
              onClick={() => setPlayerColor('black')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                playerColor === 'black'
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-600 shadow-sm" />
              <span className="text-xs font-bold">Play as Black</span>
              <span className="text-[10px] text-slate-400">Bot moves first</span>
            </button>
          </div>
        </div>

        {/* Difficulty Choice */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Bot Engine Strength
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setDifficulty('grandmaster')}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                difficulty === 'grandmaster'
                  ? 'bg-amber-500/10 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-slate-100 block">
                  Grandmaster Level (Depth 3 Minimax + PST)
                </span>
                <span className="text-[11px] text-slate-400">
                  Calculates optimal responses, positional center control, and 2-pawn draw tactics.
                </span>
              </div>
              {difficulty === 'grandmaster' && (
                <span className="text-xs text-amber-400 font-bold shrink-0 ml-2">Active</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDifficulty('master')}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                difficulty === 'master'
                  ? 'bg-amber-500/10 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-slate-100 block">
                  Master Level (Depth 2 Fast Tactics)
                </span>
                <span className="text-[11px] text-slate-400">
                  Rapid tactical evaluations and tactical Prince maneuvers.
                </span>
              </div>
              {difficulty === 'master' && (
                <span className="text-xs text-amber-400 font-bold shrink-0 ml-2">Active</span>
              )}
            </button>
          </div>
        </div>

        {/* Timer Choice (2 Minutes or 5 Minutes) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Match Timer (Piece-Advantage Rules)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTimeControl(300)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                timeControl === 300
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-100">⏱️ 5 Minutes</span>
              <span className="text-[10px] text-slate-400">Fixed clock per side</span>
            </button>

            <button
              type="button"
              onClick={() => setTimeControl(120)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                timeControl === 120
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-100">⚡ 2 Minutes</span>
              <span className="text-[10px] text-slate-400">Fast blitz clock</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            * Timeout Rule: If timer ends, winner is checked. If piece difference &gt; 7, leader with more pieces wins; otherwise timed-out player loses.
          </p>
        </div>

        {/* Move Suggestions Choice (EDIT 1: Included / Excluded) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Move Suggestions
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMoveSuggestions('included')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                moveSuggestions === 'included'
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-100">Included (Default)</span>
              <span className="text-[10px] text-slate-400">Show valid move tints</span>
            </button>

            <button
              type="button"
              onClick={() => setMoveSuggestions('excluded')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                moveSuggestions === 'excluded'
                  ? 'bg-amber-500/10 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                  : 'bg-[#0d1117] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold text-slate-100">Excluded</span>
              <span className="text-[10px] text-slate-400">No destination dots</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => onStartBotMatch(playerColor, difficulty, timeControl, moveSuggestions)}
          className="w-full mt-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          Start Game Immediately
        </button>
      </div>
    </div>
  );
};
