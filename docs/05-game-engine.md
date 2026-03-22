# Texas Hold'em Engine

The poker engine (`backend/src/game/poker-engine.ts`) implements full Texas Hold'em rules.

## Game Phases

```mermaid
stateDiagram-v2
    [*] --> Waiting : table created

    Waiting --> Preflop : game:start (min 2 active)

    state "Active Hand" as Hand {
        Preflop --> Flop : betting complete
        Flop --> Turn : betting complete
        Turn --> River : betting complete
        River --> Showdown : betting complete
    }

    Preflop --> Showdown : all but 1 folded
    Flop --> Showdown : all but 1 folded
    Turn --> Showdown : all but 1 folded
    River --> Showdown : all but 1 folded

    Showdown --> Preflop : auto-start (5s delay)
    Showdown --> Waiting : < 2 active players
```

### Phase Details

| Phase | Community Cards | Action |
|---|---|---|
| `waiting` | — | Players joining, game not started |
| `preflop` | 0 | 2 hole cards dealt, blinds posted, betting |
| `flop` | 3 | 3 community cards revealed, betting |
| `turn` | 4 | 4th card revealed, betting |
| `river` | 5 | 5th card revealed, betting |
| `showdown` | 5 | Hands evaluated, pot awarded |

## Deal & Blinds

```mermaid
sequenceDiagram
    participant E as Engine
    participant D as Deck
    participant P as Players

    E->>D: createDeck() → 52 cards
    E->>D: shuffleDeck() → Fisher-Yates
    E->>E: Move dealer button (skip sitting-out)
    E->>P: Deal 2 cards to each active player
    E->>P: Post small blind (dealer+1)
    E->>P: Post big blind (dealer+2)
    E->>E: currentBet = bigBlind
    E->>E: currentPlayer = bigBlind+1
```

- **Sitting-out players**: skipped for dealer, blinds, and dealing
- **All-in on blind**: if chips < blind amount, posts all remaining chips
- **Deck**: standard 52 cards, 4 suits × 13 ranks

## Betting Logic

```mermaid
flowchart TD
    Start["Player's Turn"] --> Action{"Action?"}

    Action -->|fold| Fold["Mark folded"]
    Action -->|check| CheckValid{"bet >= currentBet?"}
    CheckValid -->|Yes| Check["Accept check"]
    CheckValid -->|No| Invalid["Reject"]

    Action -->|call| Call["Pay: min(currentBet - bet, chips)"]
    Call --> AllInCheck1{"chips = 0?"}
    AllInCheck1 -->|Yes| MarkAllIn1["Mark all-in"]

    Action -->|raise| Raise["Pay: amount - bet"]
    Raise --> AllInCheck2{"chips = 0?"}
    AllInCheck2 -->|Yes| MarkAllIn2["Mark all-in"]
    Raise --> ResetActed["Reset 'acted' for others"]

    Action -->|all-in| AllIn["Bet all remaining chips"]
    AllIn --> BetHigher{"bet > currentBet?"}
    BetHigher -->|Yes| ResetActed2["Reset 'acted' for others"]

    Fold --> PostAction
    Check --> PostAction
    MarkAllIn1 --> PostAction
    MarkAllIn2 --> PostAction
    ResetActed --> PostAction
    ResetActed2 --> PostAction

    PostAction["Mark player 'acted'"] --> OneLeft{"Only 1 non-folded?"}
    OneLeft -->|Yes| EndHand["End hand"]
    OneLeft -->|No| RoundDone{"All acted &<br/>bets matched?"}
    RoundDone -->|Yes| NextPhase["Advance phase"]
    RoundDone -->|No| NextPlayer["Next active player"]
```

### Round Completion

A betting round is complete when **all** non-folded, non-all-in players:
1. Have `acted === true`
2. Have `bet === currentBet`

A raise resets `acted = false` for all other active players.

## Hand Evaluation

Evaluates all C(7,5) = 21 five-card combinations from 7 available cards (2 hole + 5 community).

### Hand Rankings

| Rank | Hand | Score Base | Example |
|---:|---|---|---|
| 1 | Royal Flush | 9 × 10^10 | A K Q J 10 (same suit) |
| 2 | Straight Flush | 8 × 10^10 | 9 8 7 6 5 (same suit) |
| 3 | Four of a Kind | 7 × 10^10 | K K K K 3 |
| 4 | Full House | 6 × 10^10 | Q Q Q 7 7 |
| 5 | Flush | 5 × 10^10 | A J 8 4 2 (same suit) |
| 6 | Straight | 4 × 10^10 | 10 9 8 7 6 |
| 7 | Three of a Kind | 3 × 10^10 | 8 8 8 K 2 |
| 8 | Two Pair | 2 × 10^10 | J J 5 5 K |
| 9 | One Pair | 1 × 10^10 | A A 9 6 3 |
| 10 | High Card | 0 + kickers | A K J 8 3 |

### Scoring Formula

```
Score = handRank × 10^10 + kicker
kicker = Σ (cardValue × 15^(4-i))  for i = 0..4, sorted by count then value
```

Card values: 2=2, 3=3, ..., 10=10, J=11, Q=12, K=13, A=14

### Special Cases

- **Ace-low straight** (A-2-3-4-5): detected by checking `[14, 5, 4, 3, 2]`
- **Split pot**: equal scores → pot divided equally (floor division)
- **Winner by fold**: last remaining player wins pot, hand shown as "Last standing"

## Pot Management

- Each bet adds to `state.pot`
- At showdown, pot is awarded to winner(s)
- Split pot: `Math.floor(pot / numWinners)` per winner
- After showdown: `pot = 0`

## GameState Interface

```typescript
interface GameState {
  tableId: string;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  communityCards: Card[];        // 0-5 cards
  pot: number;
  players: PlayerSeat[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  winners?: { playerId: string; amount: number; hand: string }[];
  turnTimer?: { playerId: string; startedAt: number; duration: number };
}

interface PlayerSeat {
  playerId: string;    // = userId
  name: string;
  chips: number;
  cards: Card[];       // empty [] if hidden
  bet: number;         // current round bet
  totalBet: number;    // total bet this hand
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  disconnected: boolean;
  sittingOut: boolean;
}

interface Card {
  rank: '2' | '3' | ... | 'K' | 'A';
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}
```
