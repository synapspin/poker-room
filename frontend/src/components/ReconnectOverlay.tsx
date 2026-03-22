interface ReconnectOverlayProps {
  reconnecting: boolean;
  attempt: number;
}

export function ReconnectOverlay({ reconnecting, attempt }: ReconnectOverlayProps) {
  if (!reconnecting) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#16213e',
        padding: '32px 48px',
        borderRadius: 12,
        textAlign: 'center',
        border: '2px solid #e94560',
      }}>
        {/* Spinner */}
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #333',
          borderTopColor: '#e94560',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />

        <h3 style={{ color: '#e94560', margin: '0 0 8px' }}>Connection Lost</h3>
        <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
          Reconnecting... (attempt {attempt})
        </p>
        <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
          Your seat is reserved for 60 seconds
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
