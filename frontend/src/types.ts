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
}

export interface TableInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  phase: string;
}

export interface Player {
  id: string;
  name: string;
  chips: number;
}
