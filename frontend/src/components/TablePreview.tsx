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
  waitlistPosition: number;
}

export function TablePreview({
  tableInfo, previewState, playerId,
  onJoin, onWatch, onWaitlistJoin, onWaitlistLeave, waitlistPosition,
}: TablePreviewProps) {
  if (!tableInfo) {
    return (
      <div className="glass-panel rounded-xl h-full flex flex-col items-center justify-center text-on-surface-variant p-8">
        <span className="material-symbols-outlined text-5xl mb-4 text-outline/50">playing_cards</span>
        <p className="font-headline font-bold text-lg">Select a Table</p>
        <p className="text-xs font-label uppercase tracking-wider mt-1">Click any table to preview the action</p>
      </div>
    );
  }

  const isFull = tableInfo.playerCount >= tableInfo.maxPlayers;
  const isAlreadySeated = previewState?.players.some(p => p.playerId === playerId) ?? false;
  const isInWaitlist = waitlistPosition > 0;

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 flex justify-between items-start">
        <div>
          <h3 className="font-headline font-bold text-xl text-on-surface">{tableInfo.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              {tableInfo.playerCount}/{tableInfo.maxPlayers} players
            </span>
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              ${tableInfo.smallBlind}/${tableInfo.bigBlind}
            </span>
            <span className={`font-label text-[10px] uppercase tracking-[0.2em] ${tableInfo.phase === 'waiting' ? 'text-on-surface-variant' : 'text-primary'}`}>
              {tableInfo.phase}
            </span>
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar">
        {previewState && previewState.players.length > 0 ? (
          <>
            {/* Mini table */}
            <div className="poker-table-gradient rounded-[80px] py-6 px-8 flex items-center justify-center gap-2 mb-4 min-h-[80px]">
              {previewState.communityCards.length > 0
                ? previewState.communityCards.map((card, i) => <CardView key={i} card={card} size="sm" />)
                : <span className="text-outline/30 font-label text-xs uppercase tracking-wider">No cards yet</span>
              }
            </div>

            {/* Pot */}
            {previewState.pot > 0 && (
              <div className="text-center mb-3">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Pot</span>
                <span className="ml-2 font-label font-bold text-primary">${previewState.pot}</span>
              </div>
            )}

            {/* Winners */}
            {previewState.phase === 'showdown' && previewState.winners && (
              <div className="mb-3 py-2 px-4 rounded-lg bg-primary/10 text-center">
                {previewState.winners.map((w, i) => {
                  const wp = previewState.players.find(p => p.playerId === w.playerId);
                  return (
                    <div key={i} className="font-label text-xs text-primary font-bold">
                      {wp?.name} wins ${w.amount} — {w.hand}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Players */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {previewState.players.map((player, idx) => {
                const isTurn = idx === previewState.currentPlayerIndex
                  && previewState.phase !== 'waiting' && previewState.phase !== 'showdown';
                return (
                  <div
                    key={player.playerId}
                    className={`bg-surface-container-highest rounded-lg p-3 transition-all duration-200
                      ${isTurn ? 'ring-1 ring-primary/40' : ''}
                      ${player.folded || player.sittingOut ? 'opacity-40' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-body text-xs font-semibold text-on-surface truncate">{player.name}</span>
                      <span className="font-label text-[10px] text-primary font-bold">${player.chips}</span>
                    </div>
                    <div className="flex gap-1">
                      {player.cards.length > 0
                        ? player.cards.map((c, i) => <CardView key={i} card={c} size="sm" />)
                        : previewState.phase !== 'waiting' && !player.sittingOut && <><CardView hidden size="sm" /><CardView hidden size="sm" /></>
                      }
                    </div>
                    {player.disconnected && (
                      <span className="inline-block mt-1 text-[8px] font-label uppercase tracking-wider text-error">Offline</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant py-12">
            <p className="font-label text-xs uppercase tracking-wider">
              {tableInfo.playerCount === 0 ? 'Empty table' : 'Loading preview...'}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-5 flex gap-3 border-t border-outline-variant/10">
        {!isAlreadySeated && !isFull && (
          <button
            onClick={() => onJoin(tableInfo.id)}
            className="flex-1 py-2.5 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            Take a Seat
          </button>
        )}

        {!isAlreadySeated && isFull && !isInWaitlist && (
          <button
            onClick={() => onWaitlistJoin(tableInfo.id)}
            className="flex-1 py-2.5 bg-secondary/10 text-secondary font-label text-xs font-bold uppercase tracking-wider rounded-lg border border-secondary/20 hover:bg-secondary/20 active:scale-[0.98] transition-all duration-200"
          >
            Join Waitlist
          </button>
        )}

        {isInWaitlist && (
          <button
            onClick={() => onWaitlistLeave(tableInfo.id)}
            className="flex-1 py-2.5 bg-surface-container-highest text-on-surface-variant font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:text-on-surface active:scale-[0.98] transition-all duration-200"
          >
            Leave Waitlist (#{waitlistPosition})
          </button>
        )}

        <button
          onClick={() => onWatch(tableInfo.id)}
          className="flex-1 py-2.5 bg-surface-container-highest text-on-surface-variant font-label text-xs font-bold uppercase tracking-wider rounded-lg hover:text-on-surface active:scale-[0.98] transition-all duration-200"
        >
          Spectate
        </button>
      </div>
    </div>
  );
}
