import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { AvatarDisplay, AVATAR_OPTIONS } from './Avatars';
import { UserProfile, MatchState, Challenge } from '../types/game';
import {
  Crown,
  Search,
  Swords,
  Play,
  RotateCcw,
  BookOpen,
  LogOut,
  Clock,
  Trophy,
  X,
  CheckCircle2,
  AlertCircle,
  Bot,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  onOpenRules: () => void;
  onOpenBotModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenRules, onOpenBotModal }) => {
  const { user, token, logout, updateProfile } = useAuth();
  const {
    onlineUserIds,
    sendChallenge,
    cancelChallenge,
    joinMatch,
    matchError,
    clearMatchError,
  } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);
  const [outgoingChallenges, setOutgoingChallenges] = useState<Challenge[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatarId || 'avatar_prince');
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  // Fetch players on mount or search
  useEffect(() => {
    async function fetchPlayers() {
      if (!token) return;
      setIsLoadingPlayers(true);
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players || []);
        }
      } catch (err) {
        console.error('Failed to search players:', err);
      } finally {
        setIsLoadingPlayers(false);
      }
    }

    const timer = setTimeout(fetchPlayers, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Fetch active matches & outgoing challenges
  const refreshUserData = async () => {
    if (!token) return;
    try {
      const [matchesRes, challengesRes] = await Promise.all([
        fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/challenges', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setActiveMatches(data.matches || []);
      }
      if (challengesRes.ok) {
        const data = await challengesRes.json();
        setOutgoingChallenges(data.outgoing || []);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  useEffect(() => {
    refreshUserData();
    const interval = setInterval(refreshUserData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const [challengeTimeControl, setChallengeTimeControl] = useState<120 | 300>(300);
  const [challengeMoveSuggestions, setChallengeMoveSuggestions] = useState<'included' | 'excluded'>('included');

  const handleChallengePlayer = (targetUserId: string, targetName: string) => {
    sendChallenge(targetUserId, challengeTimeControl, challengeMoveSuggestions);
    setSentNotice(
      `Challenge (${challengeTimeControl === 120 ? '2m' : '5m'}, hints ${challengeMoveSuggestions}) sent to ${targetName}!`
    );
    setTimeout(() => setSentNotice(null), 4000);
    setTimeout(refreshUserData, 500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(editName, editAvatar);
    setIsEditingProfile(false);
  };

  if (!user) return null;

  const ongoingMatches = activeMatches.filter((m) => m.status === 'active');
  const pastMatches = activeMatches.filter((m) => m.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0a0e14] text-slate-100 flex flex-col">
      {/* Top Bar Contract (1-line Brand wordmark, 4 concise links, 1 primary action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-[#12161f]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            Custom Dice Chess
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <a href="#matches" className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0">
            Active Matches ({ongoingMatches.length})
          </a>
          <a href="#players" className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0">
            Find Players
          </a>
          <button
            onClick={onOpenRules}
            className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Rules
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AvatarDisplay avatarId={user.avatarId} size="sm" />
            <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
              {user.displayName}
            </span>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Card & Outgoing Challenges (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* User Profile Card */}
          <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AvatarDisplay avatarId={user.avatarId} size="lg" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">{user.displayName}</h3>
                  <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditName(user.displayName);
                  setEditAvatar(user.avatarId);
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                {isEditingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Profile Edit Mode */}
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Avatar</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setEditAvatar(av.id)}
                        className={`p-1 rounded-lg flex justify-center cursor-pointer ${
                          editAvatar === av.id ? 'ring-2 ring-amber-400 bg-amber-500/10' : 'opacity-60'
                        }`}
                      >
                        <AvatarDisplay avatarId={av.id} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </form>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-center">
                <div className="bg-[#0d1117] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-bold font-mono text-emerald-400">{user.stats.wins}</span>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Wins</p>
                </div>
                <div className="bg-[#0d1117] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-bold font-mono text-slate-300">{user.stats.losses}</span>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Losses</p>
                </div>
                <div className="bg-[#0d1117] p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-bold font-mono text-amber-400">{user.stats.draws}</span>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Draws</p>
                </div>
              </div>
            )}
          </div>

          {/* Outgoing Challenges */}
          {outgoingChallenges.length > 0 && (
            <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Outgoing Invitations ({outgoingChallenges.length})
              </h4>
              <div className="space-y-2.5">
                {outgoingChallenges.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-2.5 bg-[#0d1117] rounded-xl border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AvatarDisplay avatarId={ch.challenged.avatarId} size="sm" />
                      <div>
                        <span className="font-semibold text-slate-200 block truncate max-w-[130px]">
                          {ch.challenged.displayName}
                        </span>
                        <span className="text-[10px] text-slate-500">Waiting for response...</span>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelChallenge(ch.id)}
                      className="px-2 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Rules Summary Card */}
          <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-5 shadow-sm text-xs text-slate-300 space-y-2.5">
            <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              Game Highlights
            </h4>
            <p className="text-slate-400 leading-relaxed">
              · <strong>Dice rolls (1-6):</strong> Rolls 1-3 move Inexpensive pieces (Knights/Bishops); 4-6 move Expensive pieces (Rooks, Queens, Princes, Kings, Pawns).
            </p>
            <p className="text-slate-400 leading-relaxed">
              · <strong>Free Pass Fallback:</strong> If no piece in the rolled category can move, any legal move on the board unlocks!
            </p>
            <p className="text-slate-400 leading-relaxed">
              · <strong>Two-Pawn Draw:</strong> Either player landing 2 pawns on the enemy back rank draws immediately.
            </p>
            <button
              onClick={onOpenRules}
              className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Open Full Rulebook
            </button>
          </div>
        </div>

        {/* Right / Center Column: Active Matches & Find Players (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Notifications / Errors */}
          {matchError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{matchError}</span>
              </div>
              <button onClick={clearMatchError} className="p-1 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {sentNotice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sentNotice}</span>
            </div>
          )}

          {/* Instant Grandmaster Bot Challenge Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-[#161b22] to-amber-500/5 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">Play vs Grandmaster Bot</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Instant
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top-level minimax engine with Prince tactical analysis. No matchmaking required!
                </p>
              </div>
            </div>

            <button
              onClick={onOpenBotModal}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              Play vs Bot
            </button>
          </div>

          {/* Active / Ongoing Matches Section */}
          <section id="matches">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400" />
                Active Matches ({ongoingMatches.length})
              </h3>
              <button
                onClick={refreshUserData}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {ongoingMatches.length === 0 ? (
              <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
                No active games currently. Search for a player below to issue a challenge!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ongoingMatches.map((m) => {
                  const isWhite = m.whitePlayer.userId === user.id;
                  const opponent = isWhite ? m.blackPlayer : m.whitePlayer;
                  const isMyTurn = (isWhite && m.turn === 'white') || (!isWhite && m.turn === 'black');

                  return (
                    <div
                      key={m.id}
                      className="bg-[#161b22] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <AvatarDisplay avatarId={opponent.avatarId} size="md" />
                          <div>
                            <span className="font-semibold text-sm text-slate-100 block">
                              vs {opponent.displayName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Playing as {isWhite ? 'White' : 'Black'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                            isMyTurn
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                        </span>
                      </div>

                      <button
                        onClick={() => joinMatch(m.id)}
                        className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Enter Match Room
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Find & Challenge Players Section */}
          <section id="players">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-400" />
                Find Players to Challenge
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#161b22] border border-slate-800 p-1 rounded-xl text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 px-1.5">Timer:</span>
                  <button
                    type="button"
                    onClick={() => setChallengeTimeControl(300)}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      challengeTimeControl === 300
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⏱️ 5m
                  </button>
                  <button
                    type="button"
                    onClick={() => setChallengeTimeControl(120)}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      challengeTimeControl === 120
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ 2m
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-[#161b22] border border-slate-800 p-1 rounded-xl text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 px-1.5">Move Hints:</span>
                  <button
                    type="button"
                    onClick={() => setChallengeMoveSuggestions('included')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      challengeMoveSuggestions === 'included'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Included: show valid destination hints on piece click"
                  >
                    Included
                  </button>
                  <button
                    type="button"
                    onClick={() => setChallengeMoveSuggestions('excluded')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      challengeMoveSuggestions === 'excluded'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Excluded: hide destination hint circles"
                  >
                    Excluded
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-500 absolute top-1/2 left-3.5 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered players by username or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#161b22] border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {isLoadingPlayers ? (
                <div className="p-8 text-center text-xs text-slate-500">Searching players...</div>
              ) : players.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {searchQuery ? 'No registered players found matching that name.' : 'No other players registered yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {players.map((p) => {
                    const isOnline = onlineUserIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 flex items-center justify-between hover:bg-[#13171f] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <AvatarDisplay avatarId={p.avatarId} size="md" />
                            {isOnline && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#161b22]"
                                title="Online now"
                              />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-100 block">
                              {p.displayName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              @{p.username} · {p.stats.wins}W / {p.stats.losses}L / {p.stats.draws}D
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleChallengePlayer(p.id, p.displayName)}
                          className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          Challenge
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Recent Match History Section */}
          {pastMatches.length > 0 && (
            <section id="history">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Recent Match History
              </h3>
              <div className="bg-[#161b22] border border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-800/80">
                {pastMatches.map((m) => {
                  const isWhite = m.whitePlayer.userId === user.id;
                  const opponent = isWhite ? m.blackPlayer : m.whitePlayer;
                  const isWinner =
                    (m.result?.winner === 'white' && isWhite) ||
                    (m.result?.winner === 'black' && !isWhite);
                  const isDraw = m.result?.winner === 'draw';

                  let badgeColor = 'bg-slate-800 text-slate-400';
                  let label = 'Defeat';
                  if (isWinner) {
                    badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                    label = 'Victory';
                  } else if (isDraw) {
                    badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                    label = m.result?.reason === 'two_pawns_end_rank_draw' ? '2-Pawn Draw' : 'Draw';
                  }

                  return (
                    <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <AvatarDisplay avatarId={opponent.avatarId} size="sm" />
                        <div>
                          <span className="font-semibold text-slate-200">vs {opponent.displayName}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(m.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${badgeColor}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
