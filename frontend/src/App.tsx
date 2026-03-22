import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { useHeartbeat } from './hooks/useHeartbeat';
import { useActionQueue } from './hooks/useActionQueue';
import { Layout } from './components/ui/Layout';
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
    if (currentTableId) socket?.emit('game:start', { tableId: currentTableId });
  }, [socket, currentTableId]);

  const handleAction = useCallback((action: string, amount?: number) => {
    enqueueAction(action, amount);
  }, [enqueueAction]);

  const handleSitOut = useCallback(() => {
    if (currentTableId) socket?.emit('game:sitout', { tableId: currentTableId });
  }, [socket, currentTableId]);

  const handleSitBack = useCallback(() => {
    if (currentTableId) socket?.emit('game:sitback', { tableId: currentTableId });
  }, [socket, currentTableId]);

  const handleNavigate = useCallback((target: string) => {
    if (target === 'lobby') {
      if (currentTableId) {
        if (screen === 'spectator') socket?.emit('game:unspectate', { tableId: currentTableId });
        else if (screen === 'table') socket?.emit('game:leave', { tableId: currentTableId });
        setCurrentTableId(null);
        setGameState(null);
        clearQueue();
      }
      setScreen('lobby');
    }
    // profile/cashier/tables — future screens, for now go to lobby
  }, [socket, currentTableId, screen, clearQueue]);

  // Login screen — no layout shell
  if (screen === 'login') {
    return (
      <>
        <ReconnectOverlay reconnecting={reconnecting} attempt={reconnectAttempt} />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  const isTableScreen = screen === 'table' || screen === 'spectator';

  return (
    <>
      <ReconnectOverlay reconnecting={reconnecting} attempt={reconnectAttempt} />

      <Layout
        playerName={player?.name ?? null}
        chips={player?.chips ?? 0}
        connected={connected}
        quality={quality}
        latency={latency}
        activeScreen={isTableScreen ? 'tables' : 'lobby'}
        onNavigate={handleNavigate}
        showSidebar={!isTableScreen}
        fullWidth={isTableScreen}
      >
        {screen === 'lobby' && socket && player && (
          <Lobby
            socket={socket}
            playerId={player.userId}
            onJoinTable={handleJoinTable}
            onCreateTable={handleCreateTable}
            onWatchTable={handleWatchTable}
          />
        )}

        {screen === 'table' && gameState && player && socket && (
          <Table
            gameState={gameState}
            playerId={player.userId}
            socket={socket}
            onAction={handleAction}
            onLeave={handleLeaveTable}
            onStart={handleStartGame}
            onSitOut={handleSitOut}
            onSitBack={handleSitBack}
            pendingActions={pendingCount}
          />
        )}

        {screen === 'spectator' && gameState && player && socket && (
          <Table
            gameState={gameState}
            playerId={player.userId}
            socket={socket}
            onAction={handleAction}
            onLeave={handleLeaveTable}
            onStart={handleStartGame}
            spectator
          />
        )}

        {isTableScreen && !gameState && (
          <div className="flex flex-col items-center justify-center h-96 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-4 animate-pulse">hourglass_empty</span>
            <p className="font-headline font-bold">Loading table...</p>
            <button onClick={handleLeaveTable} className="mt-4 px-6 py-2 bg-surface-container-highest rounded-lg font-label text-xs uppercase tracking-wider hover:text-on-surface transition-colors duration-200">
              Back to Lobby
            </button>
          </div>
        )}
      </Layout>
    </>
  );
}
