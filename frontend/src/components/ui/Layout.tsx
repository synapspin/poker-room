import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ConnectionQuality } from '../../hooks/useHeartbeat';

interface LayoutProps {
  children: ReactNode;
  playerName: string | null;
  chips: number;
  connected: boolean;
  quality: ConnectionQuality;
  latency: number;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  showSidebar?: boolean;
  fullWidth?: boolean;
}

export function Layout({
  children, playerName, chips, connected, quality, latency,
  activeScreen, onNavigate, showSidebar = true, fullWidth = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-surface">
      <Header
        playerName={playerName}
        chips={chips}
        connected={connected}
        quality={quality}
        latency={latency}
      />

      {showSidebar && <Sidebar activeScreen={activeScreen} onNavigate={onNavigate} />}

      <main className={`pt-16 min-h-screen ${showSidebar && !fullWidth ? 'md:ml-56' : ''} ${showSidebar ? 'pb-20 md:pb-0' : ''}`}>
        {/* Unstable connection warning */}
        {connected && quality === 'unstable' && (
          <div className="px-6 py-2 bg-secondary/10 text-secondary text-center text-xs font-label font-bold uppercase tracking-wider">
            Unstable connection ({latency}ms)
          </div>
        )}

        {/* Disconnected banner */}
        {!connected && playerName && (
          <div className="px-6 py-2 bg-error/10 text-error text-center text-xs font-label font-bold uppercase tracking-wider">
            Connection lost — reconnecting...
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
