# Architecture

## Project Structure

```
poker-room/
├── backend/                         # NestJS application
│   ├── src/
│   │   ├── main.ts                  # Bootstrap, port 3005, CORS
│   │   ├── app.module.ts            # Root module
│   │   ├── player/
│   │   │   ├── player.module.ts     # Exports PlayerService, ConnectionService
│   │   │   ├── player.service.ts    # Persistent player registry (userId/socketId)
│   │   │   └── connection.service.ts # Timers: grace, sit-out, turn, heartbeat
│   │   ├── lobby/
│   │   │   ├── lobby.module.ts      # Imports PlayerModule, GameModule (forwardRef)
│   │   │   ├── lobby.service.ts     # Table CRUD, waitlists
│   │   │   └── lobby.gateway.ts     # WS: register, reconnect, heartbeat, lobby
│   │   └── game/
│   │       ├── game.module.ts       # Imports LobbyModule (forwardRef), PlayerModule
│   │       ├── game.service.ts      # Game orchestration, state views
│   │       ├── game.gateway.ts      # WS: join, leave, action, spectate, replay
│   │       └── poker-engine.ts      # Texas Hold'em: deck, deal, evaluate, phases
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
├── frontend/                        # React + Vite application
│   ├── src/
│   │   ├── main.tsx                 # ReactDOM entry
│   │   ├── App.tsx                  # Root: screens, socket, heartbeat, action queue
│   │   ├── types.ts                 # Shared TypeScript interfaces
│   │   ├── index.css                # Tailwind CSS + Obsidian Lounge @theme tokens
│   │   ├── hooks/
│   │   │   ├── useSocket.ts         # Socket.IO connection + auto-reconnect (sessionStorage)
│   │   │   ├── useHeartbeat.ts      # Custom heartbeat (5s interval, quality, latency)
│   │   │   └── useActionQueue.ts    # Offline action buffer + replay on reconnect
│   │   └── components/
│   │       ├── ui/
│   │       │   ├── Layout.tsx       # App shell: header + sidebar + content
│   │       │   ├── Header.tsx       # Top nav: logo, wallet, quality indicator
│   │       │   └── Sidebar.tsx      # Left nav + mobile bottom nav
│   │       ├── Login.tsx            # "Enter the Lounge" — name input
│   │       ├── Lobby.tsx            # Table cards grid + preview panel
│   │       ├── TableFilters.tsx     # Phase tabs, blinds range, sort controls
│   │       ├── TableList.tsx        # Card grid with badges, metrics, avatars
│   │       ├── TablePreview.tsx     # Glass panel: live preview + Join/Watch
│   │       ├── Table.tsx            # Oval poker table, absolute seats, action bar
│   │       ├── CardView.tsx         # 3 sizes, inverse-surface bg, suit colors
│   │       ├── TurnTimerBar.tsx     # Thin animated bar (primary→secondary→error)
│   │       └── ReconnectOverlay.tsx # Glass panel + backdrop-blur overlay
│   ├── index.html                   # Google Fonts (Manrope, Space Grotesk, Material Symbols)
│   ├── postcss.config.js
│   ├── vite.config.ts               # React + Tailwind CSS v4 plugin
│   ├── tsconfig.json
│   └── package.json
├── design/                          # Design mockups (HTML + screenshots)
│   ├── lobby/                       # Lobby screen mockup
│   ├── game_table/                  # Game table mockup
│   ├── cashier/                     # Cashier screen mockup
│   ├── player_profile/              # Profile dashboard mockup
│   └── royal_felt_steel/DESIGN.md   # "The Obsidian Lounge" design system spec
├── docs/                            # Documentation
├── package.json                     # npm workspaces root
└── .gitignore
```

## NestJS Module Graph

