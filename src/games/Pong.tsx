import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../socket';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;
const WINNING_SCORE = 5;

interface PongProps {
  roomId: string;
}

export default function Pong({ roomId }: PongProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const gameState = useRef({
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballSpeedX: 5,
    ballSpeedY: 5,
    player1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    player2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    isPlayer1: true
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    setIsConnected(true);
    gameState.current.isPlayer1 = socket.id === socket.io.engine.id;

    socket.on('opponent-move', (data: { paddleY: number }) => {
      gameState.current.player2Y = data.paddleY;
    });

    socket.on('game-action', (data: { type: string; value?: number }) => {
      if (data.type === 'score') {
        if (data.value === 1) {
          setPlayer1Score(prev => prev + 1);
        } else {
          setPlayer2Score(prev => prev + 1);
        }
        resetBall();
      }
    });

    return () => {
      socket.off('opponent-move');
      socket.off('game-action');
    };
  }, []);

  useEffect(() => {
    if (player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
      setGameOver(true);
      setWinner(player1Score >= WINNING_SCORE ? 'You Win!' : 'Opponent Wins!');
    }
  }, [player1Score, player2Score]);

  const resetBall = useCallback(() => {
    gameState.current.ballX = CANVAS_WIDTH / 2;
    gameState.current.ballY = CANVAS_HEIGHT / 2;
    gameState.current.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
    gameState.current.ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * 5;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    function update() {
      const state = gameState.current;

      state.ballX += state.ballSpeedX;
      state.ballY += state.ballSpeedY;

      if (state.ballY <= 0 || state.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        state.ballSpeedY = -state.ballSpeedY;
      }

      if (state.ballX <= 0) {
        setPlayer2Score(prev => prev + 1);
        if (player2Score + 1 < WINNING_SCORE) {
          resetBall();
        }
        return;
      }

      if (state.ballX >= CANVAS_WIDTH - BALL_SIZE) {
        setPlayer1Score(prev => prev + 1);
        if (player1Score + 1 < WINNING_SCORE) {
          resetBall();
        }
        return;
      }

      if (
        state.ballX <= PADDLE_WIDTH &&
        state.ballY + BALL_SIZE >= state.player1Y &&
        state.ballY <= state.player1Y + PADDLE_HEIGHT
      ) {
        state.ballSpeedX = Math.abs(state.ballSpeedX) * 1.05;
        const deltaY = state.ballY - (state.player1Y + PADDLE_HEIGHT / 2);
        state.ballSpeedY = deltaY * 0.3;
      }

      if (
        state.ballX >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
        state.ballY + BALL_SIZE >= state.player2Y &&
        state.ballY <= state.player2Y + PADDLE_HEIGHT
      ) {
        state.ballSpeedX = -Math.abs(state.ballSpeedX) * 1.05;
        const deltaY = state.ballY - (state.player2Y + PADDLE_HEIGHT / 2);
        state.ballSpeedY = deltaY * 0.3;
      }

      state.ballSpeedX = Math.max(-12, Math.min(12, state.ballSpeedX));
      state.ballSpeedY = Math.max(-8, Math.min(8, state.ballSpeedY));
    }

    function draw() {
      const state = gameState.current;

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(0, state.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.fillStyle = '#f87171';
      ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, state.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(state.ballX + BALL_SIZE / 2, state.ballY + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function gameLoop() {
      if (!gameOver) {
        update();
      }
      draw();
      animationId = requestAnimationFrame(gameLoop);
    }

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameOver, player1Score, player2Score, resetBall]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseY = (e.clientY - rect.top) * scaleY;

    gameState.current.player1Y = Math.max(
      0,
      Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, mouseY - PADDLE_HEIGHT / 2)
    );

    const socket = getSocket();
    if (socket) {
      socket.emit('game-move', {
        roomId,
        move: { paddleY: gameState.current.player1Y }
      });
    }
  }, [gameOver, roomId]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-4">Pong</h2>

        <div className="flex justify-center gap-12 mb-4">
          <div className="text-center">
            <div className="text-purple-300 text-sm mb-1">You</div>
            <div className="text-4xl font-bold text-blue-400">{player1Score}</div>
          </div>
          <div className="text-center">
            <div className="text-purple-300 text-sm mb-1">Opponent</div>
            <div className="text-4xl font-bold text-red-400">{player2Score}</div>
          </div>
        </div>

        {gameOver ? (
          <p className="text-2xl font-bold text-yellow-400">{winner}</p>
        ) : (
          <p className="text-purple-200">First to {WINNING_SCORE} wins!</p>
        )}

        {!isConnected && (
          <p className="text-yellow-400">Connecting...</p>
        )}
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          className="rounded-xl shadow-2xl border-4 border-purple-500/50 cursor-none"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <p className="text-center text-purple-300 mt-4 text-sm">
        Move your mouse to control the blue paddle (left side)
      </p>

      {gameOver && (
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
