import { useState, useEffect } from 'react';
import { TurnTimer } from '../types';

interface TurnTimerBarProps {
  timer: TurnTimer;
}

export function TurnTimerBar({ timer }: TurnTimerBarProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - timer.startedAt;
      const left = Math.max(0, timer.duration - elapsed);
      setRemaining(left);
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [timer.startedAt, timer.duration]);

  const fraction = remaining / timer.duration;
  const seconds = Math.ceil(remaining / 1000);

  const color = fraction > 0.5 ? '#4ecca3' : fraction > 0.2 ? '#f0a500' : '#e94560';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        flex: 1,
        height: 4,
        background: '#333',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${fraction * 100}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 0.1s linear',
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 24, textAlign: 'right' }}>
        {seconds}s
      </span>
    </div>
  );
}
