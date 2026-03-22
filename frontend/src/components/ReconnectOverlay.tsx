interface ReconnectOverlayProps {
  reconnecting: boolean;
  attempt: number;
}

export function ReconnectOverlay({ reconnecting, attempt }: ReconnectOverlayProps) {
  if (!reconnecting) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-xl">
      <div className="glass-panel rounded-xl p-10 text-center max-w-sm">
        {/* Spinner */}
        <div className="w-12 h-12 border-2 border-surface-container-highest border-t-primary rounded-full mx-auto mb-6" style={{ animation: 'spin 1s linear infinite' }} />

        <h3 className="font-headline font-bold text-xl text-on-surface mb-2">Connection Lost</h3>
        <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider mb-1">
          Reconnecting... (attempt {attempt})
        </p>
        <p className="font-label text-[10px] text-outline uppercase tracking-[0.15em]">
          Your seat is reserved for 60 seconds
        </p>
      </div>
    </div>
  );
}
