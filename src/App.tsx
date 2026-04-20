import { useState, useEffect } from 'react';
import { connectSocket, getSocket } from './socket';
import Connect4 from './games/Connect4';
import MemoryMatch from './games/MemoryMatch';

type GameState = 'lobby' | 'waiting' | 'playing';
type GameType = 'connect4' | 'chess' | 'memory' | 'wordscramble' | 'pong';

function App() {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameType, setGameType] = useState<GameType>('connect4');
  const [error, setError] = useState('');

  useEffect(() => {
    const socket = connectSocket();

    socket.on('room-ready', ({ gameType }: { gameType: GameType }) => {
      setGameType(gameType);
      setGameState('playing');
    });

    socket.on('player-left', () => {
      setGameState('lobby');
      setError('Your opponent left the game');
    });

    return () => {
      socket.off('room-ready');
      socket.off('player-left');
    };
  }, []);

  const createRoom = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('create-room', gameType, ({ roomId }: { roomId: string }) => {
      setRoomId(roomId);
      setGameState('waiting');
    });
  };

  const joinRoom = () => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join-room', joinCode.toUpperCase(), (result: { error?: string; success?: boolean; gameType?: GameType }) => {
      if (result.error) {
        setError(result.error);
      } else {
        setGameType(result.gameType!);
        setGameState('playing');
      }
    });
  };

  const leaveRoom = () => {
    setGameState('lobby');
    setRoomId('');
    setJoinCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Date Night Games</h1>
          <p className="text-purple-200">Connect and play together</p>
        </header>

        {gameState === 'lobby' && (
          <div className="max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Create or Join a Game</h2>

            <div className="mb-6">
              <label className="block text-purple-200 mb-2">Select Game</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white border border-purple-400/30 focus:outline-none focus:border-purple-400"
              >
                <option value="connect4">Connect 4</option>
                <option value="chess">Chess</option>
                <option value="memory">Memory Match</option>
                <option value="wordscramble">Word Scramble</option>
                <option value="pong">Pong</option>
              </select>
            </div>

            <button
              onClick={createRoom}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition mb-4"
            >
              Create Room
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-purple-400/30"></div>
              <span className="px-4 text-purple-300">or</span>
              <div className="flex-1 border-t border-purple-400/30"></div>
            </div>

            <div className="mb-4">
              <label className="block text-purple-200 mb-2">Join with Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white border border-purple-400/30 focus:outline-none focus:border-purple-400 uppercase tracking-widest text-center"
                />
                <button
                  onClick={joinRoom}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Join
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-center mt-4">{error}</p>
            )}
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Waiting for Opponent</h2>
            <p className="text-purple-200 mb-4">Share this code with your friend:</p>
            <div className="bg-white/20 rounded-lg p-4 mb-6">
              <span className="text-4xl font-bold text-white tracking-widest">{roomId}</span>
            </div>
            <button
              onClick={leaveRoom}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div>
            <div className="text-center mb-4">
              <span className="text-purple-200">Room: </span>
              <span className="text-white font-bold tracking-widest">{roomId}</span>
              <button
                onClick={leaveRoom}
                className="ml-4 text-red-400 hover:text-red-300 underline"
              >
                Leave Game
              </button>
            </div>
            {gameType === 'connect4' && <Connect4 roomId={roomId} />}
            {gameType === 'chess' && <div className="text-white text-center">Chess - Coming Soon</div>}
            {gameType === 'memory' && <MemoryMatch roomId={roomId} />}
            {gameType === 'wordscramble' && <div className="text-white text-center">Word Scramble - Coming Soon</div>}
            {gameType === 'pong' && <div className="text-white text-center">Pong - Coming Soon</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
