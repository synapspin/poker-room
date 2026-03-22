import { useState } from 'react';
import { GameState } from '../types';
import { CardView } from './CardView';
import { TurnTimerBar } from './TurnTimerBar';

interface TableProps {
  gameState: GameState;
  playerId: string;
  onAction: (action: string, amount?: number) => void;
  onLeave: () => void;
  onStart: () => void;
  onSitOut?: () => void;
  onSitBack?: () => void;
  spectator?: boolean;
  pendingActions?: number;
}

export function Table({
  gameState, playerId, onAction, onLeave, onStart,
  onSitOut, onSitBack, spectator = false, pendingActions = 0,
}: TableProps) {
  const [raiseAmount, setRaiseAmount] = useState(gameState.bigBlind * 2);

  const myPlayer = gameState.players.find(p => p.playerId === playerId);
  const isSeated = !!myPlayer;
  const isMyTurn = !spectator && isSeated && gameState.players[gameState.currentPlayerIndex]?.playerId === playerId;
  const isWaiting = gameState.phase === 'waiting';
  const isShowdown = gameState.phase === 'showdown';
  const canCheck = isMyTurn && myPlayer && myPlayer.bet >= gameState.currentBet;
  const callAmount = myPlayer ? gameState.currentBet - myPlayer.bet : 0;
  const isSittingOut = myPlayer?.sittingOut ?? false;

  return (
    <div style={{ width: '100%', maxWidth: 800 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onLeave} style={{ background: '#333', color: '#eee' }}>
            {spectator ? 'Stop Watching' : 'Leave Table'}
          </button>
          {spectator && (
            <span style={{
              fontSize: 12, padding: '4px 10px', borderRadius: 4,
              background: '#0f3460', color: '#4ecca3',
            }}>
              SPECTATOR
            </span>
          )}
          {!spectator && isSeated && !isWaiting && (
            isSittingOut ? (
              <button onClick={onSitBack} style={{ background: '#4ecca3', color: '#1a1a2e', fontSize: 12 }}>
                Sit Back
              </button>
            ) : (
              <button onClick={onSitOut} style={{ background: '#666', color: '#eee', fontSize: 12 }}>
                Sit Out
              </button>
            )
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#888' }}>Phase: <b style={{ color: '#4ecca3' }}>{gameState.phase}</b></span>
          <span style={{ color: '#888' }}>Pot: <b style={{ color: '#e94560' }}>{gameState.pot}</b></span>
        </div>
      </div>

      {/* Community cards */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
        padding: 20,
        background: '#0f3460',
        borderRadius: 120,
        minHeight: 110,
        alignItems: 'center',
      }}>
        {gameState.communityCards.length > 0
          ? gameState.communityCards.map((card, i) => <CardView key={i} card={card} />)
          : <span style={{ color: '#555' }}>Community cards will appear here</span>
        }
      </div>

      {/* Winners */}
      {isShowdown && gameState.winners && (
        <div style={{
          textAlign: 'center',
          padding: 12,
          marginBottom: 16,
          background: '#4ecca3',
          color: '#1a1a2e',
          borderRadius: 8,
          fontWeight: 700,
        }}>
          {gameState.winners.map((w, i) => {
            const winnerPlayer = gameState.players.find(p => p.playerId === w.playerId);
            return (
              <div key={i}>
                {winnerPlayer?.name || 'Unknown'} wins {w.amount} chips with {w.hand}!
              </div>
            );
          })}
          <div style={{ fontSize: 12, marginTop: 4, fontWeight: 400 }}>
            New hand starting in 5 seconds...
          </div>
        </div>
      )}

      {/* Players */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {gameState.players.map((player, idx) => {
          const isCurrentTurn = idx === gameState.currentPlayerIndex && !isWaiting && !isShowdown;
          const isMe = !spectator && player.playerId === playerId;
          const isDealer = idx === gameState.dealerIndex;
          const showTimer = isCurrentTurn && gameState.turnTimer && gameState.turnTimer.playerId === player.playerId;

          return (
            <div
              key={player.playerId}
              style={{
                background: isMe ? '#1a3a5c' : '#16213e',
                padding: 12,
                borderRadius: 8,
                border: isCurrentTurn ? '2px solid #e94560' : '2px solid transparent',
                opacity: player.folded || player.sittingOut ? 0.5 : 1,
                position: 'relative',
              }}
            >
              {/* Disconnected badge */}
              {player.disconnected && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: '#e94560',
                  color: '#fff',
                }}>
                  OFFLINE
                </div>
              )}

              {/* Sitting out badge */}
              {player.sittingOut && !player.disconnected && (
                <div style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: '#666',
                  color: '#fff',
                }}>
                  SIT OUT
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {player.name} {isMe ? '(You)' : ''} {isDealer ? 'D' : ''}
                </span>
                <span style={{ color: '#4ecca3' }}>{player.chips}</span>
              </div>

              {/* Player cards */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {player.cards.length > 0
                  ? player.cards.map((card, i) => <CardView key={i} card={card} />)
                  : !isWaiting && !player.sittingOut && <><CardView hidden /><CardView hidden /></>
                }
              </div>

              {/* Turn timer */}
              {showTimer && gameState.turnTimer && (
                <div style={{ marginTop: 6 }}>
                  <TurnTimerBar timer={gameState.turnTimer} />
                </div>
              )}

              {/* Status line */}
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {player.folded && 'Folded'}
                {player.allIn && 'ALL IN'}
                {player.bet > 0 && !player.folded && !player.allIn && `Bet: ${player.bet}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions — only for seated non-spectator players */}
      {!spectator && isSeated && isWaiting && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onStart}
            disabled={gameState.players.filter(p => !p.sittingOut).length < 2}
            style={{ background: '#4ecca3', color: '#1a1a2e', padding: '12px 32px', fontSize: 16 }}
          >
            {gameState.players.filter(p => !p.sittingOut).length < 2
              ? `Waiting for active players...`
              : 'Start Game'}
          </button>
        </div>
      )}

      {/* Pending actions indicator */}
      {pendingActions > 0 && (
        <div style={{
          textAlign: 'center',
          padding: 8,
          marginBottom: 8,
          background: '#f0a500',
          color: '#1a1a2e',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
        }}>
          {pendingActions} action{pendingActions > 1 ? 's' : ''} pending... (will replay on reconnect)
        </div>
      )}

      {isMyTurn && !isWaiting && !isShowdown && myPlayer && !myPlayer.folded && !myPlayer.allIn && (
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: 16,
          background: '#16213e',
          borderRadius: 8,
        }}>
          <button onClick={() => onAction('fold')} style={{ background: '#666', color: '#fff' }}>
            Fold
          </button>

          {canCheck && (
            <button onClick={() => onAction('check')} style={{ background: '#4ecca3', color: '#1a1a2e' }}>
              Check
            </button>
          )}

          {!canCheck && (
            <button onClick={() => onAction('call')} style={{ background: '#4ecca3', color: '#1a1a2e' }}>
              Call {callAmount}
            </button>
          )}

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number"
              value={raiseAmount}
              onChange={e => setRaiseAmount(Number(e.target.value))}
              style={{ width: 80 }}
              min={gameState.bigBlind * 2}
            />
            <button onClick={() => onAction('raise', raiseAmount)} style={{ background: '#e94560', color: '#fff' }}>
              Raise
            </button>
          </div>

          <button onClick={() => onAction('all-in')} style={{ background: '#e94560', color: '#fff' }}>
            All In ({myPlayer.chips})
          </button>
        </div>
      )}
    </div>
  );
}
