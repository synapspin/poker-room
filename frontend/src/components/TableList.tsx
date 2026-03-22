import { TableInfo } from '../types';

interface TableListProps {
  tables: TableInfo[];
  selectedId: string | null;
  onSelect: (tableId: string) => void;
}

export function TableList({ tables, selectedId, onSelect }: TableListProps) {
  if (tables.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 32,
        color: '#555',
        fontSize: 14,
      }}>
        No tables match your filters
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {tables.map(table => {
        const isSelected = table.id === selectedId;
        const isFull = table.playerCount >= table.maxPlayers;
        const isPlaying = table.phase !== 'waiting';

        return (
          <div
            key={table.id}
            onClick={() => onSelect(table.id)}
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              background: isSelected ? '#1a3a5c' : '#16213e',
              borderLeft: isSelected ? '3px solid #e94560' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{table.name}</span>
              <span style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                background: isPlaying ? '#e94560' : '#4ecca3',
                color: isPlaying ? '#fff' : '#1a1a2e',
              }}>
                {table.phase === 'waiting' ? 'Waiting' : 'Playing'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#888' }}>
              <span style={{ color: isFull ? '#e94560' : '#4ecca3' }}>
                {table.playerCount}/{table.maxPlayers}
              </span>
              <span>Blinds: {table.smallBlind}/{table.bigBlind}</span>
              {table.waitlistCount > 0 && (
                <span style={{ color: '#f0a500' }}>
                  WL: {table.waitlistCount}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
