import React, { useState } from 'react';
import { Piece, Position, Move, PieceColor, DiceState } from '../types/game';
import { ChessPiece } from './ChessPiece';
import { getLegalMovesForSquare, getDiceEligibleMoves, getAllLegalMoves } from '../game/engine';

interface ChessBoardProps {
  board: (Piece | null)[][];
  turn: PieceColor;
  myColor: PieceColor;
  dice: DiceState | null;
  lastMove?: Move;
  inCheck: PieceColor | null;
  isInteractive: boolean;
  onMove: (from: Position, to: Position) => void;
  flipped?: boolean;
  showMoveSuggestions?: boolean;
  diceActive?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  turn,
  myColor,
  dice,
  lastMove,
  inCheck,
  isInteractive,
  onMove,
  flipped = false,
  showMoveSuggestions = true,
  diceActive = true,
}) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  // Compute eligible pieces for current roll, normal chess (diceActive=false), or check escape
  const isDiceActive = diceActive ?? true;
  const isMyTurn = turn === myColor;
  const isPlayerInCheck = inCheck === turn;
  const hasDiceRolled = dice && !dice.isConsumed;

  const { eligibleMoves } =
    isMyTurn && (!isDiceActive || hasDiceRolled || isPlayerInCheck)
      ? (!isDiceActive || isPlayerInCheck)
        ? { eligibleMoves: getAllLegalMoves(board, turn) }
        : getDiceEligibleMoves(board, turn, dice, inCheck)
      : { eligibleMoves: [] };

  // Set of square keys "x,y" that have eligible pieces
  const eligibleSquares = new Set<string>();
  if (isMyTurn && (!isDiceActive || hasDiceRolled || isPlayerInCheck)) {
    for (const m of eligibleMoves) {
      eligibleSquares.add(`${m.from.x},${m.from.y}`);
    }
  }

  // Legal moves for currently selected piece
  const selectedLegalMoves: Move[] = selectedPos
    ? eligibleMoves.filter(
        (m) => m.from.x === selectedPos.x && m.from.y === selectedPos.y
      )
    : [];

  const handleSquareClick = (x: number, y: number) => {
    if (!isInteractive || !isMyTurn || (isDiceActive && !hasDiceRolled && !isPlayerInCheck)) return;

    // If already clicked a piece and clicked on a valid destination
    if (selectedPos) {
      const targetMove = selectedLegalMoves.find((m) => m.to.x === x && m.to.y === y);
      if (targetMove) {
        onMove(selectedPos, { x, y });
        setSelectedPos(null);
        return;
      }
    }

    // Otherwise, select piece if it is friendly and has eligible moves
    const piece = board[y][x];
    if (piece && piece.color === myColor) {
      if (eligibleSquares.has(`${x},${y}`)) {
        setSelectedPos({ x, y });
      } else {
        setSelectedPos(null);
      }
    } else {
      setSelectedPos(null);
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Display ranks and files based on perspective
  const displayYIndices = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const displayXIndices = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[540px]">
      <div className="relative w-full aspect-square p-2 sm:p-3 bg-[#1e2530] border-2 border-slate-700/80 rounded-2xl shadow-2xl">
        {/* 8x8 Board Grid */}
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-lg overflow-hidden border border-slate-700">
          {displayYIndices.map((y) =>
            displayXIndices.map((x) => {
              const piece = board[y][x];
              const isLight = (x + y) % 2 === 1;
              const isSelected = selectedPos?.x === x && selectedPos?.y === y;
              const isEligiblePiece = eligibleSquares.has(`${x},${y}`);

              const targetMove = selectedLegalMoves.find((m) => m.to.x === x && m.to.y === y);
              const isTargetMove = Boolean(targetMove);
              const isCaptureTarget = isTargetMove && Boolean(piece);

              const isLastMoveFrom = lastMove?.from.x === x && lastMove?.from.y === y;
              const isLastMoveTo = lastMove?.to.x === x && lastMove?.to.y === y;

              const isKingInCheckSquare =
                inCheck && piece?.type === 'king' && piece.color === inCheck;

              // Square background styling
              let squareBg = isLight ? 'bg-[#94a3b8]' : 'bg-[#334155]';
              if (isLastMoveFrom || isLastMoveTo) {
                squareBg = isLight ? 'bg-[#bbf7d0]' : 'bg-[#15803d]/60';
              }
              if (isSelected) {
                squareBg = 'bg-amber-400/80';
              }
              if (isKingInCheckSquare) {
                squareBg = 'bg-rose-600/90';
              }

              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => handleSquareClick(x, y)}
                  className={`relative flex items-center justify-center p-1 cursor-pointer transition-colors ${squareBg} focus:outline-none`}
                >
                  {/* File/Rank Coordinate Labels on edges */}
                  {x === displayXIndices[0] && (
                    <span
                      className={`absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-bold font-mono pointer-events-none ${
                        isLight ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {ranks[y]}
                    </span>
                  )}
                  {y === displayYIndices[displayYIndices.length - 1] && (
                    <span
                      className={`absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-bold font-mono pointer-events-none ${
                        isLight ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {files[x]}
                    </span>
                  )}

                  {/* Piece Graphic */}
                  {piece && (
                    <div
                      className={`w-full h-full flex items-center justify-center relative ${
                        isEligiblePiece && !isSelected
                          ? 'after:absolute after:bottom-1 after:w-2 after:h-2 after:bg-amber-400 after:rounded-full after:shadow-sm'
                          : ''
                      }`}
                    >
                      <ChessPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* EDIT 1: Legal move destination indicator - soft orange tint (hidden if Move Suggestions is Excluded) */}
                  {showMoveSuggestions && isTargetMove && !isCaptureTarget && (
                    <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500/80 shadow-md ring-2 ring-amber-300/40 pointer-events-none" />
                  )}

                  {/* EDIT 1: Capture target indicator - visually distinct with soft rose overlay (hidden if Move Suggestions is Excluded) */}
                  {showMoveSuggestions && isCaptureTarget && (
                    <div className="absolute inset-0 border-2 sm:border-3 border-rose-500 rounded-sm pointer-events-none animate-pulse bg-rose-500/20 ring-1 ring-rose-400/50" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
