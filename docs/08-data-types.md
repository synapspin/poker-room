# Data Types Reference

## Backend Types

### Player (`player.service.ts`)

```typescript
interface Player {
  userId: string;              // Persistent UUID (crypto.randomUUID)
  socketId: string;            // Current Socket.IO id (changes on reconnect)
  name: string;                // Display name
  chips: number;               // Chip balance (starts at 1000)
  disconnected: boolean;       // Currently offline
  disconnectedAt: number | null; // Timestamp of disconnect
}
```

### Card (`poker-engine.ts`)

```typescript
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  rank: Rank;
  suit: Suit;
}
```

### PlayerSeat (`poker-engine.ts`)

```typescript
interface PlayerSeat {
  playerId: string;      // = userId
  name: string;
  chips: number;
  cards: Card[];         // 2 cards, or [] if hidden
  bet: number;           // Current round bet
  totalBet: number;      // Total bet this hand
  folded: boolean;
  allIn: boolean;
  acted: boolean;        // Has acted this round
  disconnected: boolean; // Connection lost
  sittingOut: boolean;   // Sitting out (manual or auto)
}
```

### TurnTimer (`poker-engine.ts`)

```typescript
interface TurnTimer {
  playerId: string;    // Whose turn it is
  startedAt: number;   // Date.now() when timer started
  duration: number;    // Milliseconds (30000 or 15000)
}
```

### GameState (`poker-engine.ts`)

```typescript
type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

interface GameState {
  tableId: string;
  phase: GamePhase;
  communityCards: Card[];
  pot: number;
  players: PlayerSeat[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  winners?: {
    playerId: string;
    amount: number;
    hand: string;        // "Royal Flush", "Full House", "Last standing", etc.
  }[];
  turnTimer?: TurnTimer;
  spectators?: { name: string; odId: string }[];  // Spectators at the rail
  maxPlayers?: number;                              // Always 6
}
```

### TableInfo (`lobby.service.ts`)

```typescript
interface TableInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;    // Always 6
  smallBlind: number;
  bigBlind: number;
  phase: GamePhase;
  waitlistCount: number;
}
```

### HeartbeatState (`connection.service.ts`)

```typescript
type ConnectionQuality = 'stable' | 'unstable' | 'disconnected';

interface HeartbeatState {
  lastPing: number;                    // Last heartbeat timestamp
  quality: ConnectionQuality;
  softDisconnectTimer?: NodeJS.Timeout;
}
```

## Frontend Types (`types.ts`)

Frontend mirrors backend types with relaxed typing (strings instead of unions for compatibility):

```typescript
interface Card {
  rank: string;
  suit: string;
}

interface PlayerSeat {
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

interface TurnTimer {
  playerId: string;
  startedAt: number;
  duration: number;
}

interface GameState {
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

interface TableInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  phase: string;
  waitlistCount: number;
}

interface Player {
  id: string;       // = userId
  userId: string;
  name: string;
  chips: number;
}
```

### Filter Types

```typescript
type PhaseFilter = 'all' | 'waiting' | 'playing';
type SortBy = 'name' | 'players' | 'blinds';
type SortDir = 'asc' | 'desc';

interface TableFiltersState {
  phase: PhaseFilter;
  minBlind: number;
  maxBlind: number;
  hasSeats: boolean;
  sortBy: SortBy;
  sortDir: SortDir;
}
```

## Constants

| Constant | Value | File |
|---|---|---|
| `GRACE_PERIOD_MS` | 60,000 ms (1 min) | `connection.service.ts` |
| `SIT_OUT_TIMEOUT_MS` | 180,000 ms (3 min) | `connection.service.ts` |
| `TURN_TIMER_MS` | 30,000 ms (30s) | `connection.service.ts` |
| `TURN_TIMER_DISCONNECTED_MS` | 15,000 ms (15s) | `connection.service.ts` |
| `HEARTBEAT_INTERVAL_MS` | 5,000 ms (5s) | `connection.service.ts` |
| `HEARTBEAT_TIMEOUT_MS` | 15,000 ms (15s) | `connection.service.ts` |
| `HEARTBEAT_HARD_TIMEOUT_MS` | 90,000 ms (90s) | `connection.service.ts` |
| Max players per table | 6 | `lobby.service.ts` |
| Starting chips | 1,000 | `player.service.ts` |
| Showdown auto-restart delay | 5,000 ms (5s) | `game.gateway.ts` |
| Replay action max age | 60,000 ms (1 min) | `game.gateway.ts` |
| Backend port | 3005 | `main.ts` |
| Frontend port | 5173 | `vite.config.ts` |
