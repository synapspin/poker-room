# Connection Resilience

Production-grade reconnection system inspired by PokerStars/GGPoker.

## Overview

```mermaid
stateDiagram-v2
    [*] --> Connected : socket connect

    Connected --> SoftDisconnect : missed 3 heartbeats (15s)
    SoftDisconnect --> Connected : heartbeat received
    SoftDisconnect --> HardDisconnect : socket disconnect event

    Connected --> HardDisconnect : socket disconnect event

    HardDisconnect --> GracePeriod : start 60s timer
    GracePeriod --> Reconnected : player:reconnect within 60s
    GracePeriod --> SittingOut : grace timer expired

    Reconnected --> Connected : full state restored

    SittingOut --> Connected : player:reconnect + sitback
    SittingOut --> Removed : sit-out timer expired (3 min)

    Removed --> [*] : player removed from table<br/>chips preserved in registry
```

## Heartbeat System

### How It Works

```
Client                          Server
  │                               │
  ├── heartbeat ──────────────────>│ recordHeartbeat(socketId)
  │                               │ quality = calculate(gap)
  │<──────────── heartbeat:ack ───┤ { quality, serverTime }
  │         (every 5 seconds)     │
  │                               │
  │   ╌╌╌ missed 3 heartbeats ╌╌╌│
  │                               │ softDisconnectTimer fires (15s)
  │                               │ → mark player "disconnected" at table
  │                               │ → broadcast updated state
  │                               │
  ├── heartbeat ──────────────────>│ cancel softDisconnectTimer
  │                               │ → unmark "disconnected"
  │<──────────── heartbeat:ack ───┤ quality: "stable"
```

### Timer Constants

| Constant | Value | Purpose |
|---|---|---|
| `HEARTBEAT_INTERVAL_MS` | 5,000 ms | Client ping frequency |
| `HEARTBEAT_TIMEOUT_MS` | 15,000 ms | 3 missed = soft disconnect |
| `HEARTBEAT_HARD_TIMEOUT_MS` | 90,000 ms | Consider fully disconnected |

### Connection Quality

| Quality | Condition | UI |
|---|---|---|
| `stable` | Gap < 12.5s between heartbeats | Green indicator |
| `unstable` | Gap 12.5s – 15s | Yellow indicator + pulsing glow + warning banner |
| `disconnected` | No heartbeat > 15s | Red indicator |

### Frontend Display

- **Header**: latency in ms (e.g. `42ms`) + colored indicator dot
- **Unstable banner**: "Unstable connection detected (Xms)" — yellow bar below header
- **Disconnected banner**: "Connection lost. Waiting to reconnect... (N actions queued)"

## Disconnect Grace Period

When a socket fully disconnects (not just missed heartbeats):

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant T as Table

    Note over C: Network lost
    C--xS: socket disconnect

    S->>S: playerService.markDisconnected(socketId)
    S->>T: mark seat.disconnected = true
    S->>S: connectionService.startGraceTimer(userId, 60s)
    S->>T: broadcastState() → others see "OFFLINE" badge

    alt Reconnects within 60s
        C->>S: new socket connects
        C->>S: player:reconnect { userId }
        S->>S: cancelGraceTimer(userId)
        S->>S: cancelSitOutTimer(userId)
        S->>S: playerService.reconnect(userId, newSocketId)
        S->>T: mark seat.disconnected = false
        S->>T: rejoin socket rooms
        S->>C: player:reconnected { player, screen, activeTableId, gameState }
        S->>T: broadcastState() → "OFFLINE" badge removed
    else Grace period expires (60s)
        S->>T: auto-fold if it's their turn
        S->>T: mark seat.sittingOut = true
        S->>S: startSitOutTimer(userId, 3min)
        S->>T: broadcastState() → "SIT OUT" badge
    end

    alt Sit-out timer expires (3 min)
        S->>T: remove player from table
        S->>T: tryPromoteWaitlist()
        S->>T: broadcastState()
        Note over S: Chips preserved in PlayerService<br/>Player can re-join manually
    end
```

### Timer Constants

| Timer | Duration | Trigger | Action |
|---|---|---|---|
| Grace period | 60s | Socket disconnect | Auto-fold + sit out |
| Sit-out | 3 min | Grace period expired | Remove from table |
| Stale player cleanup | 10 min | Periodic | Purge from PlayerService |

## Persistent Identity

### Problem

Socket.IO assigns a new `socketId` on every connection. If we used `socketId` as player identity, reconnection would create a "new" player.

### Solution

```mermaid
graph LR
    subgraph "Player Identity"
        userId["userId (UUID)<br/><i>persistent, never changes</i>"]
        socketId["socketId<br/><i>changes on reconnect</i>"]
    end

    subgraph "Storage"
        byUserId["byUserId Map<br/>userId → Player"]
        bySocket["bySocket Map<br/>socketId → Player"]
    end

    userId --> byUserId
    socketId --> bySocket

    subgraph "On Reconnect"
        R1["1. Find player by userId"]
        R2["2. Remove old socketId mapping"]
        R3["3. Bind new socketId"]
        R4["4. Update bySocket map"]
    end

    R1 --> R2 --> R3 --> R4
