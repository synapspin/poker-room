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

// Player seat positions around the oval table (percentage based)
const SEAT_POSITIONS = [
  { top: '78%', left: '25%' },  // bottom-left
  { top: '78%', left: '75%' },  // bottom-right
  { top: '35%', left: '95%' },  // right
  { top: '-5%', left: '70%' },  // top-right
  { top: '-5%', left: '30%' },  // top-left
  { top: '35%', left: '5%' },   // left
];

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
    <div className="h-full flex flex-col bg-surface">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface-container-low ambient-shadow">
        <div className="flex items-center gap-4">
          <button onClick={onLeave} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors duration-200">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span className="font-label text-xs uppercase tracking-wider hidden sm:inline">
              {spectator ? 'Stop Watching' : 'Leave'}
            </span>
          </button>
          <div className="h-4 w-px bg-outline-variant/30" />
          <span className="font-label text-xs tracking-widest text-on-surface-variant uppercase">
            Table #{gameState.tableId.split('_')[1]}
          </span>
          {spectator && (
            <span className="px-3 py-1 rounded-md bg-surface-container-highest text-on-surface-variant text-[10px] font-label font-bold uppercase tracking-wider">
              Spectating
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!spectator && isSeated && !isWaiting && (
            <button
              onClick={isSittingOut ? onSitBack : onSitOut}
              className="px-3 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant font-label text-[10px] uppercase tracking-wider hover:text-on-surface transition-colors duration-200"
            >
              {isSittingOut ? 'Sit Back' : 'Sit Out'}
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Phase</span>
            <span className="font-label text-xs font-bold text-primary uppercase">{gameState.phase}</span>
          </div>
        </div>
      </div>

      {/* Main table area */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Oval poker table */}
        <div className="relative w-full max-w-4xl aspect-[21/10]">
          {/* Table outer ring */}
          <div className="absolute inset-0 rounded-[200px] bg-surface-container-high border-[6px] border-surface-container-highest" />

          {/* Table felt (inner) */}
          <div className="absolute inset-4 rounded-[180px] poker-table-gradient flex flex-col items-center justify-center gap-2">
            {/* Pot */}
            {gameState.pot > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Pot</span>
                <span className="font-label font-bold text-lg text-on-surface">${gameState.pot}</span>
              </div>
            )}

            {/* Community cards */}
            <div className="flex gap-2">
              {gameState.communityCards.length > 0
                ? gameState.communityCards.map((card, i) => <CardView key={i} card={card} size="md" />)
                : !isWaiting && (
                    <div className="flex gap-2">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="w-14 h-20 rounded-lg border border-outline-variant/10" />
                      ))}
                    </div>
                  )
              }
            </div>
          </div>

          {/* Winners overlay */}
          {isShowdown && gameState.winners && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="glass-panel rounded-xl px-6 py-3 text-center">
                {gameState.winners.map((w, i) => {
                  const wp = gameState.players.find(p => p.playerId === w.playerId);
                  return (
                    <div key={i} className="font-headline font-bold text-primary text-sm">
                      {wp?.name} wins ${w.amount} — {w.hand}
                    </div>
                  );
                })}
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
                  New hand in 5s
                </span>
              </div>
            </div>
          )}

          {/* Player seats */}
          {gameState.players.map((player, idx) => {
            const pos = SEAT_POSITIONS[idx % SEAT_POSITIONS.length];
            const isCurrentTurn = idx === gameState.currentPlayerIndex && !isWaiting && !isShowdown;
            const isMe = !spectator && player.playerId === playerId;
            const isDealer = idx === gameState.dealerIndex;
            const showTimer = isCurrentTurn && gameState.turnTimer && gameState.turnTimer.playerId === player.playerId;

            return (
              <div
                key={player.playerId}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-all duration-300"
                style={{ top: pos.top, left: pos.left }}
              >
                {/* Cards */}
                <div className="flex gap-0.5 mb-1">
                  {player.cards.length > 0
                    ? player.cards.map((card, i) => <CardView key={i} card={card} size="sm" />)
                    : !isWaiting && !player.sittingOut && !player.folded && <><CardView hidden size="sm" /><CardView hidden size="sm" /></>
                  }
                </div>

                {/* Player info card */}
                <div className={`glass-panel rounded-xl px-3 py-2 min-w-[90px] text-center transition-all duration-200 relative
                  ${isCurrentTurn ? 'ring-2 ring-primary/60' : ''}
                  ${isMe ? 'ring-1 ring-primary/20' : ''}
                  ${player.folded || player.sittingOut ? 'opacity-40' : ''}`}
                >
                  {/* Dealer chip */}
                  {isDealer && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center text-[8px] font-label font-bold">
                      D
                    </div>
                  )}

                  {/* Disconnect badge */}
                  {player.disconnected && (
                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-error flex items-center justify-center">
                      <span className="material-symbols-outlined text-[10px] text-on-error">wifi_off</span>
                    </div>
                  )}

                  {/* Sitting out badge */}
                  {player.sittingOut && !player.disconnected && (
                    <div className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded bg-surface-container-highest text-[7px] font-label text-on-surface-variant uppercase">
                      Out
                    </div>
                  )}

                  <div className="font-body text-[10px] font-semibold text-on-surface truncate max-w-[80px]">
                    {player.name} {isMe ? '(You)' : ''}
                  </div>
                  <div className="font-label text-xs font-bold text-primary">${player.chips}</div>

                  {player.bet > 0 && !player.folded && (
                    <div className="font-label text-[9px] text-secondary">{player.allIn ? 'ALL IN' : `Bet: $${player.bet}`}</div>
                  )}
                  {player.folded && (
                    <div className="font-label text-[9px] text-on-surface-variant">Folded</div>
                  )}
                </div>

                {/* Turn timer */}
                {showTimer && gameState.turnTimer && (
                  <div className="w-[90px]">
                    <TurnTimerBar timer={gameState.turnTimer} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending actions */}
      {pendingActions > 0 && (
        <div className="px-6 py-2 bg-secondary/10 text-secondary text-center text-xs font-label font-bold uppercase tracking-wider">
          {pendingActions} action{pendingActions > 1 ? 's' : ''} pending — will replay on reconnect
        </div>
      )}

      {/* Action bar */}
      <div className="bg-surface-container-low px-6 py-4">
        {!spectator && isSeated && isWaiting && (
          <div className="flex justify-center">
            <button
              onClick={onStart}
              disabled={gameState.players.filter(p => !p.sittingOut).length < 2}
              className="px-12 py-3 bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {gameState.players.filter(p => !p.sittingOut).length < 2
                ? 'Waiting for players...'
                : 'Deal Cards'}
            </button>
          </div>
        )}

        {isMyTurn && !isWaiting && !isShowdown && myPlayer && !myPlayer.folded && !myPlayer.allIn && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => onAction('fold')}
              className="px-6 py-3 bg-surface-container-highest text-on-surface font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-surface-bright active:scale-[0.98] transition-all duration-200"
            >
              Fold
            </button>

            {canCheck ? (
              <button
                onClick={() => onAction('check')}
                className="px-6 py-3 bg-surface-container-highest text-on-surface font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-surface-bright active:scale-[0.98] transition-all duration-200"
              >
                Check
              </button>
            ) : (
              <button
                onClick={() => onAction('call')}
                className="px-8 py-3 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200"
              >
                Call ${callAmount}
              </button>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={raiseAmount}
                onChange={e => setRaiseAmount(Number(e.target.value))}
                min={gameState.bigBlind * 2}
                className="w-20 bg-surface-container-highest border-none rounded-lg py-3 px-3 text-on-surface font-label text-xs text-center focus:ring-1 focus:ring-primary/40 focus:outline-none"
              />
              <button
                onClick={() => onAction('raise', raiseAmount)}
                className="px-6 py-3 bg-tertiary/10 text-tertiary font-label text-xs font-bold uppercase tracking-wider rounded-lg border border-tertiary/20 hover:bg-tertiary/20 active:scale-[0.98] transition-all duration-200"
              >
                Raise
              </button>
            </div>

            <button
              onClick={() => onAction('all-in')}
              className="px-6 py-3 bg-tertiary text-on-tertiary font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200"
            >
              All In ${myPlayer.chips}
            </button>
          </div>
        )}

        {/* Spectator / not your turn */}
        {!isMyTurn && !isWaiting && !isShowdown && !spectator && isSeated && (
          <div className="text-center">
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
              Waiting for {gameState.players[gameState.currentPlayerIndex]?.name || 'opponent'}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
