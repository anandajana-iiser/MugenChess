import React, { useState, useEffect } from 'react';
import { DiceState, PieceColor } from '../types/game';
import { Dices, Sparkles, AlertCircle } from 'lucide-react';

interface DiceRollerProps {
  dice: DiceState | null;
  isMyTurn: boolean;
  myColor: PieceColor;
  onRoll: () => void;
  disabled?: boolean;
  isInCheck?: boolean;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  dice,
  isMyTurn,
  onRoll,
  disabled = false,
  isInCheck = false,
}) => {
  const [isRolling, setIsRolling] = useState(false);

  // Trigger brief roll animation on new roll
  useEffect(() => {
    if (dice) {
      setIsRolling(true);
      const timer = setTimeout(() => setIsRolling(false), 350);
      return () => clearTimeout(timer);
    }
  }, [dice?.rolledAt]);

  const handleRollClick = () => {
    if (disabled || !isMyTurn || (dice && !dice.isConsumed)) return;
    setIsRolling(true);
    onRoll();
  };

  const currentVal = dice?.rolledValue || 1;

  // Dice dot coordinates
  const renderDots = (value: number) => {
    switch (value) {
      case 1:
        return <div className="w-2.5 h-2.5 bg-slate-900 rounded-full" />;
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-1.5">
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-1.5">
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full self-center" />
            <div className="w-2 h-2 bg-slate-900 rounded-full self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-2 p-1.5 w-full h-full">
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full justify-self-end" />
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full justify-self-end" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-1.5">
            <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-slate-900 rounded-full" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-900 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rounded-full" />
            <div className="absolute bottom-1.5 left-1.5 w-2 h-2 bg-slate-900 rounded-full" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-2 bg-slate-900 rounded-full" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-1 w-full h-full">
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full justify-self-end" />
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full justify-self-end" />
            <div className="w-2 h-2 bg-slate-900 rounded-full" />
            <div className="w-2 h-2 bg-slate-900 rounded-full justify-self-end" />
          </div>
        );
      default:
        return null;
    }
  };

  const hasRolled = dice && !dice.isConsumed;

  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-amber-400" />
          Dice Phase
        </span>
        {dice?.probabilityMode === 'biased_late_game' && (
          <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Late-Game Bias Active
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 bg-[#0d1117] p-3 rounded-lg border border-slate-800/80">
        {/* Animated 3D-styled white dice face */}
        <div
          className={`w-12 h-12 bg-slate-100 rounded-lg shadow-md border border-slate-300 flex items-center justify-center shrink-0 transition-transform duration-300 ${
            isRolling ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
          }`}
        >
          {renderDots(currentVal)}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {hasRolled ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-100 tabular-nums">
                  Rolled {dice.rolledValue}
                </span>
                <span className="text-xs text-amber-400 font-medium">
                  {dice.category === 'inexpensive' ? 'Inexpensive' : 'Expensive & Pawn'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {dice.category === 'inexpensive'
                  ? 'Eligible: Knights & Bishops'
                  : 'Eligible: Rooks, Queens, Princes, Kings, Pawns'}
              </p>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-300">
                {isMyTurn ? 'Ready to roll' : 'Opponent’s turn to roll'}
              </span>
              <p className="text-xs text-slate-500">Roll required before any piece can move</p>
            </>
          )}
        </div>
      </div>

      {/* Check Defense notification */}
      {isInCheck && (
        <div className="bg-rose-500/15 border border-rose-500/40 rounded-lg p-2.5 flex items-start gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-rose-300">King Under Attack!</strong>
            <span>Dice roll bypassed: move your King, capture the attacking piece, or block to escape check.</span>
          </div>
        </div>
      )}

      {/* Fallback notification if rolled category had 0 legal moves */}
      {hasRolled && !isInCheck && dice?.isFallbackAnyPiece && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>No moves for category:</strong> Free pass rule applied! All legal moves across all
            pieces unlocked.
          </span>
        </div>
      )}

      {/* Primary Action Button */}
      {isMyTurn && isInCheck ? (
        <div className="text-xs text-center text-rose-300 bg-rose-500/15 border border-rose-500/30 py-2.5 px-3 rounded-lg font-bold">
          Check Defense Active: Select an escape move directly
        </div>
      ) : isMyTurn && !hasRolled ? (
        <button
          onClick={handleRollClick}
          disabled={disabled || isRolling}
          className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Dices className="w-4 h-4" />
          ROLL DICE
        </button>
      ) : null}

      {isMyTurn && (hasRolled || isInCheck) && (
        <div className="text-xs text-center text-slate-400 py-1 font-medium">
          Select an eligible highlighted piece on the board to move
        </div>
      )}
    </div>
  );
};