```mermaid
graph TD
    AppModule --> PlayerModule
    AppModule --> LobbyModule
    AppModule --> GameModule

    subgraph PlayerModule
        PlayerService["PlayerService<br/><i>userId/socketId registry<br/>disconnect/reconnect state</i>"]
        ConnectionService["ConnectionService<br/><i>grace, sit-out, turn, heartbeat timers</i>"]
    end

    subgraph LobbyModule
        LobbyGateway["LobbyGateway<br/><i>register, reconnect, heartbeat<br/>lobby:list, lobby:create</i>"]
        LobbyService["LobbyService<br/><i>table CRUD, waitlists</i>"]
    end

    subgraph GameModule
        GameGateway["GameGateway<br/><i>join, leave, start, action<br/>spectate, preview, replay<br/>sit-out, waitlist</i>"]
        GameService["GameService<br/><i>game orchestration<br/>player/spectator views</i>"]
        PokerEngine["PokerEngine<br/><i>Texas Hold'em logic<br/>deck, deal, evaluate</i>"]
    end

    LobbyModule -.->|forwardRef| GameModule
    GameModule -.->|forwardRef| LobbyModule
    LobbyModule --> PlayerModule
    GameModule --> PlayerModule

    GameService --> PokerEngine
    GameService --> LobbyService
    GameGateway --> GameService
    GameGateway --> PlayerService
    GameGateway --> ConnectionService
    LobbyGateway --> LobbyService
    LobbyGateway --> PlayerService
    LobbyGateway --> ConnectionService
    LobbyGateway -.->|forwardRef| GameGateway
    LobbyGateway -.->|forwardRef| GameService
```

## Frontend Component Tree

```mermaid
graph TD
    App["App.tsx<br/><i>screen routing, socket, heartbeat, action queue</i>"]

    App --> Login["Login.tsx<br/><i>name input form</i>"]
    App --> Lobby["Lobby.tsx<br/><i>split-panel layout</i>"]
    App --> Table["Table.tsx<br/><i>game UI (player + spectator modes)</i>"]
    App --> Overlay["ReconnectOverlay.tsx<br/><i>connection lost modal</i>"]

    Lobby --> TableFilters["TableFilters.tsx<br/><i>phase, blinds, seats, sort</i>"]
    Lobby --> TableList["TableList.tsx<br/><i>scrollable list with selection</i>"]
    Lobby --> TablePreview["TablePreview.tsx<br/><i>readonly table + action buttons</i>"]

    Table --> CardView["CardView.tsx<br/><i>single card</i>"]
    Table --> TurnTimerBar["TurnTimerBar.tsx<br/><i>countdown bar</i>"]
    TablePreview --> CardView

    subgraph Hooks
        useSocket["useSocket<br/><i>connection, reconnect, localStorage</i>"]
        useHeartbeat["useHeartbeat<br/><i>5s ping, quality, latency</i>"]
        useActionQueue["useActionQueue<br/><i>offline buffer, replay</i>"]
    end

    App --> useSocket
    App --> useHeartbeat
    App --> useActionQueue
```

## Data Flow

```mermaid
sequenceDiagram
    participant Browser as Browser (React)
    participant Socket as Socket.IO
    participant Gateway as NestJS Gateways
    participant Service as Services
    participant Engine as PokerEngine

    Browser->>Socket: emit('game:action', { action, seq })
    Socket->>Gateway: handleAction()
    Gateway->>Service: processAction()
    Service->>Engine: processAction()
    Engine-->>Service: updated GameState
    Service-->>Gateway: GameState
    Gateway->>Gateway: broadcastState()

    par For each seated player
        Gateway->>Socket: emit('game:state', playerView)
    and For each spectator
        Gateway->>Socket: emit('game:state', spectatorView)
    and For lobby previewers
        Gateway->>Socket: emit('game:preview:state', spectatorView)
    end

    Gateway->>Socket: emit('game:action:ack', { seq, success })
    Socket-->>Browser: state update + ack
```

## State Storage

All state is **in-memory** (no database). Server restart clears everything.

| Store | Location | Key | Value |
|---|---|---|---|
| Players | `PlayerService.bySocket` | socketId | Player |
| Players | `PlayerService.byUserId` | userId (UUID) | Player |
| Tables | `LobbyService.tables` | tableId | GameState |
| Table names | `LobbyService.tableNames` | tableId | string |
| Waitlists | `LobbyService.waitlists` | tableId | userId[] |
| Spectators | `GameGateway.spectators` | tableId | Set\<socketId\> |
| Previewers | `GameGateway.previewers` | tableId | Set\<socketId\> |
| Action seqs | `GameGateway.actionSeq` | tableId | number |
| Grace timers | `ConnectionService.graceTimers` | userId | Timer |
| Sit-out timers | `ConnectionService.sitOutTimers` | userId | Timer |
| Action timers | `ConnectionService.actionTimers` | tableId | Timer |
| Heartbeats | `ConnectionService.heartbeats` | socketId | HeartbeatState |
