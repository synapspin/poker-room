# Poker Room — PoC

Real-time multiplayer Texas Hold'em poker room with lobby system.

**Stack**: NestJS + Socket.IO (backend) | React + Vite (frontend)

---

## Quick Start

```bash
# 1. Install dependencies (from root)
npm install

# 2. Start backend (terminal 1)
cd backend && npm run start:dev

# 3. Start frontend (terminal 2)
cd frontend && npm run dev
```

- Backend: `http://localhost:3005`
- Frontend: `http://localhost:5173`

Open 2+ browser tabs, register with different names, create a table, and play.

---

## Architecture

### Project Structure

```
poker-room/
├── backend/                    # NestJS application
│   ├── src/
│   │   ├── main.ts             # Entry point (port 3005)
│   │   ├── app.module.ts       # Root module
│   │   ├── player/
│   │   │   ├── player.module.ts
│   │   │   └── player.service.ts    # In-memory player registry
│   │   ├── lobby/
│   │   │   ├── lobby.module.ts
│   │   │   ├── lobby.service.ts     # Table management
│   │   │   └── lobby.gateway.ts     # WebSocket: register, list, create
│   │   └── game/
│   │       ├── game.module.ts
│   │       ├── game.service.ts      # Game orchestration
│   │       ├── game.gateway.ts      # WebSocket: join, leave, action
│   │       └── poker-engine.ts      # Texas Hold'em engine
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Root component, screen routing
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── index.css           # Global styles
│   │   ├── hooks/
│   │   │   └── useSocket.ts    # Socket.IO connection hook
│   │   └── components/
│   │       ├── Login.tsx       # Player name input
│   │       ├── Lobby.tsx       # Table list & creation
│   │       ├── Table.tsx       # Game UI: cards, actions, pot
│   │       └── CardView.tsx    # Single card renderer
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── package.json                # npm workspaces root
```

### NestJS Module Dependency Graph

```mermaid
graph TD
    AppModule --> PlayerModule
    AppModule --> LobbyModule
    AppModule --> GameModule

    PlayerModule --> PlayerService["PlayerService<br/><i>in-memory player storage</i>"]

    LobbyModule --> LobbyGateway["LobbyGateway<br/><i>WS: register, list, create</i>"]
    LobbyModule --> LobbyService["LobbyService<br/><i>table CRUD</i>"]
    LobbyModule -.->|imports| PlayerModule

    GameModule --> GameGateway["GameGateway<br/><i>WS: join, leave, start, action</i>"]
    GameModule --> GameService["GameService<br/><i>orchestration + state sanitization</i>"]
    GameModule --> PokerEngine["PokerEngine<br/><i>core poker logic</i>"]
    GameModule -.->|imports| LobbyModule
    GameModule -.->|imports| PlayerModule
```

### Frontend Screen Flow

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Lobby : player:register
    Lobby --> Table : game:join
    Table --> Lobby : game:leave
    Lobby --> Lobby : lobby:create / lobby:list

    state Table {
        Waiting --> Preflop : game:start
        Preflop --> Flop : betting done
        Flop --> Turn : betting done
        Turn --> River : betting done
        River --> Showdown : betting done
        Showdown --> Preflop : auto 5s
    }
```

### Client-Server Communication

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant S as Server (NestJS)

    C->>S: player:register { name }
    S->>C: player:registered { id, name, chips }

    C->>S: lobby:list
    S->>C: lobby:tables [TableInfo[]]

    C->>S: lobby:create { name, smallBlind, bigBlind }
    S->>C: lobby:created { tableId }
    S-->>C: lobby:tables (broadcast)

    C->>S: game:join { tableId }
    S->>C: game:state (personalized)
    S-->>C: lobby:tables (broadcast)

    C->>S: game:start { tableId }
    S->>C: game:state (preflop, cards dealt)

    loop Betting Rounds
        S->>C: game:state (current turn)
        C->>S: game:action { tableId, action, amount? }
        S->>C: game:state (updated)
    end

    S->>C: game:state (showdown + winners)
    Note over S: 5s delay
    S->>C: game:state (new hand auto-start)
```

---

## WebSocket Protocol

All communication uses Socket.IO over WebSocket transport.