```

**Frontend**: `userId` saved in `localStorage` key `poker_room_userId`. On socket `connect` event, if saved userId exists → emit `player:reconnect` instead of showing Login.

## Turn Timer & Auto-Actions

When it becomes a player's turn, a countdown starts:

| Player State | Timer Duration | On Timeout |
|---|---|---|
| Connected | 30 seconds | Auto-check if possible, else auto-fold |
| Disconnected | 15 seconds | Auto-check if possible, else auto-fold |

```mermaid
flowchart TD
    Turn["Player's Turn"] --> Check{"Player connected?"}
    Check -->|Yes| T30["Start 30s timer"]
    Check -->|No| T15["Start 15s timer"]

    T30 --> Action{"Action received?"}
    T15 --> Action

    Action -->|Yes| Cancel["Cancel timer<br/>Process action<br/>Next player"]
    Action -->|Timeout| Auto{"Can check?"}

    Auto -->|Yes| AutoCheck["Auto-check"]
    Auto -->|No| AutoFold["Auto-fold"]

    AutoCheck --> Next["broadcastState()<br/>startTurnTimer() for next player"]
    AutoFold --> Next
```

The timer info is included in `GameState.turnTimer`:

```typescript
{
  playerId: string;    // whose turn
  startedAt: number;   // Date.now() when started
  duration: number;    // ms (30000 or 15000)
}
```

Frontend `TurnTimerBar` renders an animated bar:
- **Green** → **Yellow** → **Red** as time decreases
- Shows seconds remaining

## Action Replay Queue

Handles actions sent while offline.

```mermaid
sequenceDiagram
    participant UI as UI (Table.tsx)
    participant Q as useActionQueue
    participant S as Socket
    participant GW as GameGateway

    Note over S: Connection stable

    UI->>Q: enqueueAction('fold')
    Q->>Q: assign seq=1, timestamp=now
    Q->>S: emit game:action { action:'fold', seq:1 }
    Q->>Q: buffer action in queue
    GW->>S: game:action:ack { seq:1, success:true }
    S->>Q: remove seq:1 from queue

    Note over S: Connection lost

    UI->>Q: enqueueAction('call')
    Q->>Q: assign seq=2, timestamp=now
    Q->>Q: socket.connected=false → buffer only
    Note over Q: Queue: [{ action:'call', seq:2, ts:... }]

    Note over S: Reconnected

    Q->>S: emit game:action:replay { tableId, actions: [...queue] }
    GW->>GW: validate each action sequentially
    GW->>S: game:action:replay:result { results }
    S->>Q: clear replayed actions from queue
```

### Replay Validation Rules

| Check | Behavior |
|---|---|
| Action > 60s old | Skip as `expired` |
| Not player's turn | Reject as `invalid_action` |
| Wrong phase | Reject as `invalid_action` |
| After first failure | Skip remaining as `skipped_after_failure` |

### UI Feedback

- **Yellow banner** above action buttons: "N actions pending... (will replay on reconnect)"
- **Disconnected banner** in header: "Connection lost. Waiting to reconnect... (N actions queued)"

## Sitting Out

Players can voluntarily sit out or be auto-sat-out after grace period.

```mermaid
stateDiagram-v2
    Active --> SittingOut : game:sitout (voluntary)
    Active --> SittingOut : grace period expired (auto)

    SittingOut --> Active : game:sitback
    SittingOut --> Removed : sit-out timer (3 min, if disconnected)

    state SittingOut {
        [*] --> SkipHands : auto-fold each new hand
        SkipHands --> SkipHands : new hand dealt
    }
```

- Sitting-out players are **skipped** in dealer rotation
- Their cards are auto-folded each hand
- They keep their seat
- If disconnected + sitting out for 3 min → removed from table
- `game:sitback` cancels sit-out timer and restores active status

## Reconnect Overlay

Full-screen modal with:
- Spinner animation
- "Connection Lost" heading
- "Reconnecting... (attempt X)" — attempt count from Socket.IO
- "Your seat is reserved for 60 seconds" — reassurance

Shown when `reconnecting === true` (Socket.IO is attempting reconnection).
