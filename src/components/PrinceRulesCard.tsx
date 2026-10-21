import React from 'react';
import { Crown, Sparkles, ShieldCheck } from 'lucide-react';
import { ChessPiece } from './ChessPiece';
import { PieceColor } from '../types/game';

interface PrinceRulesCardProps {
  myColor: PieceColor;
  princeSpecialUsed?: boolean;
}

export const PrinceRulesCard: React.FC<PrinceRulesCardProps> = ({
  myColor,
  princeSpecialUsed = false,
}) => {
  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-xl p-4 flex flex-col gap-3.5 shadow-sm text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <ChessPiece type="prince" color={myColor} className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            The Prince
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Corner piece (h1 / a8)
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between font-semibold text-amber-300 mb-0.5">
            <span>Ability A · Knight Leap</span>
            <span className="text-[10px] text-slate-500 font-normal">2×1 L-shape</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Moves in the standard Knight pattern (2 squares in one direction, 1 square perpendicular)
            and can jump over intervening pieces.
          </p>
        </div>

        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between font-semibold text-amber-300 mb-0.5">
            <span>Ability B · Bounded Diagonal</span>
            <span className="text-[10px] text-slate-500 font-normal">1 to 4 squares</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Moves diagonally by exactly 1, 2, 3, or 4 squares along clear lines. Cannot jump over
            intervening pieces during diagonal slides.
          </p>
        </div>

        <div className="bg-[#0d1117] p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between font-semibold text-amber-300 mb-0.5">
            <span className="flex items-center gap-1">
              Ability C · Special 1st Move
              <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                princeSpecialUsed
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-amber-500/20 text-amber-300 font-semibold'
              }`}
            >
              {princeSpecialUsed ? 'Used' : 'Available'}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            On its very first move only, the Prince can execute an extended 3×1 knight leap over
            intervening pieces (usable once per Prince per game).
          </p>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Categorized as an Expensive piece (rolls 4, 5, 6).</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a] border border-blue-400/40 inline-block" />
            White: Navy Blue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#881337] border border-red-400/40 inline-block" />
            Black: Dark Red
          </span>
        </div>
      </div>
    </div>
  );
};
