import React from 'react';
import { Challenge } from '../types/game';
import { AvatarDisplay } from './Avatars';
import { Swords, Check, X } from 'lucide-react';

interface ChallengeModalProps {
  challenge: Challenge | null;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  challenge,
  onAccept,
  onDecline,
}) => {
  if (!challenge) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-[#161b22] border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-200 text-slate-100">
      <div className="flex items-start gap-3">
        <AvatarDisplay avatarId={challenge.challenger.avatarId} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Swords className="w-3.5 h-3.5" />
            Match Challenge!
          </div>
          <h4 className="text-sm font-semibold text-slate-100 truncate mt-0.5">
            {challenge.challenger.displayName}
          </h4>
          <p className="text-xs text-slate-400 font-mono">
            @{challenge.challenger.username} challenged you to a game.
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
              <span>⏱️ {challenge.timeControl === 120 ? '2 Minutes' : '5 Minutes'}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
              <span>💡 Hints: {challenge.moveSuggestions === 'excluded' ? 'Excluded' : 'Included'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onAccept(challenge.id)}
              className="flex-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => onDecline(challenge.id)}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
