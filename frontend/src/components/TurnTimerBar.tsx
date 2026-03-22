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
      setRemaining(Math.max(0, timer.duration - elapsed));
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [timer.startedAt, timer.duration]);

  const fraction = remaining / timer.duration;
  const seconds = Math.ceil(remaining / 1000);

  const barColor = fraction > 0.5 ? 'bg-primary' : fraction > 0.2 ? 'bg-secondary' : 'bg-error';
  const textColor = fraction > 0.5 ? 'text-primary' : fraction > 0.2 ? 'text-secondary' : 'text-error';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-100 ease-linear`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className={`font-label text-[9px] font-bold ${textColor} min-w-[18px] text-right`}>
        {seconds}s
      </span>
    </div>
  );
}
