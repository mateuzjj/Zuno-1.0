import React from 'react';
import { usePlayer } from '../../store/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Download, Shuffle, Repeat, Repeat1, Heart } from 'lucide-react';
import { DownloadService } from '../../services/download';
import { toast } from '../UI/Toast';
import { PlayerStatus } from '../../types';

export const PlayerBar: React.FC = () => {
  const { currentTrack, status, currentTime, togglePlay, nextTrack, prevTrack, seek, volume, setVolume, toggleMute, isMuted, toggleExpanded, shuffleEnabled, toggleShuffle, repeatMode, cycleRepeatMode, isLiked, toggleLike, currentLyrics, lyricsLoading } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const isPlaying = status === PlayerStatus.PLAYING;

  return (
    <div
      className="fixed left-2 right-2 md:left-8 md:right-8 bg-zuno-card/98 border border-white/10 p-3 md:p-4 z-50 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-black/50 transition-all duration-300 player-bar-bottom"
      style={{
        left: 'calc(0.5rem + env(safe-area-inset-left))',
        right: 'calc(0.5rem + env(safe-area-inset-right))'
      }}
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">

        {/* Track Info */}
        <div className="flex items-center gap-4 flex-1 md:w-1/3 min-w-[120px] max-w-full md:max-w-none">
          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={toggleExpanded}
          >
            <div className="relative">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-zuno-dark object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={20} className="text-white" />
              </div>
            </div>
            <div className="block overflow-hidden flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">
                {currentTrack.title}
              </h4>
              <p className="text-xs text-zuno-muted truncate hover:text-white cursor-pointer transition-colors">
                {currentTrack.artist}
              </p>
              {/* Lyrics Display - Hidden on mobile for compactness */}
              {currentLyrics && !currentLyrics.instrumental && (
                <div className="hidden md:block mt-2 space-y-0.5 max-w-[280px]">
                  {(() => {
                    // Find current line for synced lyrics
                    if (currentLyrics.syncedLyrics && currentLyrics.syncedLyrics.length > 0) {
                      let currentLineIndex = -1;
                      for (let i = currentLyrics.syncedLyrics.length - 1; i >= 0; i--) {
                        if (currentTime >= currentLyrics.syncedLyrics[i].time) {
                          currentLineIndex = i;
                          break;
                        }
                      }

                      if (currentLineIndex >= 0) {
                        const currentLine = currentLyrics.syncedLyrics[currentLineIndex];
                        const prevLine = currentLineIndex > 0 ? currentLyrics.syncedLyrics[currentLineIndex - 1] : null;
                        const nextLine = currentLineIndex < currentLyrics.syncedLyrics.length - 1
                          ? currentLyrics.syncedLyrics[currentLineIndex + 1]
                          : null;

                        return (
                          <>
                            {prevLine && (
                              <p className="text-xs text-white/40 truncate transition-all duration-300">
                                {prevLine.text}
                              </p>
                            )}
                            <p className="text-xs text-white font-medium truncate transition-all duration-300">
                              {currentLine.text}
                            </p>
                            {nextLine && (
                              <p className="text-xs text-white/40 truncate transition-all duration-300">
                                {nextLine.text}
                              </p>
                            )}
                          </>
                        );
                      }
                    }

                    // Fallback to plain lyrics (show first 3 lines)
                    if (currentLyrics.plainLyrics) {
                      const lines = currentLyrics.plainLyrics.split('\n').filter(l => l.trim()).slice(0, 3);
                      return (
                        <>
                          {lines.map((line, idx) => (
                            <p
                              key={idx}
                              className={`text-xs truncate transition-all duration-300 ${idx === 1 ? 'text-white font-medium' : 'text-white/40'
                                }`}
                            >
                              {line.trim()}
                            </p>
                          ))}
                        </>
                      );
                    }

                    return null;
                  })()}
                </div>
              )}
              {lyricsLoading && (
                <div className="hidden md:block mt-2">
                  <p className="text-xs text-white/40 animate-pulse">Loading lyrics...</p>
                </div>
              )}
            </div>
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike();
            }}
            className={`ml-auto transition-colors hover:scale-110 ${isLiked ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Controls & Scrubber */}
        <div className="flex flex-col items-center flex-1 max-w-2xl">
          <div className="flex items-center gap-4 md:gap-6 mb-1">
            <button
              onClick={toggleShuffle}
              className={`transition-colors hover:scale-110 ${shuffleEnabled ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}
              title={shuffleEnabled ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle size={18} />
            </button>
            <button onClick={prevTrack} className="text-zuno-muted hover:text-white transition-colors hover:scale-110">
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="bg-white text-black rounded-full p-2.5 hover:scale-105 transition-transform shadow-lg shadow-white/20"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-zuno-muted hover:text-white transition-colors hover:scale-110">
              <SkipForward size={20} />
            </button>
            <button
              onClick={cycleRepeatMode}
              className={`transition-colors hover:scale-110 ${repeatMode !== 'off' ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-zuno-muted w-10 text-right font-mono">{formatTime(currentTime)}</span>
            <div className="group relative w-full flex items-center h-4">
              <input
                type="range"
                min={0}
                max={currentTrack.duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zuno-accent transition-all touch-none"
                style={{
                  background: `linear-gradient(to right, #1ED760 ${(currentTime / currentTrack.duration) * 100
                    }%, #333 ${(currentTime / currentTrack.duration) * 100
                    }%)`,
                  WebkitAppearance: 'none',
                  touchAction: 'none',
                }}
              />
            </div>
            <span className="text-xs text-zuno-muted w-10 font-mono">{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Volume & Extras (Desktop only) */}
        <div className="hidden md:flex items-center justify-end w-1/3 gap-4">
          <button
            className="text-zuno-muted hover:text-white"
            onClick={async () => {
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (isMobile) {
                // On mobile, save to browser storage
                await DownloadService.downloadTrack(currentTrack, true);
              } else {
                // On desktop, show option or auto-detect
                const saveToBrowser = window.confirm('Salvar no navegador para uso offline? (Sim) ou Baixar ZIP? (Não)');
                await DownloadService.downloadTrack(currentTrack, saveToBrowser);
              }
            }}
            title="Download Track"
          >
            <Download size={18} />
          </button>
          <button className="text-zuno-muted hover:text-white">
            <Maximize2 size={18} />
          </button>
          <div className="flex items-center gap-2 w-32 group">
            <button onClick={toggleMute} className="text-zuno-muted hover:text-white">
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white touch-none"
              style={{
                background: `linear-gradient(to right, #ffffff ${volume * 100
                  }%, #333 ${volume * 100
                  }%)`,
                WebkitAppearance: 'none',
                touchAction: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};