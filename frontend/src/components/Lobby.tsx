import { useState, useEffect, useCallback, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { TableInfo, GameState, TableFiltersState } from '../types';
import { TableFilters } from './TableFilters';
import { TableList } from './TableList';
import { TablePreview } from './TablePreview';

interface LobbyProps {
  socket: Socket;
  playerId: string;
  onJoinTable: (tableId: string) => void;
  onCreateTable: (name: string, smallBlind: number, bigBlind: number) => void;
  onWatchTable: (tableId: string) => void;
}

const defaultFilters: TableFiltersState = {
  phase: 'all',
  minBlind: 0,
  maxBlind: 0,
  hasSeats: false,
  sortBy: 'name',
  sortDir: 'asc',
};

export function Lobby({ socket, playerId, onJoinTable, onCreateTable, onWatchTable }: LobbyProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<GameState | null>(null);
  const [filters, setFilters] = useState<TableFiltersState>(defaultFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [tableName, setTableName] = useState('');
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [waitlistPosition, setWaitlistPosition] = useState(0);

  useEffect(() => {
    socket.emit('lobby:list');

    const handleTables = (data: TableInfo[]) => setTables(data);
    const handleCreated = (data: { tableId: string }) => {
      setShowCreate(false);
      onJoinTable(data.tableId);
    };
    const handlePreviewState = (state: GameState) => setPreviewState(state);
    const handleWaitlistStatus = (data: { position: number; total: number }) => {
      setWaitlistPosition(data.position);
    };
    const handlePromoted = (data: { tableId: string }) => {
      onJoinTable(data.tableId);
    };

    socket.on('lobby:tables', handleTables);
    socket.on('lobby:created', handleCreated);
    socket.on('game:preview:state', handlePreviewState);
    socket.on('game:waitlist:status', handleWaitlistStatus);
    socket.on('game:waitlist:promoted', handlePromoted);

    return () => {
      socket.off('lobby:tables', handleTables);
      socket.off('lobby:created', handleCreated);
      socket.off('game:preview:state', handlePreviewState);
      socket.off('game:waitlist:status', handleWaitlistStatus);
      socket.off('game:waitlist:promoted', handlePromoted);
      // Unsubscribe from any active preview
      if (selectedTableId) {
        socket.emit('game:unpreview', { tableId: selectedTableId });
      }
    };
  }, [socket, onJoinTable]);

  const handleSelectTable = useCallback((tableId: string) => {
    // Unsubscribe from previous preview
    if (selectedTableId) {
      socket.emit('game:unpreview', { tableId: selectedTableId });
    }
    setSelectedTableId(tableId);
    setPreviewState(null);
    setWaitlistPosition(0);
    // Subscribe to new preview
    socket.emit('game:preview', { tableId });
  }, [socket, selectedTableId]);

  const handleCreate = () => {
    onCreateTable(tableName || 'New Table', smallBlind, bigBlind);
  };

  const handleWaitlistJoin = useCallback((tableId: string) => {
    socket.emit('game:waitlist:join', { tableId });
  }, [socket]);

  const handleWaitlistLeave = useCallback((tableId: string) => {
    socket.emit('game:waitlist:leave', { tableId });
  }, [socket]);

  // Filter and sort tables
  const filteredTables = useMemo(() => {
    let result = [...tables];

    // Phase filter
    if (filters.phase === 'waiting') {
      result = result.filter(t => t.phase === 'waiting');
    } else if (filters.phase === 'playing') {
      result = result.filter(t => t.phase !== 'waiting');
    }

    // Blinds range
    if (filters.minBlind > 0) {
      result = result.filter(t => t.bigBlind >= filters.minBlind);
    }
    if (filters.maxBlind > 0) {
      result = result.filter(t => t.bigBlind <= filters.maxBlind);
    }

    // Has seats
    if (filters.hasSeats) {
      result = result.filter(t => t.playerCount < t.maxPlayers);
    }

    // Sort
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'players':
          return dir * (a.playerCount - b.playerCount);
        case 'blinds':
          return dir * (a.bigBlind - b.bigBlind);
        default:
          return 0;
      }
    });

    return result;
  }, [tables, filters]);

  const selectedTableInfo = tables.find(t => t.id === selectedTableId) ?? null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top bar: filters + create */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{ flex: 1 }}>
          <TableFilters filters={filters} onChange={setFilters} />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            background: '#4ecca3',
            color: '#1a1a2e',
            padding: '0 20px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {showCreate ? 'Cancel' : '+ Create Table'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          background: '#16213e',
          padding: 16,
          borderRadius: 8,
          display: 'flex',
          gap: 12,
          alignItems: 'end',
        }}>
          <label style={{ flex: 2 }}>
            <span style={{ fontSize: 12, color: '#888' }}>Table name</span>
            <input
              placeholder="My Table"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: '#888' }}>SB</span>
            <input
              type="number"
              value={smallBlind}
              onChange={e => setSmallBlind(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ flex: 1 }}>
            <span style={{ fontSize: 12, color: '#888' }}>BB</span>
            <input
              type="number"
              value={bigBlind}
              onChange={e => setBigBlind(Number(e.target.value))}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <button onClick={handleCreate} style={{ background: '#e94560', color: '#fff', padding: '8px 20px' }}>
            Create & Join
          </button>
        </div>
      )}

      {/* Split panel: table list + preview */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 12,
        minHeight: 0,
      }}>
        {/* Left: table list */}
        <div style={{
          width: '35%',
          minWidth: 240,
          overflowY: 'auto',
          background: '#111827',
          borderRadius: 8,
          padding: 8,
        }}>
          <TableList
            tables={filteredTables}
            selectedId={selectedTableId}
            onSelect={handleSelectTable}
          />
        </div>

        {/* Right: preview */}
        <div style={{
          flex: 1,
          background: '#111827',
          borderRadius: 8,
          padding: 16,
          overflowY: 'auto',
        }}>
          <TablePreview
            tableInfo={selectedTableInfo}
            previewState={previewState}
            playerId={playerId}
            onJoin={onJoinTable}
            onWatch={onWatchTable}
            onWaitlistJoin={handleWaitlistJoin}
            onWaitlistLeave={handleWaitlistLeave}
            waitlistPosition={waitlistPosition}
          />
        </div>
      </div>
    </div>
  );
}
