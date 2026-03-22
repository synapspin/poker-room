import { TableFiltersState, PhaseFilter, SortBy } from '../types';

interface TableFiltersProps {
  filters: TableFiltersState;
  onChange: (filters: TableFiltersState) => void;
}

export function TableFilters({ filters, onChange }: TableFiltersProps) {
  const update = (partial: Partial<TableFiltersState>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '10px 12px',
      background: '#16213e',
      borderRadius: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      fontSize: 13,
    }}>
      {/* Phase filter */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#888' }}>Status:</span>
        <select
          value={filters.phase}
          onChange={e => update({ phase: e.target.value as PhaseFilter })}
          style={selectStyle}
        >
          <option value="all">All</option>
          <option value="waiting">Waiting</option>
          <option value="playing">Playing</option>
        </select>
      </label>

      {/* Blinds range */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#888' }}>Blinds:</span>
        <input
          type="number"
          value={filters.minBlind}
          onChange={e => update({ minBlind: Number(e.target.value) })}
          style={{ ...inputStyle, width: 50 }}
          min={0}
          placeholder="min"
        />
        <span style={{ color: '#555' }}>–</span>
        <input
          type="number"
          value={filters.maxBlind}
          onChange={e => update({ maxBlind: Number(e.target.value) })}
          style={{ ...inputStyle, width: 50 }}
          min={0}
          placeholder="max"
        />
      </label>

      {/* Has seats */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={filters.hasSeats}
          onChange={e => update({ hasSeats: e.target.checked })}
        />
        <span style={{ color: '#888' }}>Has seats</span>
      </label>

      {/* Sort */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <span style={{ color: '#888' }}>Sort:</span>
        <select
          value={filters.sortBy}
          onChange={e => update({ sortBy: e.target.value as SortBy })}
          style={selectStyle}
        >
          <option value="name">Name</option>
          <option value="players">Players</option>
          <option value="blinds">Blinds</option>
        </select>
        <button
          onClick={() => update({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          style={{
            background: '#0f3460',
            color: '#eee',
            padding: '4px 8px',
            fontSize: 12,
            borderRadius: 4,
          }}
        >
          {filters.sortDir === 'asc' ? '\u2191' : '\u2193'}
        </button>
      </label>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#0f3460',
  color: '#eee',
  border: '1px solid #333',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  background: '#0f3460',
  color: '#eee',
  border: '1px solid #333',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 13,
};
