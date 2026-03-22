export interface Card {
  rank: string;
  suit: string;
}

export interface PlayerSeat {
  playerId: string;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  disconnected: boolean;
  sittingOut: boolean;
}

export interface TurnTimer {
  playerId: string;
  startedAt: number;
  duration: number;
}

export interface GameState {
  tableId: string;
  phase: string;
  communityCards: Card[];
  pot: number;
  players: PlayerSeat[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  winners?: { playerId: string; amount: number; hand: string }[];
  turnTimer?: TurnTimer;
}

export interface TableInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  phase: string;
  waitlistCount: number;
}

export interface Player {
  id: string;
  userId: string;
  name: string;
  chips: number;
}

export type PhaseFilter = 'all' | 'waiting' | 'playing';
export type SortBy = 'name' | 'players' | 'blinds';
export type SortDir = 'asc' | 'desc';

export interface TableFiltersState {
  phase: PhaseFilter;
  minBlind: number;
  maxBlind: number;
  hasSeats: boolean;
  sortBy: SortBy;
  sortDir: SortDir;
}
