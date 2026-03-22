import { Card } from '../types';

const suitSymbols: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const isRed = (suit: string) => suit === 'hearts' || suit === 'diamonds';

interface CardViewProps {
  card?: Card;
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-10 h-14 text-xs',
  md: 'w-14 h-20 text-sm',
  lg: 'w-20 h-28 text-base',
};

export function CardView({ card, hidden, size = 'md' }: CardViewProps) {
  if (!card || hidden) {
    return (
      <div className={`${sizes[size]} rounded-lg bg-gradient-to-br from-surface-container-highest to-surface-container-high flex items-center justify-center ghost-border`}>
        <span className="material-symbols-outlined text-primary/30">style</span>
      </div>
    );
  }

  const red = isRed(card.suit);

  return (
    <div className={`${sizes[size]} rounded-lg bg-inverse-surface flex flex-col items-center justify-center font-label font-bold shadow-xl`}>
      <span className={red ? 'text-tertiary' : 'text-surface-container-lowest'}>
        {card.rank}
      </span>
      <span className={`text-lg ${red ? 'text-tertiary' : 'text-surface-container-lowest'}`}>
        {suitSymbols[card.suit] || '?'}
      </span>
    </div>
  );
}
