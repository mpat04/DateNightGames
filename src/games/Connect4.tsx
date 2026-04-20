import { useState, useEffect } from 'react';
import { getSocket } from '../socket';

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

type Cell = 0 | 1 | 2;
type Board = Cell[][];

interface Connect4Props {
  roomId: string;
}

export default function Connect4({ roomId }: Connect4Props) {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(PLAYER1);
  const [winner, setWinner] = useState<Cell>(0);
  const [isMyTurn, setIsMyTurn] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('opponent-move', (move: { col: number; player: number }) => {
      handleMove(move.col, move.player as Player);
      setIsMyTurn(true);
    });

    return () => {
      socket.off('opponent-move');
    };
  }, [board, currentPlayer]);

  function createEmptyBoard(): Board {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
  }

  function handleMove(col: number, player: Player) {
    const newBoard = board.map(row => [...row]);

    for (let row = ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] === EMPTY) {
        newBoard[row][col] = player;
        break;
      }
    }

    setBoard(newBoard);

    const winPlayer = checkWin(newBoard, player);
    if (winPlayer) {
      setWinner(winPlayer);
    } else {
      setCurrentPlayer(player === PLAYER1 ? PLAYER2 : PLAYER1);
    }
  }

  function onColumnClick(col: number) {
    if (winner || !isMyTurn) return;
    if (board[0][col] !== EMPTY) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('game-move', {
        roomId,
        move: { col, player: currentPlayer }
      });
    }

    handleMove(col, currentPlayer);
    setIsMyTurn(false);
  }

  function checkWin(board: Board, player: Player): Player | null {
    // Horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if (board[row].slice(col, col + 4).every(c => c === player)) {
          return player;
        }
      }
    }

    // Vertical
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row <= ROWS - 4; row++) {
        if ([0, 1, 2, 3].every(offset => board[row + offset][col] === player)) {
          return player;
        }
      }
    }

    // Diagonal (positive slope)
    for (let row = 3; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if ([0, 1, 2, 3].every(offset => board[row - offset][col + offset] === player)) {
          return player;
        }
      }
    }

    // Diagonal (negative slope)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if ([0, 1, 2, 3].every(offset => board[row + offset][col + offset] === player)) {
          return player;
        }
      }
    }

    return null;
  }

  const isDraw = !winner && board.every(row => row.every(cell => cell !== EMPTY));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Connect 4</h2>
        {winner ? (
          <p className={`text-xl font-bold ${winner === PLAYER1 ? 'text-blue-400' : 'text-red-400'}`}>
            Player {winner} Wins!
          </p>
        ) : isDraw ? (
          <p className="text-xl font-bold text-yellow-400">It's a Draw!</p>
        ) : (
          <p className="text-purple-200">
            {isMyTurn ? "Your turn" : "Opponent's turn"} -
            <span className={currentPlayer === PLAYER1 ? 'text-blue-400' : 'text-red-400'}>
              {' '}Player {currentPlayer}
            </span>
          </p>
        )}
      </div>

      <div className="bg-blue-800 rounded-xl p-4 shadow-2xl">
        <div className="grid grid-cols-7 gap-2">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => onColumnClick(colIndex)}
                disabled={!!winner || !isMyTurn || cell !== EMPTY}
                className={`
                  aspect-square rounded-full w-10 h-10 md:w-14 md:h-14
                  transition-all duration-300
                  ${cell === EMPTY
                    ? 'bg-blue-900/50 hover:bg-blue-700/50 cursor-pointer'
                    : cell === PLAYER1
                      ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg'
                      : 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg'
                  }
                  ${!winner && isMyTurn && cell === EMPTY ? 'hover:scale-110' : ''}
                `}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
          <span className="text-white">Player 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-red-600"></div>
          <span className="text-white">Player 2</span>
        </div>
      </div>
    </div>
  );
}
