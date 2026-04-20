import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';

const WORDS = [
  'PUZZLE', 'GARDEN', 'PLANET', 'ROCKET', 'SUMMER',
  'WINTER', 'OCEAN', 'MOUNTAIN', 'FOREST', 'DESERT',
  'GUITAR', 'PIANO', 'VIOLIN', 'DRUMS', 'TRUMPET',
  'COFFEE', 'CHOCOLATE', 'PANCAKE', 'SANDWICH', 'PASTA',
  'TIGER', 'ELEPHANT', 'DOLPHIN', 'PENGUIN', 'BUTTERFLY',
  'RAINBOW', 'THUNDER', 'LIGHTNING', 'TORNADO', 'HURRICANE',
  'DIAMOND', 'EMERALD', 'SAPPHIRE', 'RUBY', 'TOPAZ',
  'SOCCER', 'BASKETBALL', 'TENNIS', 'BASEBALL', 'HOCKEY'
];

interface WordScrambleProps {
  roomId: string;
}

export default function WordScramble({ roomId }: WordScrambleProps) {
  const [scrambledWord, setScrambledWord] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [playerGuess, setPlayerGuess] = useState('');
  const [opponentGuess, setOpponentGuess] = useState('');
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Unscramble the word!');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startNewRound();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('opponent-move', (data: { guess: string; correct: boolean }) => {
      setOpponentGuess(data.guess);
      if (data.correct) {
        setOpponentScore(prev => prev + 1);
        setMessage('Opponent scored!');
        setIsProcessing(true);
        setTimeout(() => {
          startNewRound();
          setIsProcessing(false);
        }, 1500);
      }
    });

    return () => {
      socket.off('opponent-move');
    };
  }, []);

  useEffect(() => {
    if (inputRef.current && !gameOver && !isProcessing) {
      inputRef.current.focus();
    }
  }, [scrambledWord, gameOver, isProcessing]);

  function scrambleWord(word: string): string {
    const letters = word.split('');
    let scrambled = word;
    while (scrambled === word) {
      scrambled = letters.sort(() => Math.random() - 0.5).join('');
    }
    return scrambled;
  }

  function startNewRound() {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setCurrentWord(randomWord);
    setScrambledWord(scrambleWord(randomWord));
    setPlayerGuess('');
    setOpponentGuess('');
    setMessage('Unscramble the word!');
  }

  function handleGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!playerGuess.trim() || isProcessing) return;

    const guess = playerGuess.toUpperCase().trim();
    const socket = getSocket();

    if (guess === currentWord) {
      setPlayerScore(prev => prev + 1);
      setMessage('Correct! +1 Point');
      setIsProcessing(true);

      if (socket) {
        socket.emit('game-move', {
          roomId,
          move: { guess: '', correct: false }
        });
      }

      setTimeout(() => {
        if (round >= 10) {
          setGameOver(true);
        } else {
          setRound(prev => prev + 1);
          startNewRound();
        }
        setIsProcessing(false);
      }, 1500);
    } else {
      setMessage('Try again!');
      setPlayerGuess('');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z]*$/.test(value)) {
      setPlayerGuess(value);
    }
  }

  const winner = gameOver
    ? playerScore > opponentScore ? 'You Win!'
    : opponentScore > playerScore ? 'Opponent Wins!'
    : "It's a Draw!"
    : null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">Word Scramble</h2>

        <div className="flex justify-center gap-8 mb-6">
          <div className="px-6 py-3 rounded-lg bg-green-500/30 border-2 border-green-400">
            <span className="text-white font-bold">You: {playerScore}</span>
          </div>
          <div className="px-6 py-3 rounded-lg bg-purple-500/30">
            <span className="text-white font-bold">Opponent: {opponentScore}</span>
          </div>
        </div>

        <div className="text-purple-300 mb-4">Round {round} of 10</div>

        {gameOver ? (
          <p className="text-2xl font-bold text-yellow-400 mb-4">{winner}</p>
        ) : (
          <p className={`text-lg mb-4 ${message.includes('Correct') ? 'text-green-400' : message.includes('Opponent') ? 'text-red-400' : 'text-white'}`}>
            {message}
          </p>
        )}
      </div>

      {!gameOver && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl md:text-6xl font-bold text-white tracking-widest mb-2">
              {scrambledWord.split('').map((letter, i) => (
                <span
                  key={i}
                  className="inline-block w-10 md:w-14 animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleGuess} className="flex gap-4">
            <input
              ref={inputRef}
              type="text"
              value={playerGuess}
              onChange={handleInputChange}
              placeholder="Type your answer..."
              maxLength={10}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white text-center text-xl tracking-widest uppercase border border-purple-400/30 focus:outline-none focus:border-purple-400"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!playerGuess.trim() || isProcessing}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-700/50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Guess
            </button>
          </form>

          {opponentGuess && (
            <div className="text-center mt-4 text-purple-300">
              Opponent is thinking...
            </div>
          )}
        </div>
      )}

      {gameOver && (
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            Play Again
          </button>
        </div>
      )}

      <p className="text-center text-purple-300 text-sm mt-4">
        First to unscramble gets the point. Most points after 10 rounds wins!
      </p>
    </div>
  );
}
