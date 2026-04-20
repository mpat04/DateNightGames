import { useState, useEffect } from 'react';
import { getSocket } from '../socket';

const CARD_PAIRS = 8;
const EMOJIS = ['🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎸', '🎺'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchProps {
  roomId: string;
}

export default function MemoryMatch({ roomId }: MemoryMatchProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeCards();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('opponent-move', (data: { cardId: number; matched: boolean }) => {
      setCards(prev => prev.map(card =>
        card.id === data.cardId ? { ...card, isFlipped: true } : card
      ));

      if (data.matched) {
        setPlayer2Score(prev => prev + 1);
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === data.cardId ? { ...card, isMatched: true, isFlipped: false } : card
          ));
          setIsMyTurn(false);
        }, 1000);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === data.cardId ? { ...card, isFlipped: false } : card
          ));
          setIsMyTurn(false);
        }, 1000);
      }
    });

    return () => {
      socket.off('opponent-move');
    };
  }, [flippedCards, cards]);

  useEffect(() => {
    const allMatched = cards.length > 0 && cards.every(card => card.isMatched);
    if (allMatched) {
      setGameOver(true);
    }
  }, [cards]);

  function initializeCards() {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5);

    const newCards = shuffledEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    }));

    setCards(newCards);
  }

  function handleCardClick(cardId: number) {
    if (!isMyTurn || isProcessing || gameOver) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setIsProcessing(true);
      const [firstId, secondId] = newFlippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        setPlayer1Score(prev => prev + 1);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId
              ? { ...c, isMatched: true, isFlipped: false }
              : c
          ));
          setFlippedCards([]);
          setIsProcessing(false);
        }, 1000);
      } else {
        const socket = getSocket();
        if (socket) {
          socket.emit('game-move', {
            roomId,
            move: { cardId: secondId, matched: false }
          });
        }

        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId
              ? { ...c, isFlipped: false }
              : c
          ));
          setFlippedCards([]);
          setIsProcessing(false);
          setIsMyTurn(false);
        }, 1000);
      }
    }
  }

  const winner = gameOver
    ? player1Score > player2Score ? 'You Win!'
    : player2Score > player1Score ? 'Opponent Wins!'
    : "It's a Draw!"
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-4">Memory Match</h2>

        <div className="flex justify-center gap-8 mb-4">
          <div className={`px-6 py-3 rounded-lg ${isMyTurn ? 'bg-green-500/30 border-2 border-green-400' : 'bg-purple-500/30'}`}>
            <span className="text-white font-bold">You: {player1Score}</span>
          </div>
          <div className="px-6 py-3 rounded-lg bg-purple-500/30">
            <span className="text-white font-bold">Opponent: {player2Score}</span>
          </div>
        </div>

        {gameOver && (
          <p className="text-2xl font-bold text-yellow-400">{winner}</p>
        )}

        {!gameOver && (
          <p className={`text-lg ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
            {isMyTurn ? 'Your turn' : "Opponent's turn"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 md:gap-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={!isMyTurn || card.isFlipped || card.isMatched || isProcessing}
            className={`
              aspect-square rounded-xl text-4xl md:text-5xl
              transition-all duration-300 transform
              ${card.isFlipped || card.isMatched
                ? 'bg-gradient-to-br from-purple-400 to-indigo-600 rotate-0'
                : 'bg-gradient-to-br from-indigo-600 to-purple-800 hover:scale-105'
              }
              ${card.isMatched ? 'opacity-50' : 'opacity-100'}
              ${!isMyTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
              shadow-lg
            `}
          >
            {(card.isFlipped || card.isMatched) ? card.emoji : ''}
          </button>
        ))}
      </div>

      <p className="text-center text-purple-300 mt-6 text-sm">
        Match pairs to score points. Matching gives you another turn!
      </p>
    </div>
  );
}
