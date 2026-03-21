import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { TableInfo } from '../types';

interface LobbyProps {
  socket: Socket;
  onJoinTable: (tableId: string) => void;
  onCreateTable: (name: string, smallBlind: number, bigBlind: number) => void;
}

export function Lobby({ socket, onJoinTable, onCreateTable }: LobbyProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [tableName, setTableName] = useState('');
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);

  useEffect(() => {
    socket.emit('lobby:list');

    socket.on('lobby:tables', (data: TableInfo[]) => {
      setTables(data);
    });

    socket.on('lobby:created', (data: { tableId: string }) => {
      setShowCreate(false);
      onJoinTable(data.tableId);
    });

    return () => {
      socket.off('lobby:tables');
      socket.off('lobby:created');
    };
  }, [socket, onJoinTable]);

  const handleCreate = () => {
    onCreateTable(tableName || 'New Table', smallBlind, bigBlind);
  };

  return (
    <div style={{ width: '100%', maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Lobby</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ background: '#4ecca3', color: '#1a1a2e' }}
        >
          {showCreate ? 'Cancel' : 'Create Table'}
        </button>
      </div>

      {showCreate && (
        <div style={{
          background: '#16213e',
          padding: 20,
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <input
            placeholder="Table name"
            value={tableName}
            onChange={e => setTableName(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Small Blind</span>
              <input
                type="number"
                value={smallBlind}
                onChange={e => setSmallBlind(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: '#888' }}>Big Blind</span>
              <input
                type="number"
                value={bigBlind}
                onChange={e => setBigBlind(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </label>
          </div>
          <button onClick={handleCreate} style={{ background: '#e94560', color: '#fff' }}>
            Create & Join
          </button>
        </div>
      )}

      {tables.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          background: '#16213e',
          borderRadius: 8,
          color: '#888',
        }}>
          No tables yet. Create one to start playing!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tables.map(table => (
            <div
              key={table.id}
              style={{
                background: '#16213e',
                padding: 16,
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{table.name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  {table.playerCount}/{table.maxPlayers} players
                  &nbsp;&bull;&nbsp;
                  Blinds: {table.smallBlind}/{table.bigBlind}
                  &nbsp;&bull;&nbsp;
                  {table.phase === 'waiting' ? 'Waiting' : 'In progress'}
                </div>
              </div>
              <button
                onClick={() => onJoinTable(table.id)}
                disabled={table.playerCount >= table.maxPlayers}
                style={{ background: '#4ecca3', color: '#1a1a2e' }}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
