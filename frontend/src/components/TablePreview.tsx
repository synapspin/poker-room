import { GameState, TableInfo } from '../types';
import { CardView } from './CardView';

interface TablePreviewProps {
  tableInfo: TableInfo | null;
  previewState: GameState | null;
  playerId: string;
  onJoin: (tableId: string) => void;
  onWatch: (tableId: string) => void;
  onWaitlistJoin: (tableId: string) => void;
  onWaitlistLeave: (tableId: string) => void;
  waitlistPosition: number; // 0 = not in waitlist
}

export function TablePreview({
  tableInfo,
  previewState,
  playerId,
  onJoin,
  onWatch,
  onWaitlistJoin,
  onWaitlistLeave,
  waitlistPosition,
}: TablePreviewProps) {
  if (!tableInfo) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#555',
        fontSize: 15,
      }}>
        Select a table to preview
      </div>
    );
  }

  const isFull = tableInfo.playerCount >= tableInfo.maxPlayers;
  const isAlreadySeated = previewState?.players.some(p => p.playerId === playerId) ?? false;
  const isInWaitlist = waitlistPosition > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Table header */}
      <div style={{
        padding: '12px 16px',
        background: '#16213e',
        borderRadius: 8,
        marginBottom: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{tableInfo.name}</h3>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {tableInfo.playerCount}/{tableInfo.maxPlayers} players
            &nbsp;|&nbsp;Blinds: {tableInfo.smallBlind}/{tableInfo.bigBlind}
            &nbsp;|&nbsp;{tableInfo.phase === 'waiting' ? 'Waiting' : `Phase: ${tableInfo.phase}`}
          </div>
        </div>
      </div>

      {/* Live preview area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {previewState && previewState.players.length > 0 ? (
          <>
            {/* Community cards */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              padding: 16,
              background: '#0f3460',
              borderRadius: 80,
              minHeight: 90,
              alignItems: 'center',
              marginBottom: 12,
            }}>
              {previewState.communityCards.length > 0
                ? previewState.communityCards.map((card, i) => <CardView key={i} card={card} />)
                : <span style={{ color: '#445' }}>No community cards yet</span>
              }
            </div>

            {/* Pot */}
            {previewState.pot > 0 && (
              <div style={{ textAlign: 'center', marginBottom: 12, color: '#e94560', fontWeight: 600 }}>
                Pot: {previewState.pot}
              </div>
            )}

            {/* Winners */}
            {previewState.phase === 'showdown' && previewState.winners && (
              <div style={{
                textAlign: 'center',
                padding: 8,
                marginBottom: 12,
                background: '#4ecca3',
                color: '#1a1a2e',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
              }}>
                {previewState.winners.map((w, i) => {
                  const wp = previewState.players.find(p => p.playerId === w.playerId);
                  return <div key={i}>{wp?.name} wins {w.amount} with {w.hand}</div>;
                })}
              </div>
            )}

            {/* Players grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}>
              {previewState.players.map((player, idx) => {
                const isCurrentTurn = idx === previewState.currentPlayerIndex
                  && previewState.phase !== 'waiting'
                  && previewState.phase !== 'showdown';
                const isDealer = idx === previewState.dealerIndex;

                return (
                  <div
                    key={player.playerId}
                    style={{
                      background: '#16213e',
                      padding: 8,
                      borderRadius: 6,
                      border: isCurrentTurn ? '2px solid #e94560' : '2px solid transparent',
                      opacity: player.folded ? 0.5 : 1,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>
                        {player.name} {isDealer ? 'D' : ''}
                      </span>
                      <span style={{ color: '#4ecca3' }}>{player.chips}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {player.cards.length > 0
                        ? player.cards.map((card, i) => <CardView key={i} card={card} />)
                        : previewState.phase !== 'waiting' && <><CardView hidden /><CardView hidden /></>
                      }
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {player.folded && 'Folded'}
                      {player.allIn && 'ALL IN'}
                      {player.bet > 0 && !player.folded && !player.allIn && `Bet: ${player.bet}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            fontSize: 14,
          }}>
            {tableInfo.playerCount === 0 ? 'Empty table — be the first to join!' : 'Loading preview...'}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 0',
        borderTop: '1px solid #333',
        marginTop: 'auto',
      }}>
        {!isAlreadySeated && !isFull && (
          <button
            onClick={() => onJoin(tableInfo.id)}
            style={{ flex: 1, background: '#4ecca3', color: '#1a1a2e', padding: 10 }}
          >
            Join Table
          </button>
        )}

        {!isAlreadySeated && isFull && !isInWaitlist && (
          <button
            onClick={() => onWaitlistJoin(tableInfo.id)}
            style={{ flex: 1, background: '#f0a500', color: '#1a1a2e', padding: 10 }}
          >
            Join Waitlist
          </button>
        )}

        {isInWaitlist && (
          <button
            onClick={() => onWaitlistLeave(tableInfo.id)}
            style={{ flex: 1, background: '#666', color: '#fff', padding: 10 }}
          >
            Leave Waitlist (#{waitlistPosition})
          </button>
        )}

        <button
          onClick={() => onWatch(tableInfo.id)}
          style={{ flex: 1, background: '#0f3460', color: '#eee', padding: 10 }}
        >
          Watch as Spectator
        </button>
      </div>
    </div>
  );
}
