import React from 'react';
import { X, BookOpen, Crown, Dices, Award, ShieldAlert, Flag } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#13171e]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">
              Custom Multiplayer Dice Chess Rulebook
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {/* Section 1: Overview & Board */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              1. Board & Custom Starting Setup
            </h4>
            <p className="text-slate-300 mb-2">
              The game is played on a standard 8×8 grid with 64 squares using algebraic coordinates (a–h, 1–8).
              White starts on ranks 1 & 2; Black starts on ranks 8 & 7.
            </p>
            <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 space-y-1">
              <div>· <strong>Corner Queens & Princes:</strong></div>
              <div className="pl-3">White Queen is at a1, White Prince is at h1.</div>
              <div className="pl-3">Black Prince is at a8, Black Queen is at h8.</div>
              <div>· Rooks, Bishops, Knights, King, and 8 Pawns fill the remaining standard ranks.</div>
              <div>· Each side begins with exactly 16 pieces (32 total).</div>
            </div>
          </div>

          {/* Section 2: Dice Mechanics */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <Dices className="w-4 h-4" />
              2. Dice System & Piece Eligibility
            </h4>
            <p className="text-slate-300 mb-2">
              Every turn begins by pressing <strong>ROLL DICE</strong>. The authoritative server generates a roll from 1 to 6:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li>
                <strong>Rolls 1, 2, 3 (Inexpensive):</strong> Unlocks movement for <strong>Knights</strong> and <strong>Bishops</strong>.
              </li>
              <li>
                <strong>Rolls 4, 5, 6 (Expensive & Pawns):</strong> Unlocks movement for <strong>Rooks</strong>, <strong>Queens</strong>, <strong>Princes</strong>, <strong>Kings</strong>, and <strong>Pawns</strong>.
              </li>
              <li>
                <strong>No-Legal-Move Fallback:</strong> If the rolled category contains zero legal moves for that player, the game lifts the category restriction and permits moving <em>any</em> piece that has a valid move!
              </li>
              <li>
                <strong>Late-Game Biasing:</strong> When a player has strictly fewer than 7 pieces remaining, the dice probability shifts toward rolls 4, 5, and 6 to accelerate late-game action.
              </li>
              <li className="text-amber-300 font-semibold">
                <strong>Dice Vanish After 3 Captures:</strong> The dice system stays active until a combined total of 3 pieces have been captured. Once the 3rd capture occurs, dice and category limits are permanently removed, and normal chess rules apply for the rest of the match!
              </li>
            </ul>
          </div>

          {/* Section 3: The Prince Piece */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              3. The Prince Piece
            </h4>
            <p className="text-slate-300 mb-2">
              The Prince is a royal hybrid unit replacing the second Knight:
            </p>
            <div className="space-y-2">
              <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-semibold text-slate-200">Ability A (Knight Leap):</span> Standard 2×1 L-shape jump over intervening pieces.
              </div>
              <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-semibold text-slate-200">Ability B (Bounded Diagonal):</span> Unobstructed diagonal slide of exactly 1, 2, 3, or 4 squares. Cannot jump over pieces.
              </div>
              <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-semibold text-slate-200">Ability C (Extended 1st Move):</span> On its very first move only, can perform an extended 3×1 knight leap over pieces (usable once per Prince per game).
              </div>
            </div>
          </div>

          {/* Section 4: Draw Condition & Precedence */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" />
              4. Special Draw Condition (Two-Pawn End Rank) & Precedence
            </h4>
            <p className="text-slate-300">
              The game immediately concludes in a <strong>DRAW</strong> if either player lands <strong>two Pawns</strong> on the opponent’s back rank (rank 8 for White, rank 1 for Black).
            </p>
            <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800 text-xs text-amber-300/90 mt-2">
              <strong>Checkmate Precedence Rule:</strong> If a move simultaneously delivers checkmate and advances a second pawn to the back rank, <strong>Checkmate victory takes priority</strong> over the draw!
            </div>
          </div>

          {/* Section 5: Check & Check Defense Bypass */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              5. Check, Check Defense & Checkmate
            </h4>
            <div className="space-y-2 text-slate-300">
              <p>
                <strong>Check Defense (Dice Roll Bypassed):</strong> When your King is placed in check, you do <em>not</em> need to roll the dice! The dice roll is bypassed, and you can immediately move your King, capture the attacking piece, or block the line of attack with any legal piece.
              </p>
              <p>
                <strong>Checkmate:</strong> If a King is in check and no legal move on the board can escape check, checkmate is declared and the attacking player wins.
              </p>
            </div>
          </div>

          {/* Section 6: Match Timers & Overwhelming Piece Advantage Rule */}
          <div>
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              6. Timers & Overwhelming Piece Advantage Rule
            </h4>
            <div className="space-y-2 text-slate-300">
              <p>
                Each player is allotted a fixed clock of either <strong>5 Minutes (Standard)</strong> or <strong>2 Minutes (Blitz)</strong> chosen before match start. No other timer durations exist.
              </p>
              <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                <div className="text-amber-300 font-semibold">
                  What happens when a player’s timer runs out?
                </div>
                <div>
                  · <strong>Difference &gt; 7 pieces:</strong> If the piece count difference between both sides is strictly greater than 7 (diff &gt; 7), the player who has <strong>more pieces is declared the winner</strong> regardless of whose timer ran out!
                </div>
                <div>
                  · <strong>Difference ≤ 7 pieces:</strong> If the piece count difference is 7 or fewer, normal chess timeout rules apply: the player whose clock runs out <strong>loses automatically</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-[#13171e]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
          >
            Got it, Return to Game
          </button>
        </div>
      </div>
    </div>
  );
};
