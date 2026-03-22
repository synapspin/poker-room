import { Injectable } from '@nestjs/common';

export interface ChatMessage {
  id: string;
  tableId: string;
  userId: string;
  name: string;
  text: string;
  type: 'player' | 'spectator' | 'system' | 'dealer';
  timestamp: number;
}

const MAX_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 200;
const RATE_LIMIT_WINDOW = 10_000; // 10 seconds
const RATE_LIMIT_MAX = 5; // max 5 messages per window
const MUTE_DURATION = 60_000; // 1 minute mute for spam

@Injectable()
export class ChatService {
  private history = new Map<string, ChatMessage[]>(); // tableId → messages
  private rateLimits = new Map<string, number[]>(); // userId → timestamps
  private muted = new Map<string, number>(); // userId → mute expires at
  private messageCounter = 0;

  getHistory(tableId: string): ChatMessage[] {
    return this.history.get(tableId) || [];
  }

  addMessage(
    tableId: string,
    userId: string,
    name: string,
    text: string,
    type: 'player' | 'spectator',
  ): { message?: ChatMessage; error?: string } {
    // Check mute
    const muteExpires = this.muted.get(userId);
    if (muteExpires && Date.now() < muteExpires) {
      const remaining = Math.ceil((muteExpires - Date.now()) / 1000);
      return { error: `Muted for ${remaining}s` };
    }
    this.muted.delete(userId);

    // Sanitize
    const sanitized = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!sanitized) return { error: 'Empty message' };

    // Rate limit
    if (!this.checkRateLimit(userId)) {
      this.muted.set(userId, Date.now() + MUTE_DURATION);
      return { error: 'Too many messages. Muted for 60s.' };
    }

    const message: ChatMessage = {
      id: `msg_${++this.messageCounter}`,
      tableId,
      userId,
      name,
      text: sanitized,
      type,
      timestamp: Date.now(),
    };

    let history = this.history.get(tableId);
    if (!history) {
      history = [];
      this.history.set(tableId, history);
    }
    history.push(message);

    // Trim old messages
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    return { message };
  }

  addSystemMessage(tableId: string, text: string, type: 'system' | 'dealer' = 'system'): ChatMessage {
    const message: ChatMessage = {
      id: `msg_${++this.messageCounter}`,
      tableId,
      userId: '__system__',
      name: type === 'dealer' ? 'Dealer' : 'System',
      text,
      type,
      timestamp: Date.now(),
    };

    let history = this.history.get(tableId);
    if (!history) {
      history = [];
      this.history.set(tableId, history);
    }
    history.push(message);

    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    return message;
  }

  clearTable(tableId: string): void {
    this.history.delete(tableId);
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    let timestamps = this.rateLimits.get(userId);
    if (!timestamps) {
      timestamps = [];
      this.rateLimits.set(userId, timestamps);
    }

    // Remove old timestamps
    const cutoff = now - RATE_LIMIT_WINDOW;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= RATE_LIMIT_MAX) {
      return false;
    }

    timestamps.push(now);
    return true;
  }
}
