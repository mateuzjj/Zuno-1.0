import React from 'react';

interface WaveformScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatTime: (time: number) => string;
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  currentTime,
  duration,
  isPlaying,
  onSeek,
  formatTime,
}) => {
  const progress = duration > 0 ? currentTime / duration : 0;
  const safeDuration = duration || 1;

  return (
    <div className="flex items-center gap-2 md:gap-3 w-full min-w-0">
      <span className="text-xs font-mono font-medium text-white/60 min-w-[2.5rem] shrink-0 text-right" aria-hidden>
        {formatTime(currentTime)}
      </span>
      <div className="relative flex-1 min-w-0 h-8 md:h-10 flex items-center justify-center gap-[2px] md:gap-[3px] group">
        {Array.from({ length: 40 }).map((_, i) => {
          const isPast = (i / 40) < progress;
          return (
            <div
              key={i}
              className={`w-0.5 md:w-1 rounded-full transition-all duration-300 ${isPast ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'bg-white/20'}`}
              style={{
                height: isPlaying
                  ? `${Math.max(30, Math.random() * 100)}%`
                  : `${30 + Math.sin(i * 0.5) * 20}%`,
              }}
            />
          );
        })}
        <input
          type="range"
          min={0}
          max={safeDuration}
          value={currentTime}
          onChange={onSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
          style={{ WebkitAppearance: 'none', touchAction: 'none' }}
          aria-label="Posição na faixa"
        />
      </div>
      <span className="text-xs font-mono font-medium text-white/60 min-w-[2.5rem] shrink-0 text-left" aria-hidden>
        {formatTime(duration)}
      </span>
    </div>
  );
};
