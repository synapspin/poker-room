import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useHeartbeat } from './hooks/useHeartbeat';
import { useActionQueue } from './hooks/useActionQueue';
import { Login } from './components/Login';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';
import { ReconnectOverlay } from './components/ReconnectOverlay';
import { Player, GameState } from './types';

type Screen = 'login' | 'lobby' | 'table' | 'spectator';

export default function App() {
  const { socket, connected, reconnecting, reconnectAttempt, saveUserId, clearUserId } = useSocket();
  const { quality, latency } = useHeartbeat(socket, connected);
  const [screen, setScreen] = useState<Screen>('login');
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const { enqueueAction, clearQueue, pendingCount } = useActionQueue(socket, connected, currentTableId);

  useEffect(() => {
    if (!socket) return;

    socket.on('player:registered', (p: Player) => {
      setPlayer(p);
      saveUserId(p.userId);
      setScreen('lobby');
    });

    socket.on('player:reconnected', (data: {
      player: Player;
      screen: string;
      activeTableId: string | null;
      gameState: GameState | null;
    }) => {
      setPlayer(data.player);
      saveUserId(data.player.userId);

      if (data.screen === 'table' && data.activeTableId && data.gameState) {
        setCurrentTableId(data.activeTableId);
        setGameState(data.gameState);
        setScreen('table');
      } else {
        setScreen('lobby');
      }
    });

    socket.on('player:reconnect:failed', () => {
      clearUserId();
      setPlayer(null);
      setScreen('login');
    });

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.off('player:registered');
      socket.off('player:reconnected');
      socket.off('player:reconnect:failed');
      socket.off('game:state');
    };
  }, [socket, saveUserId, clearUserId]);

  const handleLogin = useCallback((name: string) => {
    socket?.emit('player:register', { name });
  }, [socket]);

  const handleJoinTable = useCallback((tableId: string) => {
    socket?.emit('game:join', { tableId });
    setCurrentTableId(tableId);
    clearQueue();
    setScreen('table');
  }, [socket, clearQueue]);

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
    clearQueue();
    setScreen('lobby');
  }, [socket, currentTableId, screen, clearQueue]);

  const handleStartGame = useCallback(() => {
    if (currentTableId) {
      socket?.emit('game:start', { tableId: currentTableId });
    }
  }, [socket, currentTableId]);

  // Use action queue for game actions (supports offline buffering + replay)
  const handleAction = useCallback((action: string, amount?: number) => {
    enqueueAction(action, amount);
  }, [enqueueAction]);

  const handleSitOut = useCallback(() => {
    if (currentTableId) {
      socket?.emit('game:sitout', { tableId: currentTableId });
    }
  }, [socket, currentTableId]);

  const handleSitBack = useCallback(() => {
    if (currentTableId) {
      socket?.emit('game:sitback', { tableId: currentTableId });
    }
  }, [socket, currentTableId]);

  // Connection quality indicator color
  const qualityColor = quality === 'stable' ? '#4ecca3' : quality === 'unstable' ? '#f0a500' : '#e94560';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ReconnectOverlay reconnecting={reconnecting} attempt={reconnectAttempt} />

      {!connected && !reconnecting && player && (
        <div style={{
          padding: '8px 24px',
          background: '#e94560',
          color: '#fff',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Connection lost. Waiting to reconnect...
          {pendingCount > 0 && ` (${pendingCount} action${pendingCount > 1 ? 's' : ''} queued)`}
        </div>
      )}

      {/* Unstable connection warning */}
      {connected && quality === 'unstable' && (
        <div style={{
          padding: '4px 24px',
          background: '#f0a500',
          color: '#1a1a2e',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 600,
        }}>
          Unstable connection detected ({latency}ms)
        </div>
      )}

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
          {connected && latency > 0 && (
            <span style={{ fontSize: 11, color: '#888' }}>{latency}ms</span>
          )}
          <span
            title={`${quality} (${latency}ms)`}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: qualityColor,
              display: 'inline-block',
              boxShadow: quality === 'unstable' ? '0 0 6px #f0a500' : 'none',
            }}
          />
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
            playerId={player.userId}
            onJoinTable={handleJoinTable}
            onCreateTable={handleCreateTable}
            onWatchTable={handleWatchTable}
          />
        )}
        {screen === 'table' && gameState && player && (
          <Table
            gameState={gameState}
            playerId={player.userId}
            onAction={handleAction}
            onLeave={handleLeaveTable}
            onStart={handleStartGame}
            onSitOut={handleSitOut}
            onSitBack={handleSitBack}
            pendingActions={pendingCount}
          />
        )}
        {screen === 'spectator' && gameState && player && (
          <Table
            gameState={gameState}
            playerId={player.userId}
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
