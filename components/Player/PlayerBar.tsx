import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../store/PlayerContext';
import { Volume2, VolumeX, Maximize2, Download, Shuffle, Repeat, Repeat1, Heart, Radio, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import { DownloadService } from '../../services/download';
import { getFrequencyLabel } from '../../services/equalizer';
import { toast } from '../UI/Toast';
import { PlayerStatus, View } from '../../types';

interface PlayerBarProps {
  onNavigate?: (view: View, id?: string, state?: Record<string, unknown>) => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ onNavigate }) => {
  const { currentTrack, status, currentTime, togglePlay, nextTrack, prevTrack, seek, volume, setVolume, toggleMute, isMuted, toggleExpanded, shuffleEnabled, toggleShuffle, repeatMode, cycleRepeatMode, isLiked, toggleLike, currentLyrics, lyricsLoading, radioLoading, startRadioFromTrack, equalizerEnabled, setEqualizerEnabled, eqGains, setEqBandGain, applyEqPreset, resetEq, eqPresets, eqFrequencies } = usePlayer();
  const [isVisible, setIsVisible] = useState(true);
  const [eqPanelOpen, setEqPanelOpen] = useState(false);
  const lastScrollY = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  // Detect iOS - volume control doesn't work on iOS due to security restrictions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const currentScrollY = mainElement.scrollTop;

      // Determine direction
      // Threshold of 50px to avoid jitter
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };
  const handleSwipeMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };
  const handleSwipeEnd = () => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (touchEndX.current === null || touchEndY.current === null) return;

    const dx = touchEndX.current - touchStartX.current;
    const dy = touchEndY.current - touchStartY.current;

    if (Math.abs(dy) > Math.abs(dx) && dy < -SWIPE_THRESHOLD) {
      toggleExpanded();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > SWIPE_THRESHOLD) nextTrack();
      else if (dx < -SWIPE_THRESHOLD) prevTrack();
    }

    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevTrack(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextTrack(); }
  };

  const eqPanelContent = (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Equalizador</span>
        <button onClick={() => setEqPanelOpen(false)} className="text-zuno-muted hover:text-white p-1">
          <X size={16} />
        </button>
      </div>
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={equalizerEnabled}
          onChange={(e) => setEqualizerEnabled(e.target.checked)}
          className="rounded accent-zuno-accent"
        />
        <span className="text-xs text-white">Ativar</span>
      </label>
      <div className="mb-3">
        <label className="text-xs text-zuno-muted block mb-1">Preset</label>
        <select
          value={Object.keys(eqPresets).find((k) => JSON.stringify(eqPresets[k].gains) === JSON.stringify(eqGains)) ?? '__custom__'}
          onChange={(e) => e.target.value !== '__custom__' && applyEqPreset(e.target.value)}
          className="w-full rounded-lg bg-white/10 text-white text-xs border border-white/10 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          <option value="__custom__" className="bg-zuno-dark text-white">Personalizado</option>
          {Object.entries(eqPresets).map(([key, p]: [string, { name: string; gains: number[] }]) => (
            <option key={key} value={key} className="bg-zuno-dark text-white">
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-5 gap-x-2 gap-y-3 mb-2 max-h-40 overflow-y-auto">
        {eqFrequencies.map((hz, i) => (
          <div key={i} className="flex flex-col gap-1 min-h-[44px]">
            <span className="text-[10px] text-zuno-muted text-center">{getFrequencyLabel(hz)}</span>
            <div className="flex-1 min-h-[36px] flex items-center px-0.5">
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={eqGains[i] ?? 0}
                onChange={(e) => setEqBandGain(i, Number(e.target.value))}
                onInput={(e) => setEqBandGain(i, Number((e.target as HTMLInputElement).value))}
                disabled={!equalizerEnabled}
                className="eq-slider w-full h-3 cursor-pointer accent-zuno-accent disabled:opacity-50 bg-white/10 rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => { resetEq(); }}
        className="mt-2 w-full text-xs text-zuno-muted hover:text-white py-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        Restaurar plano
      </button>
    </>
  );

  return (
    <>
    <div
      role="region"
      aria-label="Barra de reprodução. Deslize para a esquerda para próxima faixa, para a direita para voltar. No teclado use setas esquerda e direita."
      tabIndex={0}
      onTouchStart={handleSwipeStart}
      onTouchMove={handleSwipeMove}
      onTouchEnd={handleSwipeEnd}
      onKeyDown={handleKeyDown}
      className={`fixed left-2 right-2 md:left-8 md:right-8 border border-white/10 p-3 md:p-4 z-50 rounded-3xl backdrop-blur-2xl shadow-2xl shadow-black/40 transition-all duration-300 player-bar-bottom overflow-hidden ${isVisible ? 'translate-y-0' : 'translate-y-[200%] md:translate-y-0'}`}
      style={{
        bottom: 'calc(6.5rem + env(safe-area-inset-bottom))',
        left: 'calc(0.5rem + env(safe-area-inset-left))',
        right: 'calc(0.5rem + env(safe-area-inset-right))',
        background: `
          radial-gradient(ellipse 90% 90% at 50% 50%, rgba(91, 140, 255, 0.08) 0%, transparent 55%),
          radial-gradient(ellipse 70% 70% at 50% 50%, rgba(155, 92, 255, 0.05) 0%, transparent 48%),
          linear-gradient(165deg, #0f1420 0%, #0B0F1A 40%, #080c14 100%)
        `,
        backgroundColor: '#0B0F1A',
      }}
    >
      {/* ── MOBILE LAYOUT ── */}
      <div className="md:hidden flex flex-col gap-2">
        {/* Linha 1: Capa + Info + Ações */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              onClick={toggleExpanded}
              className="w-12 h-12 rounded-xl bg-zuno-dark object-cover shadow-lg shrink-0 cursor-pointer active:scale-95 transition-transform"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
              <p className="text-xs text-zuno-muted truncate">{currentTrack.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {currentTrack?.mixes?.TRACK_MIX && onNavigate && (
              <button onClick={(e) => { e.stopPropagation(); onNavigate('mix', currentTrack.mixes!.TRACK_MIX, { mixSourceTrack: currentTrack }); }} className="text-zuno-muted hover:text-white transition-colors" title="Mix">
                <Sparkles size={18} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); startRadioFromTrack(currentTrack); }} disabled={radioLoading} className="text-zuno-muted hover:text-white transition-colors disabled:opacity-50" title="Radio">
              <Radio size={18} className={radioLoading ? 'animate-pulse' : ''} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setEqPanelOpen((o) => !o); }} className={`transition-colors ${equalizerEnabled ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`} title="Equalizador">
              <SlidersHorizontal size={18} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleLike(); }} className={`transition-colors ${isLiked ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}>
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Linha 2: Shuffle + Ondas + Repeat */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={toggleShuffle} className={`transition-colors ${shuffleEnabled ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`} title="Shuffle">
            <Shuffle size={18} />
          </button>

          <button onClick={togglePlay} className="relative flex items-center justify-center w-24 h-24 group" aria-label={status === PlayerStatus.PLAYING ? 'Pausar' : 'Reproduzir'}>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <circle cx="50" cy="50" r="21" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
              <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.3" />
            </svg>
            <div className="relative z-10 w-5 h-5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 group-hover:bg-white/15 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.06)]" />
          </button>

          <button onClick={cycleRepeatMode} className={`transition-colors ${repeatMode !== 'off' ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`} title={`Repeat: ${repeatMode}`}>
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Linha 3: Barra de progresso */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-zuno-muted w-10 text-right font-mono">{formatTime(currentTime)}</span>
          <div className="relative w-full flex items-center h-4">
            <input type="range" min={0} max={currentTrack.duration} value={currentTime} onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zuno-accent transition-all touch-none"
              style={{ background: `linear-gradient(to right, #5B8CFF ${(currentTime / currentTrack.duration) * 100}%, rgba(255,255,255,0.12) ${(currentTime / currentTrack.duration) * 100}%)`, WebkitAppearance: 'none', touchAction: 'none' }}
            />
          </div>
          <span className="text-xs text-zuno-muted w-10 font-mono">{formatTime(currentTrack.duration)}</span>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden md:flex max-w-screen-2xl mx-auto items-center justify-between gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-[120px]">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={toggleExpanded}>
            <div className="relative">
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-16 h-16 rounded-xl bg-zuno-dark object-cover shadow-lg group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={20} className="text-white" />
              </div>
            </div>
            <div className="block overflow-hidden flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</h4>
              <p className="text-xs text-zuno-muted truncate hover:text-white cursor-pointer transition-colors">{currentTrack.artist}</p>
              {currentLyrics && !currentLyrics.instrumental && (
                <div className="mt-2 space-y-0.5 max-w-[280px]">
                  {(() => {
                    if (currentLyrics.syncedLyrics && currentLyrics.syncedLyrics.length > 0) {
                      let currentLineIndex = -1;
                      for (let i = currentLyrics.syncedLyrics.length - 1; i >= 0; i--) {
                        if (currentTime >= currentLyrics.syncedLyrics[i].time) { currentLineIndex = i; break; }
                      }
                      if (currentLineIndex >= 0) {
                        const currentLine = currentLyrics.syncedLyrics[currentLineIndex];
                        const prevLine = currentLineIndex > 0 ? currentLyrics.syncedLyrics[currentLineIndex - 1] : null;
                        const nextLine = currentLineIndex < currentLyrics.syncedLyrics.length - 1 ? currentLyrics.syncedLyrics[currentLineIndex + 1] : null;
                        return (
                          <>
                            {prevLine && <p className="text-xs text-white/40 truncate transition-all duration-300">{prevLine.text}</p>}
                            <p className="text-xs text-white font-medium truncate transition-all duration-300">{currentLine.text}</p>
                            {nextLine && <p className="text-xs text-white/40 truncate transition-all duration-300">{nextLine.text}</p>}
                          </>
                        );
                      }
                    }
                    if (currentLyrics.plainLyrics) {
                      const lines = currentLyrics.plainLyrics.split('\n').filter(l => l.trim()).slice(0, 3);
                      return <>{lines.map((line, idx) => <p key={idx} className={`text-xs truncate transition-all duration-300 ${idx === 1 ? 'text-white font-medium' : 'text-white/40'}`}>{line.trim()}</p>)}</>;
                    }
                    return null;
                  })()}
                </div>
              )}
              {lyricsLoading && <div className="mt-2"><p className="text-xs text-white/40 animate-pulse">Loading lyrics...</p></div>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {currentTrack?.mixes?.TRACK_MIX && onNavigate && (
              <button onClick={(e) => { e.stopPropagation(); onNavigate('mix', currentTrack.mixes!.TRACK_MIX, { mixSourceTrack: currentTrack }); }} className="text-zuno-muted hover:text-white transition-colors hover:scale-110" title="Mix">
                <Sparkles size={20} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); startRadioFromTrack(currentTrack); }} disabled={radioLoading} className="text-zuno-muted hover:text-white transition-colors hover:scale-110 disabled:opacity-50 disabled:pointer-events-none" title="Radio">
              <Radio size={20} className={radioLoading ? 'animate-pulse' : ''} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleLike(); }} className={`transition-colors hover:scale-110 ${isLiked ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}>
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Controls & Scrubber */}
        <div className="flex flex-col items-center flex-1 max-w-2xl">
          <div className="flex items-center justify-center gap-10 mb-2 w-full">
            <button onClick={toggleShuffle} className={`transition-colors hover:scale-110 ${shuffleEnabled ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`} title="Shuffle">
              <Shuffle size={18} />
            </button>

            <button onClick={togglePlay} className="relative flex items-center justify-center w-28 h-28 group" aria-label={status === PlayerStatus.PLAYING ? 'Pausar' : 'Reproduzir'}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
                <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                <circle cx="50" cy="50" r="21" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
                <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.3" />
              </svg>
              <div className="relative z-10 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 group-hover:bg-white/15 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.06)]" />
            </button>

            <button onClick={cycleRepeatMode} className={`transition-colors hover:scale-110 ${repeatMode !== 'off' ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`} title={`Repeat: ${repeatMode}`}>
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-zuno-muted w-10 text-right font-mono">{formatTime(currentTime)}</span>
            <div className="relative w-full flex items-center h-4">
              <input type="range" min={0} max={currentTrack.duration} value={currentTime} onChange={handleSeek}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zuno-accent transition-all touch-none"
                style={{ background: `linear-gradient(to right, #5B8CFF ${(currentTime / currentTrack.duration) * 100}%, rgba(255,255,255,0.12) ${(currentTime / currentTrack.duration) * 100}%)`, WebkitAppearance: 'none', touchAction: 'none' }}
              />
            </div>
            <span className="text-xs text-zuno-muted w-10 font-mono">{formatTime(currentTrack.duration)}</span>
          </div>
        </div>

        {/* Volume & Extras (Desktop only) */}
        <div className="hidden md:flex items-center justify-end w-1/3 gap-4">
          <div className="relative">
            <button
              onClick={() => setEqPanelOpen((o) => !o)}
              className={`transition-colors hover:scale-110 ${equalizerEnabled ? 'text-zuno-accent' : 'text-zuno-muted hover:text-white'}`}
              title="Equalizador"
            >
              <SlidersHorizontal size={18} />
            </button>
            {eqPanelOpen && (
              <div className="hidden md:block absolute bottom-full right-0 mb-2 w-[320px] rounded-2xl p-4 shadow-2xl border border-white/10 bg-zuno-card" style={{ minHeight: '200px' }}>
                {eqPanelContent}
              </div>
            )}
          </div>
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
          {isIOS ? (
            <div className="flex items-center gap-2 group" title="Use os botões de volume do iPhone">
              <Volume2 size={20} className="text-zuno-muted" />
              <span className="text-xs text-zuno-muted whitespace-nowrap">
                Use botões físicos
              </span>
            </div>
          ) : (
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
                  background: `linear-gradient(to right, #5B8CFF ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
                  WebkitAppearance: 'none',
                  touchAction: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Mobile: EQ bottom sheet */}
    {eqPanelOpen && (
      <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-label="Equalizador">
        <div className="absolute inset-0 bg-black/50" onClick={() => setEqPanelOpen(false)} aria-hidden />
        <div className="relative border border-white/10 rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto shadow-2xl bg-zuno-card">
          {eqPanelContent}
        </div>
      </div>
    )}
    </>
  );
};