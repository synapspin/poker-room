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
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  useEffect(() => {
    socket.emit('lobby:list');

    const handleTables = (data: TableInfo[]) => setTables(data);
    const handleCreated = (data: { tableId: string }) => {
      setShowCreate(false);
      onJoinTable(data.tableId);
    };
    const handlePreviewState = (state: GameState) => setPreviewState(state);
    const handleWaitlistStatus = (data: { position: number }) => setWaitlistPosition(data.position);
    const handlePromoted = (data: { tableId: string }) => onJoinTable(data.tableId);

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
      if (selectedTableId) socket.emit('game:unpreview', { tableId: selectedTableId });
    };
  }, [socket, onJoinTable]);

  const handleSelectTable = useCallback((tableId: string) => {
    if (selectedTableId) socket.emit('game:unpreview', { tableId: selectedTableId });
    setSelectedTableId(tableId);
    setPreviewState(null);
    setWaitlistPosition(0);
    setShowPreviewPanel(true);
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

  const filteredTables = useMemo(() => {
    let result = [...tables];
    if (filters.phase === 'waiting') result = result.filter(t => t.phase === 'waiting');
    else if (filters.phase === 'playing') result = result.filter(t => t.phase !== 'waiting');
    if (filters.minBlind > 0) result = result.filter(t => t.bigBlind >= filters.minBlind);
    if (filters.maxBlind > 0) result = result.filter(t => t.bigBlind <= filters.maxBlind);
    if (filters.hasSeats) result = result.filter(t => t.playerCount < t.maxPlayers);
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'players': return dir * (a.playerCount - b.playerCount);
        case 'blinds': return dir * (a.bigBlind - b.bigBlind);
        default: return 0;
      }
    });
    return result;
  }, [tables, filters]);

  const selectedTableInfo = tables.find(t => t.id === selectedTableId) ?? null;

  return (
    <div className="h-full flex flex-col gap-5 p-6">
      {/* Top section: filters + create */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <TableFilters filters={filters} onChange={setFilters} />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2.5 bg-primary text-on-primary font-headline font-bold text-xs uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
        >
          {showCreate ? 'Cancel' : '+ New Table'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface-container-low rounded-xl p-5 flex flex-wrap gap-4 items-end">
          <div className="flex-[2] min-w-[140px]">
            <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Table Name</label>
            <input
              placeholder="The Diamond Den"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-3 text-on-surface font-body text-sm placeholder:text-outline focus:ring-1 focus:ring-primary/40 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Small Blind</label>
            <input
              type="number"
              value={smallBlind}
              onChange={e => setSmallBlind(Number(e.target.value))}
              className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-3 text-on-surface font-label text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-1">Big Blind</label>
            <input
              type="number"
              value={bigBlind}
              onChange={e => setBigBlind(Number(e.target.value))}
              className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 px-3 text-on-surface font-label text-sm focus:ring-1 focus:ring-primary/40 focus:outline-none"
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-primary text-on-primary font-headline font-bold text-xs uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            Create & Join
          </button>
        </div>
      )}

      {/* Main area: table grid + preview panel */}
      <div className="flex-1 flex gap-5 min-h-0 overflow-hidden">
        {/* Tables grid — scrollable */}
        <div className={`flex-1 overflow-y-auto no-scrollbar ${showPreviewPanel ? 'hidden lg:block' : ''}`}>
          <TableList
            tables={filteredTables}
            selectedId={selectedTableId}
            onSelect={handleSelectTable}
            onJoin={onJoinTable}
          />
        </div>

        {/* Preview panel — right side on large screens, overlay on small */}
        {showPreviewPanel && selectedTableInfo && (
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 relative">
            <button
              onClick={() => setShowPreviewPanel(false)}
              className="lg:hidden absolute top-3 right-3 z-10 p-1 rounded-full bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
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
        )}
      </div>
    </div>
  );
}
