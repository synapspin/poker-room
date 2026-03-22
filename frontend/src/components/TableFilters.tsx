import { TableFiltersState, PhaseFilter, SortBy } from '../types';

interface TableFiltersProps {
  filters: TableFiltersState;
  onChange: (filters: TableFiltersState) => void;
}

export function TableFilters({ filters, onChange }: TableFiltersProps) {
  const update = (partial: Partial<TableFiltersState>) => {
    onChange({ ...filters, ...partial });
  };

  const phaseTab = (value: PhaseFilter, label: string) => (
    <button
      onClick={() => update({ phase: value })}
      className={`px-4 py-2 rounded-lg font-label text-xs uppercase tracking-wider font-bold transition-all duration-200
        ${filters.phase === value
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Phase tabs */}
      <div className="flex gap-1">
        {phaseTab('all', 'All Games')}
        {phaseTab('waiting', 'Waiting')}
        {phaseTab('playing', 'Active')}
      </div>

      <div className="h-6 w-px bg-outline-variant/20 hidden sm:block" />

      {/* Stakes filter */}
      <div className="flex items-center gap-2">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Blinds</span>
        <input
          type="number"
          value={filters.minBlind || ''}
          onChange={e => update({ minBlind: Number(e.target.value) })}
          placeholder="min"
          className="w-16 bg-surface-container-highest border-none rounded-lg py-1.5 px-2 text-on-surface font-label text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none"
        />
        <span className="text-outline-variant">–</span>
        <input
          type="number"
          value={filters.maxBlind || ''}
          onChange={e => update({ maxBlind: Number(e.target.value) })}
          placeholder="max"
          className="w-16 bg-surface-container-highest border-none rounded-lg py-1.5 px-2 text-on-surface font-label text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none"
        />
      </div>

      <div className="h-6 w-px bg-outline-variant/20 hidden sm:block" />

      {/* Has seats */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hasSeats}
          onChange={e => update({ hasSeats: e.target.checked })}
          className="rounded-sm bg-surface-container-highest border-outline-variant/30 text-primary focus:ring-primary/40"
        />
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Seats</span>
      </label>

      {/* Sort */}
      <div className="flex items-center gap-1 ml-auto">
        <select
          value={filters.sortBy}
          onChange={e => update({ sortBy: e.target.value as SortBy })}
          className="bg-surface-container-highest border-none rounded-lg py-1.5 px-2 text-on-surface-variant font-label text-xs focus:ring-1 focus:ring-primary/40 focus:outline-none"
        >
          <option value="name">Name</option>
          <option value="players">Players</option>
          <option value="blinds">Stakes</option>
        </select>
        <button
          onClick={() => update({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
          className="p-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors duration-200"
        >
          <span className="material-symbols-outlined text-sm">
            {filters.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        </button>
        <button className="p-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors duration-200">
          <span className="material-symbols-outlined text-sm">tune</span>
        </button>
      </div>
    </div>
  );
}
