import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { Login } from './components/Login';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';
import { Player, GameState } from './types';

type Screen = 'login' | 'lobby' | 'table' | 'spectator';

export default function App() {
  const { socket, connected } = useSocket();
  const [screen, setScreen] = useState<Screen>('login');
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('player:registered', (p: Player) => {
      setPlayer(p);
      setScreen('lobby');
    });

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('player:registered');
      socket.off('game:state');
    };
  }, [socket]);

  const handleLogin = useCallback((name: string) => {
    socket?.emit('player:register', { name });
  }, [socket]);

  const handleJoinTable = useCallback((tableId: string) => {
    socket?.emit('game:join', { tableId });
    setCurrentTableId(tableId);
    setScreen('table');
  }, [socket]);

  const handleCreateTable = useCallback((name: string, smallBlind: number, bigBlind: number) => {
    socket?.emit('lobby:create', { name, smallBlind, bigBlind });
  }, [socket]);

  const handleWatchTable = useCallback((tableId: string) => {
    socket?.emit('game:spectate', { tableId });
    setCurrentTableId(tableId);
    setScreen('spectator');
  }, [socket]);

  const handleLeaveTable = useCallback(() => {
    if (currentTableId) {
      if (screen === 'spectator') {
        socket?.emit('game:unspectate', { tableId: currentTableId });
      } else {
        socket?.emit('game:leave', { tableId: currentTableId });
      }
    }
    setCurrentTableId(null);
    setGameState(null);
    setScreen('lobby');
  }, [socket, currentTableId, screen]);

  const handleStartGame = useCallback(() => {
    if (currentTableId) {
      socket?.emit('game:start', { tableId: currentTableId });
    }
  }, [socket, currentTableId]);

  const handleAction = useCallback((action: string, amount?: number) => {
    if (currentTableId) {
      socket?.emit('game:action', { tableId: currentTableId, action, amount });
    }
  }, [socket, currentTableId]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '10px 24px',
        background: '#16213e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #e94560',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 20, color: '#e94560', margin: 0 }}>Poker Room</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {player && <span>Player: <b>{player.name}</b></span>}
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#4ecca3' : '#e94560',
            display: 'inline-block',
          }} />
        </div>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: screen === 'lobby' ? 'stretch' : 'center',
        padding: screen === 'lobby' ? 16 : 24,
        minHeight: 0,
      }}>
        {screen === 'login' && <Login onLogin={handleLogin} />}
        {screen === 'lobby' && socket && player && (
          <Lobby
            socket={socket}
            playerId={player.id}
            onJoinTable={handleJoinTable}
            onCreateTable={handleCreateTable}
            onWatchTable={handleWatchTable}
          />
        )}
        {screen === 'table' && gameState && player && (
          <Table
            gameState={gameState}
            playerId={player.id}
            onAction={handleAction}
            onLeave={handleLeaveTable}
            onStart={handleStartGame}
          />
        )}
        {screen === 'spectator' && gameState && player && (
          <Table
            gameState={gameState}
            playerId={player.id}
            onAction={handleAction}
            onLeave={handleLeaveTable}
            onStart={handleStartGame}
            spectator
          />
        )}
        {(screen === 'table' || screen === 'spectator') && !gameState && (
          <div>
            <p>Waiting for game state...</p>
            <button onClick={handleLeaveTable} style={{ marginTop: 12, background: '#e94560', color: '#fff' }}>
              Back to Lobby
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
