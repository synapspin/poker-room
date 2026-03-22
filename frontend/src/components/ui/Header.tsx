import { ConnectionQuality } from '../../hooks/useHeartbeat';

interface HeaderProps {
  playerName: string | null;
  chips: number;
  connected: boolean;
  quality: ConnectionQuality;
  latency: number;
}

export function Header({ playerName, chips, connected, quality, latency }: HeaderProps) {
  const qualityColor = quality === 'stable' ? 'bg-primary' : quality === 'unstable' ? 'bg-secondary' : 'bg-error';

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-low ambient-shadow h-16 flex justify-between items-center px-6">
      <div className="text-xl font-bold tracking-tighter text-primary uppercase font-headline">
        The Obsidian Lounge
      </div>

      <div className="flex items-center gap-6">
        {playerName && (
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-surface-container-highest rounded-lg">
            {connected && latency > 0 && (
              <>
                <span className="font-label text-xs text-on-surface-variant">{latency}ms</span>
                <div className="h-4 w-px bg-outline-variant/30" />
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">account_balance_wallet</span>
              <span className="font-label font-bold text-on-surface text-sm tracking-widest">
                ${chips.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <button className="relative text-on-surface-variant hover:text-primary transition-colors duration-300">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-2 border-outline-variant/20">
            {playerName ? (
              <span className="font-headline font-bold text-primary text-sm">
                {playerName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${qualityColor} border-2 border-surface-container-low`} />
        </div>
      </div>
    </header>
  );
}
