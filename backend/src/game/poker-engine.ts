export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

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
  phase: GamePhase;
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
  spectators?: { name: string; odId: string }[];
  maxPlayers?: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class PokerEngine {
  private deck: Card[] = [];

  createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  initGame(state: GameState): GameState {
    // Check we have enough active (non-sitting-out) players
    const activePlayers = state.players.filter(p => !p.sittingOut);
    if (activePlayers.length < 2) return state;

    this.deck = this.shuffleDeck(this.createDeck());

    state.phase = 'preflop';
    state.communityCards = [];
    state.pot = 0;
    state.currentBet = 0;
    state.winners = undefined;
    state.turnTimer = undefined;

    // Reset players
    for (const p of state.players) {
      p.cards = [];
      p.bet = 0;
      p.totalBet = 0;
      p.allIn = false;
      p.acted = false;
      // Sitting out players auto-fold
      p.folded = p.sittingOut;
    }

    // Move dealer (skip sitting-out players)
    state.dealerIndex = this.nextNonSittingOut(state, state.dealerIndex);

    // Deal 2 cards to each active player
    for (const p of state.players) {
      if (!p.sittingOut) {
        p.cards = [this.deck.pop()!, this.deck.pop()!];
      }
    }

    // Post blinds (skip sitting-out)
    const sbIndex = this.nextNonSittingOut(state, state.dealerIndex);
    const bbIndex = this.nextNonSittingOut(state, sbIndex);

    this.postBlind(state, sbIndex, state.smallBlind);
    this.postBlind(state, bbIndex, state.bigBlind);

    state.currentBet = state.bigBlind;
    state.currentPlayerIndex = this.nextActivePlayer(state, bbIndex);

    return state;
  }

  private nextNonSittingOut(state: GameState, fromIndex: number): number {
    let next = (fromIndex + 1) % state.players.length;
    let tries = 0;
    while (tries < state.players.length) {
      if (!state.players[next].sittingOut) return next;
      next = (next + 1) % state.players.length;
      tries++;
    }
    return fromIndex;
  }

  private postBlind(state: GameState, index: number, amount: number): void {
    const player = state.players[index];
    const blindAmount = Math.min(amount, player.chips);
    player.chips -= blindAmount;
    player.bet = blindAmount;
    player.totalBet = blindAmount;
    state.pot += blindAmount;
    if (player.chips === 0) {
      player.allIn = true;
    }
  }

  processAction(state: GameState, playerId: string, action: ActionType, raiseAmount?: number): GameState {
    const playerIndex = state.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return state;

    const player = state.players[playerIndex];
    if (player.folded || player.allIn) return state;

    switch (action) {
      case 'fold':
        player.folded = true;
        break;

      case 'check':
        if (state.currentBet > player.bet) return state; // Can't check
        break;

      case 'call': {
        const callAmount = Math.min(state.currentBet - player.bet, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        player.totalBet += callAmount;
        state.pot += callAmount;
        if (player.chips === 0) player.allIn = true;
        break;
      }

      case 'raise': {
        const minRaise = state.currentBet * 2;
        const amount = raiseAmount || minRaise;
        const totalToCall = amount - player.bet;
        const actualAmount = Math.min(totalToCall, player.chips);
        player.chips -= actualAmount;
        player.bet += actualAmount;
        player.totalBet += actualAmount;
        state.pot += actualAmount;
        state.currentBet = player.bet;
        if (player.chips === 0) player.allIn = true;
        // Reset acted flags for other active players
        for (const p of state.players) {
          if (p.playerId !== playerId && !p.folded && !p.allIn) {
            p.acted = false;
          }
        }
        break;
      }

      case 'all-in': {
        const allInAmount = player.chips;
        player.bet += allInAmount;
        player.totalBet += allInAmount;
        state.pot += allInAmount;
        player.chips = 0;
        player.allIn = true;
        if (player.bet > state.currentBet) {
          state.currentBet = player.bet;
          for (const p of state.players) {
            if (p.playerId !== playerId && !p.folded && !p.allIn) {
              p.acted = false;
            }
          }
        }
        break;
      }
    }

    player.acted = true;

    // Check if only one player remains
    const activePlayers = state.players.filter(p => !p.folded);
    if (activePlayers.length === 1) {
      return this.endHand(state);
    }

    // Move to next player or next phase
    if (this.isRoundComplete(state)) {
      return this.advancePhase(state);
    }

    state.currentPlayerIndex = this.nextActivePlayer(state, playerIndex);
    return state;
  }

  private isRoundComplete(state: GameState): boolean {
    const activePlayers = state.players.filter(p => !p.folded && !p.allIn);
    return activePlayers.every(p => p.acted && p.bet === state.currentBet);
  }

  private nextActivePlayer(state: GameState, fromIndex: number): number {
    let next = (fromIndex + 1) % state.players.length;
    while (next !== fromIndex) {
      const p = state.players[next];
      if (!p.folded && !p.allIn) return next;
      next = (next + 1) % state.players.length;
    }
    return fromIndex;
  }

  private advancePhase(state: GameState): GameState {
    // Reset bets for new round
    for (const p of state.players) {
      p.bet = 0;
      p.acted = false;
    }
    state.currentBet = 0;

    const activePlayers = state.players.filter(p => !p.folded && !p.allIn);

    switch (state.phase) {
      case 'preflop':
        state.phase = 'flop';
        state.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
        break;
      case 'flop':
        state.phase = 'turn';
        state.communityCards.push(this.deck.pop()!);
        break;
      case 'turn':
        state.phase = 'river';
        state.communityCards.push(this.deck.pop()!);
        break;
      case 'river':
        return this.endHand(state);
    }

    // If only one active (non-allin) player or no active players, skip to showdown
    if (activePlayers.length <= 1) {
      // Deal remaining community cards and end hand
      while (state.communityCards.length < 5) {
        if (state.phase === 'flop') {
          state.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
          state.phase = 'turn';
        }
        if (state.communityCards.length < 5) {
          state.communityCards.push(this.deck.pop()!);
        }
        if (state.phase === 'turn') state.phase = 'river';
      }
      return this.endHand(state);
    }

    state.currentPlayerIndex = this.nextActivePlayer(state, state.dealerIndex);
    return state;
  }

  private endHand(state: GameState): GameState {
    state.phase = 'showdown';
    const activePlayers = state.players.filter(p => !p.folded);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.chips += state.pot;
      state.winners = [{
        playerId: winner.playerId,
        amount: state.pot,
        hand: 'Last standing',
      }];
    } else {
      // Evaluate hands and determine winner
      let bestScore = -1;
      let bestPlayers: PlayerSeat[] = [];
      let bestHandName = '';

      for (const p of activePlayers) {
        const allCards = [...p.cards, ...state.communityCards];
        const { score, name } = this.evaluateHand(allCards);
        if (score > bestScore) {
          bestScore = score;
          bestPlayers = [p];
          bestHandName = name;
        } else if (score === bestScore) {
          bestPlayers.push(p);
        }
      }

      const share = Math.floor(state.pot / bestPlayers.length);
      state.winners = bestPlayers.map(p => {
        p.chips += share;
        return { playerId: p.playerId, amount: share, hand: bestHandName };
      });
    }

    state.pot = 0;
    return state;
  }

  // Hand evaluation - returns a numeric score and hand name
  evaluateHand(cards: Card[]): { score: number; name: string } {
    const combos = this.getCombinations(cards, 5);
    let bestScore = 0;
    let bestName = 'High Card';

    for (const combo of combos) {
      const { score, name } = this.scoreHand(combo);
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }

    return { score: bestScore, name: bestName };
  }

  private getCombinations(cards: Card[], k: number): Card[][] {
    const result: Card[][] = [];
    const combo: Card[] = [];

    const backtrack = (start: number) => {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < cards.length; i++) {
        combo.push(cards[i]);
        backtrack(i + 1);
        combo.pop();
      }
    };

    backtrack(0);
    return result;
  }

  private rankValue(rank: Rank): number {
    const values: Record<Rank, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
      '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
    };
    return values[rank];
  }

  private scoreHand(hand: Card[]): { score: number; name: string } {
    const sorted = [...hand].sort((a, b) => this.rankValue(b.rank) - this.rankValue(a.rank));
    const values = sorted.map(c => this.rankValue(c.rank));
    const suits = sorted.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = this.checkStraight(values);

    // Count ranks
    const counts = new Map<number, number>();
    for (const v of values) {
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    const countValues = [...counts.values()].sort((a, b) => b - a);
    const highCards = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || b[0] - a[0])
      .map(([v]) => v);

    // Score = handRank * 10^10 + kickers
    const kicker = highCards.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);

    if (isFlush && isStraight) {
      if (values[0] === 14) return { score: 9e10 + kicker, name: 'Royal Flush' };
      return { score: 8e10 + kicker, name: 'Straight Flush' };
    }
    if (countValues[0] === 4) return { score: 7e10 + kicker, name: 'Four of a Kind' };
    if (countValues[0] === 3 && countValues[1] === 2) return { score: 6e10 + kicker, name: 'Full House' };
    if (isFlush) return { score: 5e10 + kicker, name: 'Flush' };
    if (isStraight) return { score: 4e10 + kicker, name: 'Straight' };
    if (countValues[0] === 3) return { score: 3e10 + kicker, name: 'Three of a Kind' };
    if (countValues[0] === 2 && countValues[1] === 2) return { score: 2e10 + kicker, name: 'Two Pair' };
    if (countValues[0] === 2) return { score: 1e10 + kicker, name: 'One Pair' };
    return { score: kicker, name: 'High Card' };
  }

  private checkStraight(values: number[]): boolean {
    const sorted = [...values].sort((a, b) => b - a);
    // Normal straight
    if (sorted[0] - sorted[4] === 4 && new Set(sorted).size === 5) return true;
    // Ace-low straight (A-2-3-4-5)
    if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && sorted[3] === 3 && sorted[4] === 2) return true;
    return false;
  }
}
