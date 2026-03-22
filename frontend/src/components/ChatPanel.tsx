import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  tableId: string;
  userId: string;
  name: string;
  text: string;
  type: 'player' | 'spectator' | 'system' | 'dealer';
  timestamp: number;
}

interface ChatPanelProps {
  socket: Socket;
  tableId: string;
  playerId: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  player: { label: '', color: 'text-on-surface' },
  spectator: { label: '', color: 'text-on-surface-variant' },
  system: { label: '', color: 'text-on-surface-variant/60' },
  dealer: { label: '', color: 'text-primary' },
};

export function ChatPanel({ socket, tableId, playerId, collapsed = false, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Request history on mount
    socket.emit('chat:history', { tableId });

    const handleMessage = (msg: ChatMessage) => {
      if (msg.tableId === tableId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleHistory = (data: { tableId: string; messages: ChatMessage[] }) => {
      if (data.tableId === tableId) {
        setMessages(data.messages);
      }
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:history', handleHistory);
    socket.on('chat:error', handleError);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:history', handleHistory);
      socket.off('chat:error', handleError);
    };
  }, [socket, tableId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    socket.emit('chat:send', { tableId, text });
    setInput('');
    inputRef.current?.focus();
  }, [socket, tableId, input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-24 md:bottom-4 z-40 glass-panel rounded-full p-3 hover:bg-surface-container-high transition-all duration-200"
        title="Open chat"
      >
        <span className="material-symbols-outlined text-primary">chat</span>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-on-primary text-[8px] font-label font-bold flex items-center justify-center">
            {messages.filter(m => m.type === 'player' || m.type === 'spectator').length > 99 ? '99' : ''}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 glass-panel flex flex-col h-full rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">chat</span>
          <span className="font-headline font-bold text-sm text-on-surface uppercase tracking-wider">
            Table Chat
          </span>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-on-surface-variant hover:text-on-surface transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-2 flex flex-col gap-1.5"
      >
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-outline font-label text-xs uppercase tracking-wider">
            No messages yet
          </div>
        )}

        {messages.map(msg => {
          const style = TYPE_STYLES[msg.type] || TYPE_STYLES.system;
          const isMe = msg.userId === playerId;

          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center py-1">
                <span className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
                  {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === 'dealer') {
            return (
              <div key={msg.id} className="flex items-start gap-2 py-0.5">
                <span className="material-symbols-outlined text-xs text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  playing_cards
                </span>
                <span className="font-label text-[11px] text-primary/80">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="group">
              <div className="flex items-baseline gap-2">
                <span className={`font-label text-[10px] font-bold ${isMe ? 'text-primary' : msg.type === 'spectator' ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {msg.name}
                  {msg.type === 'spectator' && (
                    <span className="text-[8px] text-outline ml-1 font-normal">(spectator)</span>
                  )}
                </span>
                <span className="font-label text-[8px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className={`font-body text-xs ${style.color} leading-relaxed break-words`}>
                {msg.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-1.5 bg-error/10 text-error text-center font-label text-[10px] uppercase tracking-wider">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-surface-container-highest border-none rounded-lg py-2 px-3 text-on-surface font-body text-xs placeholder:text-outline focus:ring-1 focus:ring-primary/40 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  );
}
