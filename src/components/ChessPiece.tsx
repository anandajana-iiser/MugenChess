import React from 'react';
import { PieceType, PieceColor } from '../types/game';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'white';
  const fillColor = isWhite ? '#f8fafc' : '#0f172a';
  const strokeColor = isWhite ? '#334155' : '#cbd5e1';
  const accentColor = isWhite ? '#f59e0b' : '#38bdf8';

  // Specific custom styling for the Prince as requested:
  // Black Prince: Dark Red with NO borders (stroke="none")
  // White Prince: Navy Blue with NO borders (stroke="none")
  const princeFillColor = isWhite ? '#1e3a8a' : '#881337'; // Navy Blue for White, Dark Red for Black
  const princeAccentColor = isWhite ? '#60a5fa' : '#f87171';

  const renderSvgContent = () => {
    switch (type) {
      case 'pawn':
        return (
          <>
            <circle cx="12" cy="7" r="3" fill={fillColor} stroke={strokeColor} strokeWidth="0.75" />
            <path
              d="M8.5 18C8.5 13.5 10 11.5 12 11.5C14 11.5 15.5 13.5 15.5 18H8.5Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.75"
            />
            <path d="M7 20H17V21.5H7V20Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.6" />
          </>
        );

      case 'knight':
        return (
          <>
            <path
              d="M17.5 19H6.5V17C6.5 14 8 13.5 9 11.5C7.5 10.5 7.5 8 8.5 7C9.5 6 12 4.5 14.5 5.5C15.5 6 16.5 8 16 10C16 12 15 13 17 15C17.8 15.8 18 17.5 17.5 19Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            <circle cx="11" cy="8.5" r="1" fill={accentColor} />
            <path d="M5.5 20.5H18.5V22H5.5V20.5Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.6" />
          </>
        );

      case 'bishop':
        return (
          <>
            <path
              d="M12 4L15.5 7.5C17 10 17 13.5 15.5 16.5H8.5C7 13.5 7 10 8.5 7.5L12 4Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.75"
            />
            <circle cx="12" cy="3.5" r="1.5" fill={accentColor} />
            <path d="M12 8V12M10 10H14" stroke={strokeColor} strokeWidth="0.6" strokeLinecap="round" />
            <path d="M6.5 18.5H17.5V21H6.5V18.5Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.6" />
          </>
        );

      case 'rook':
        return (
          <>
            <path
              d="M6 7H9V9H11V7H13V9H15V7H18V10H16.5V17H18V19H6V17H7.5V10H6V7Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            <path d="M5 20H19V22H5V20Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.6" />
          </>
        );

      case 'queen':
        return (
          <>
            {/* Classic 5-pointed Queen Diadem Crown with Pearls */}
            <path
              d="M4 17L2.5 8L7 12L12 4.5L17 12L21.5 8L20 17H4Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            {/* 5 Distinct Queen Jewels on tips */}
            <circle cx="2.5" cy="7" r="1.4" fill={accentColor} />
            <circle cx="7" cy="11" r="1.3" fill={accentColor} />
            <circle cx="12" cy="3.5" r="1.6" fill={accentColor} />
            <circle cx="17" cy="11" r="1.3" fill={accentColor} />
            <circle cx="21.5" cy="7" r="1.4" fill={accentColor} />
            {/* Elegant Royal Crown Base Ring */}
            <path d="M4 18.5H20V21.5H4V18.5Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.65" />
          </>
        );

      case 'king':
        return (
          <>
            <path
              d="M6 16.5L4.5 8.5L8.5 12L12 7L15.5 12L19.5 8.5L18 16.5H6Z"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
            {/* King Cross */}
            <path d="M12 2.5V6M10.5 4H13.5" stroke={accentColor} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M5.5 18.5H18.5V21.5H5.5V18.5Z" fill={fillColor} stroke={strokeColor} strokeWidth="0.6" />
          </>
        );

      case 'prince':
        return (
          <>
            {/* Custom Prince: Solid fill with NO borders (stroke="none") */}
            {/* White side: Navy Blue; Black side: Dark Red */}
            <path
              d="M5 16L3 9L8 11.5L12 5.5L16 11.5L21 9L19 16H5Z"
              fill={princeFillColor}
              stroke="none"
            />
            {/* Royal Coronet Base Banner - NO borders */}
            <rect
              x="4"
              y="17"
              width="16"
              height="3.5"
              rx="1"
              fill={princeFillColor}
              stroke="none"
            />
            {/* Inner Prince Heraldic Insignia - subtle contrasting highlights */}
            <circle cx="12" cy="11" r="2" fill="#fbbf24" stroke="none" />
            <circle cx="3.5" cy="8" r="1.2" fill={princeAccentColor} stroke="none" />
            <circle cx="12" cy="4.5" r="1.4" fill={princeAccentColor} stroke="none" />
            <circle cx="20.5" cy="8" r="1.2" fill={princeAccentColor} stroke="none" />
            <path
              d="M9.5 14H14.5"
              stroke="#fbbf24"
              strokeWidth="0.75"
              strokeLinecap="round"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} drop-shadow-sm select-none pointer-events-none transition-transform duration-150`}
    >
      {renderSvgContent()}
    </svg>
  );
};
