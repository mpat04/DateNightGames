import { useState, useEffect } from 'react';
import { getSocket } from '../socket';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';
type Board = (PieceType | null)[][];
type Position = { row: number; col: number };

const PIECES: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const INITIAL_BOARD: Board = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

interface ChessProps {
  roomId: string;
}

export default function Chess({ roomId }: ChessProps) {
  const [board, setBoard] = useState<Board>(() =>
    INITIAL_BOARD.map(row => [...row])
  );
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('opponent-move', (data: { from: Position; to: Position }) => {
      makeMove(data.from, data.to);
      setIsMyTurn(true);
    });

    return () => {
      socket.off('opponent-move');
    };
  }, [board, currentPlayer]);

  function isWhitePiece(piece: PieceType | null): boolean {
    return piece !== null && piece === piece.toUpperCase();
  }

  function isBlackPiece(piece: PieceType | null): boolean {
    return piece !== null && piece === piece.toLowerCase();
  }

  function isCurrentPlayerPiece(piece: PieceType | null): boolean {
    if (!piece) return false;
    return currentPlayer === 'white' ? isWhitePiece(piece) : isBlackPiece(piece);
  }

  function isOpponentPiece(piece: PieceType | null): boolean {
    if (!piece) return false;
    return currentPlayer === 'white' ? isBlackPiece(piece) : isWhitePiece(piece);
  }

  function getValidMoves(pos: Position): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];

    const moves: Position[] = [];
    const type = piece.toLowerCase();
    const directions: Record<string, number[][]> = {
      'p': [],
      'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
      'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
      'b': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
      'q': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
      'k': [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    };

    const addMoveIfValid = (row: number, col: number): boolean => {
      if (row < 0 || row > 7 || col < 0 || col > 7) return false;
      const target = board[row][col];
      if (!target) {
        moves.push({ row, col });
        return true;
      }
      if (isOpponentPiece(target)) {
        moves.push({ row, col });
      }
      return false;
    };

    if (type === 'p') {
      const direction = currentPlayer === 'white' ? -1 : 1;
      const startRow = currentPlayer === 'white' ? 6 : 1;

      const newRow = pos.row + direction;
      if (newRow >= 0 && newRow <= 7 && !board[newRow][pos.col]) {
        moves.push({ row: newRow, col: pos.col });
        if (pos.row === startRow) {
          const doubleRow = pos.row + 2 * direction;
          if (!board[doubleRow][pos.col]) {
            moves.push({ row: doubleRow, col: pos.col });
          }
        }
      }

      [-1, 1].forEach(dc => {
        const newCol = pos.col + dc;
        const newRow = pos.row + direction;
        if (newCol >= 0 && newCol <= 7 && newRow >= 0 && newRow <= 7) {
          const target = board[newRow][newCol];
          if (target && isOpponentPiece(target)) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      });
    } else if (type === 'n' || type === 'k') {
      directions[type].forEach(([dr, dc]) => {
        addMoveIfValid(pos.row + dr, pos.col + dc);
      });
    } else {
      directions[type].forEach(([dr, dc]) => {
        let newRow = pos.row + dr;
        let newCol = pos.col + dc;
        while (addMoveIfValid(newRow, newCol)) {
          newRow += dr;
          newCol += dc;
        }
      });
    }

    return moves;
  }

  function handleSquareClick(pos: Position) {
    if (!isMyTurn || gameOver) return;

    const piece = board[pos.row][pos.col];

    if (selectedPos) {
      const isValidMove = validMoves.some(m => m.row === pos.row && m.col === pos.col);

      if (isValidMove) {
        makeMove(selectedPos, pos);

        const socket = getSocket();
        if (socket) {
          socket.emit('game-move', {
            roomId,
            move: { from: selectedPos, to: pos }
          });
        }

        setSelectedPos(null);
        setValidMoves([]);
        return;
      }
    }

    if (isCurrentPlayerPiece(piece)) {
      setSelectedPos(pos);
      setValidMoves(getValidMoves(pos));
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  }

  function makeMove(from: Position, to: Position) {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.row][from.col];
    const captured = newBoard[to.row][to.col];

    if (captured) {
      if (captured === 'k' || captured === 'K') {
        setGameOver(true);
        setWinner(currentPlayer === 'white' ? 'White' : 'Black');
      } else {
        if (isWhitePiece(captured)) {
          setCapturedBlack(prev => [...prev, PIECES[captured]]);
        } else {
          setCapturedWhite(prev => [...prev, PIECES[captured]]);
        }
      }
    }

    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    if (piece === 'P' && to.row === 0) {
      newBoard[to.row][to.col] = 'Q';
    } else if (piece === 'p' && to.row === 7) {
      newBoard[to.row][to.col] = 'q';
    }

    setBoard(newBoard);
    setCurrentPlayer(prev => prev === 'white' ? 'black' : 'white');
    setIsMyTurn(false);
  }

  function resetGame() {
    setBoard(INITIAL_BOARD.map(row => [...row]));
    setSelectedPos(null);
    setCurrentPlayer('white');
    setValidMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setIsMyTurn(true);
    setGameOver(false);
    setWinner(null);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-4">Chess</h2>

        <div className="flex justify-center items-center gap-4 mb-4">
          <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'white' && isMyTurn ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-400'}`}>
            White
          </div>
          <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'black' && isMyTurn ? 'bg-gray-900 text-white' : 'bg-gray-700 text-gray-400'}`}>
            Black
          </div>
        </div>

        {gameOver ? (
          <p className="text-2xl font-bold text-yellow-400 mb-4">{winner} Wins!</p>
        ) : (
          <p className={`text-lg ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
            {isMyTurn ? "Your turn" : "Opponent's turn"} - {currentPlayer === 'white' ? 'White' : 'Black'}
          </p>
        )}
      </div>

      <div className="flex justify-center gap-2 mb-4">
        <div className="text-purple-300 text-sm">
          Captured: {capturedWhite.length > 0 ? capturedWhite.join(' ') : 'None'}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="inline-block border-4 border-amber-800 rounded-lg shadow-2xl">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((piece, colIndex) => {
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selectedPos?.row === rowIndex && selectedPos?.col === colIndex;
                const isValidMove = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
                const isCapture = isValidMove && piece !== null;

                return (
                  <button
                    key={colIndex}
                    onClick={() => handleSquareClick({ row: rowIndex, col: colIndex })}
                    disabled={!isMyTurn || gameOver}
                    className={`
                      w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-3xl md:text-4xl
                      transition-all duration-150
                      ${isLight ? 'bg-amber-200' : 'bg-amber-700'}
                      ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
                      ${isValidMove && !isCapture ? 'after:content-[""] after:w-4 after:h-4 after:bg-green-500/50 after:rounded-full' : ''}
                      ${isCapture ? 'ring-4 ring-red-500 ring-inset' : ''}
                      ${!isMyTurn || gameOver ? 'cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}
                      ${piece && isWhitePiece(piece) ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}
                    `}
                  >
                    {piece ? PIECES[piece] : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <div className="text-purple-300 text-sm">
          Captured: {capturedBlack.length > 0 ? capturedBlack.join(' ') : 'None'}
        </div>
      </div>

      {gameOver && (
        <div className="text-center mt-6">
          <button
            onClick={resetGame}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            Play Again
          </button>
        </div>
      )}

      <p className="text-center text-purple-300 mt-4 text-sm">
        Capture the king to win! Click a piece to select, then click a highlighted square to move.
      </p>
    </div>
  );
}
