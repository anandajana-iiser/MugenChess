import React from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  color: string;
  svg: React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'avatar_prince',
    name: 'Royal Prince',
    color: 'from-amber-500 to-amber-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar_king',
    name: 'Sovereign King',
    color: 'from-purple-500 to-indigo-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 19H19V21H5V19Z" fill="currentColor"/>
        <circle cx="12" cy="10" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar_queen',
    name: 'Valorous Queen',
    color: 'from-rose-500 to-pink-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M4 17L2 7L7 11L12 5L17 11L22 7L20 17H4Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 19H18V21H6V19Z" fill="currentColor"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar_knight',
    name: 'Noble Knight',
    color: 'from-blue-500 to-cyan-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M19 19H5V17C5 14 7 13 8 11C7 10 7 8 8 7L11 4C14 4 16 6 16 9C16 11 15 12 17 14L19 15V19Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="10" cy="8" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar_rook',
    name: 'Castle Bastion',
    color: 'from-emerald-500 to-teal-700',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M4 20H20V17H18V10H19V4H16V6H14V4H10V6H8V4H5V10H6V17H4V20Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 13H15V17H9V13Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'avatar_bishop',
    name: 'Mystic Bishop',
    color: 'from-amber-600 to-orange-800',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
        <path d="M12 2L15 5C17 8 17 12 15 15H9C7 12 7 8 9 5L12 2Z" fill="currentColor" fillOpacity="0.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7V11M10 9H14" strokeLinecap="round"/>
        <path d="M6 19H18V21H6V19Z" fill="currentColor"/>
      </svg>
    ),
  },
];

export const AvatarDisplay: React.FC<{ avatarId: string; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  avatarId,
  size = 'md',
}) => {
  const avatar = AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];

  const sizeClasses = {
    sm: 'w-7 h-7 p-1',
    md: 'w-10 h-10 p-1.5',
    lg: 'w-14 h-14 p-2',
    xl: 'w-20 h-20 p-3',
  }[size];

  return (
    <div
      className={`${sizeClasses} rounded-xl bg-gradient-to-br ${avatar.color} text-white shadow-sm flex items-center justify-center shrink-0 border border-white/10`}
      title={avatar.name}
    >
      {avatar.svg}
    </div>
  );
};
