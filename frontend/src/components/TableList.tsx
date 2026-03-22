import { TableInfo } from '../types';

interface TableListProps {
  tables: TableInfo[];
  selectedId: string | null;
  onSelect: (tableId: string) => void;
  onJoin: (tableId: string) => void;
}

export function TableList({ tables, selectedId, onSelect, onJoin }: TableListProps) {
  if (tables.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl mb-4 text-outline">playing_cards</span>
        <p className="font-headline font-bold text-lg">No Tables Found</p>
        <p className="text-xs font-label uppercase tracking-wider mt-1">Create one to start playing</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {tables.map(table => {
        const isSelected = table.id === selectedId;
        const isFull = table.playerCount >= table.maxPlayers;
        const isPlaying = table.phase !== 'waiting';

        return (
          <div
            key={table.id}
            onClick={() => onSelect(table.id)}
            className={`group bg-surface-container-low rounded-xl p-1 cursor-pointer transition-all duration-300
              ${isSelected ? 'ring-1 ring-primary/30' : 'hover:bg-surface-container-high'}`}
          >
            <div className="bg-surface-container rounded-xl p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-headline font-bold text-on-surface">{table.name}</h3>
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                    NL Texas Hold'em
                  </span>
                </div>
                {isPlaying ? (
                  <span className="px-3 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-label font-bold uppercase tracking-wider border border-primary/20">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-md bg-surface-container-highest text-on-surface-variant text-[10px] font-label font-bold uppercase tracking-wider">
                    Waiting
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="block font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">Stakes</span>
                  <span className="font-label font-bold text-on-surface text-sm">
                    ${table.smallBlind} / ${table.bigBlind}
                  </span>
                </div>
                <div>
                  <span className="block font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">Players</span>
                  <span className={`font-label font-bold text-sm ${isFull ? 'text-tertiary' : 'text-primary'}`}>
                    {table.playerCount} / {table.maxPlayers}
                  </span>
                </div>
                <div>
                  <span className="block font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
                    {table.waitlistCount > 0 ? 'Waitlist' : 'Avg Pot'}
                  </span>
                  <span className={`font-label font-bold text-sm ${table.waitlistCount > 0 ? 'text-secondary' : 'text-on-surface'}`}>
                    {table.waitlistCount > 0 ? table.waitlistCount : '—'}
                  </span>
                </div>
              </div>

              {/* Avatars row */}
              <div className="flex items-center mb-4">
                {Array.from({ length: Math.min(table.playerCount, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-surface-container-highest border-2 border-surface-container flex items-center justify-center -ml-2 first:ml-0"
                  >
                    <span className="text-on-surface-variant text-[10px] font-label font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                ))}
                {table.playerCount > 4 && (
                  <span className="ml-2 text-on-surface-variant text-xs font-label">+{table.playerCount - 4}</span>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={e => { e.stopPropagation(); onJoin(table.id); }}
                disabled={isFull}
                className={`w-full py-2.5 rounded-lg font-label text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98]
                  ${isFull
                    ? 'bg-surface-container-highest text-on-surface-variant'
                    : 'bg-surface-container-highest text-on-surface hover:bg-primary hover:text-on-primary group-hover:bg-primary group-hover:text-on-primary'
                  }`}
              >
                {isFull ? 'Wait List' : 'Take a Seat'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
