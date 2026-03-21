import { Card } from '../types';

const suitSymbols: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const suitColors: Record<string, string> = {
  hearts: '#e94560',
  diamonds: '#e94560',
  clubs: '#eee',
  spades: '#eee',
};

interface CardViewProps {
  card?: Card;
  hidden?: boolean;
}

export function CardView({ card, hidden }: CardViewProps) {
  if (!card || hidden) {
    return (
      <div style={{
        width: 50,
        height: 70,
        borderRadius: 6,
        background: 'linear-gradient(135deg, #e94560, #0f3460)',
        border: '2px solid #444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        color: '#fff',
      }}>
        ?
      </div>
    );
  }

  return (
    <div style={{
      width: 50,
      height: 70,
      borderRadius: 6,
      background: '#fff',
      border: '2px solid #ddd',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: suitColors[card.suit] || '#333',
    }}>
      <span>{card.rank}</span>
      <span style={{ fontSize: 18 }}>{suitSymbols[card.suit] || '?'}</span>
    </div>
  );
}