### Player Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `player:register` | Client → Server | `{ name }` | Register player (1000 starting chips) |
| `player:registered` | Server → Client | `{ id, name, chips }` | Registration confirmed |

### Lobby Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `lobby:list` | Client → Server | — | Request table list |
| `lobby:tables` | Server → All | `TableInfo[]` | Updated table list |
| `lobby:create` | Client → Server | `{ name?, smallBlind?, bigBlind? }` | Create new table |
| `lobby:created` | Server → Client | `{ tableId }` | Table created, ready to join |

### Game Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `game:join` | Client → Server | `{ tableId }` | Join a table |
| `game:leave` | Client → Server | `{ tableId }` | Leave a table |
| `game:start` | Client → Server | `{ tableId }` | Start hand (min 2 players) |
| `game:action` | Client → Server | `{ tableId, action, amount? }` | Player action |
| `game:state` | Server → Client | `GameState` | Personalized game state update |
| `error` | Server → Client | `{ message }` | Error notification |

**Actions**: `fold` | `check` | `call` | `raise` | `all-in`

---

## Game Flow

### Texas Hold'em Phases

```mermaid
graph LR
    W[waiting] -->|game:start| P[preflop<br/>2 cards + blinds]
    P -->|betting done| F[flop<br/>+3 community cards]
    F -->|betting done| T[turn<br/>+1 card]
    T -->|betting done| R[river<br/>+1 card]
    R -->|betting done| S[showdown<br/>evaluate winners]
    S -->|5s auto| P
```

### Betting Round Logic

```mermaid
flowchart TD
    Turn["Current Player's Turn"] --> Fold
    Turn --> Check["Check<br/>(if bet matched)"]
    Turn --> Call
    Turn --> Raise
    Turn --> AllIn["All-In"]

    Fold --> NextCheck
    Check --> NextCheck
    Call --> NextCheck

    Raise --> Reset["Reset other players<br/>'acted' flags"]
    AllIn --> RaiseCheck{"Bet > current?"}
    RaiseCheck -->|Yes| Reset
    RaiseCheck -->|No| NextCheck

    Reset --> NextCheck{"All acted &<br/>bets matched?"}

    NextCheck -->|Yes| NextPhase["Advance Phase"]
    NextCheck -->|No| NextPlayer["Next Active Player"]
    NextPlayer --> Turn
```

### Hand Rankings (best 5 of 7 cards)

| Rank | Hand | Score |
|---:|---|---|
| 1 | Royal Flush | 9×10¹⁰ |
| 2 | Straight Flush | 8×10¹⁰ |
| 3 | Four of a Kind | 7×10¹⁰ |
| 4 | Full House | 6×10¹⁰ |
| 5 | Flush | 5×10¹⁰ |
| 6 | Straight | 4×10¹⁰ |
| 7 | Three of a Kind | 3×10¹⁰ |
| 8 | Two Pair | 2×10¹⁰ |
| 9 | One Pair | 1×10¹⁰ |
| 10 | High Card | kickers |

---

## Key Data Types

### GameState (server → client)

```typescript
{
  tableId: string
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  communityCards: Card[]       // 0–5 cards
  pot: number
  players: PlayerSeat[]
  currentPlayerIndex: number
  dealerIndex: number
  smallBlind: number
  bigBlind: number
  currentBet: number
  winners?: { playerId, amount, hand }[]
}
```

### PlayerSeat

```typescript
{
  playerId: string
  name: string
  chips: number
  cards: Card[]     // hidden for opponents (empty array)
  bet: number       // current round bet
  totalBet: number  // total hand bet
  folded: boolean
  allIn: boolean
}
```

### Card

```typescript
{
  rank: '2'–'10' | 'J' | 'Q' | 'K' | 'A'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
}
```

---

## Design Decisions

- **In-memory storage** — all state lives in memory, resets on restart (PoC scope)
- **Personalized state** — each player receives `game:state` with only their own cards visible (opponents' cards = `[]`), except during showdown
- **Socket.IO rooms** — players at same table share a room (`tableId`) for efficient broadcasting
- **Auto-restart** — new hand starts automatically 5 seconds after showdown if 2+ players have chips
- **Table cleanup** — empty tables are automatically deleted when last player disconnects
- **Max 6 players per table** — configurable in lobby service
- **Starting stack** — 1000 chips per player
