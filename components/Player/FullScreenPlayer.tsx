import React, { useState, useRef } from 'react';
import { usePlayer } from '../../store/PlayerContext';
import { ChevronDown, Shuffle, Repeat, Volume2, VolumeX, Download, Music2, FileText, Radio, Sparkles } from 'lucide-react';
import { DownloadService } from '../../services/download';
import { toast } from '../UI/Toast';
import { LyricsPanel } from './LyricsPanel';
import { View } from '../../types';

interface FullScreenPlayerProps {
  onNavigate?: (view: View, id?: string, state?: Record<string, unknown>) => void;
}

export const FullScreenPlayer: React.FC<FullScreenPlayerProps> = ({ onNavigate }) => {
    const {
        currentTrack,
        status,
        currentTime,
        duration,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        isExpanded,
        toggleExpanded,
        volume,
        setVolume,
        toggleMute,
        isMuted,
        shuffleEnabled,
        toggleShuffle,
        repeatMode,
        cycleRepeatMode,
        currentLyrics,
        lyricsLoading,
        isLiked,
        toggleLike,
        radioLoading,
        startRadioFromTrack,
    } = usePlayer();

    const [showLyrics, setShowLyrics] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const volumeRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);
    const SWIPE_THRESHOLD = 50;

    if (!currentTrack || !isExpanded) return null;

    const isPlaying = status === 'PLAYING';

    // Circular Volume Logic
    const radius = 140;
    const center = 160;
    const strokeWidth = 6;

    const valueToPoint = (value: number) => {
        const startAngle = 135;
        const endAngle = 405;
        const angleRange = endAngle - startAngle;
        const angleInDegrees = startAngle + (value * angleRange);
        const angleInRadians = (angleInDegrees * Math.PI) / 180;
        const x = center + radius * Math.cos(angleInRadians);
        const y = center + radius * Math.sin(angleInRadians);
        return { x, y };
    };

    const calculateVolumeFromEvent = (e: React.PointerEvent | PointerEvent) => {
        if (!volumeRef.current) return;

        const rect = volumeRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const x = e.clientX - cx;
        const y = e.clientY - cy;

        let angle = Math.atan2(y, x) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        let effectiveAngle = angle;
        if (effectiveAngle >= 45 && effectiveAngle < 135) {
            return;
        }

        let relativeAngle = 0;
        if (effectiveAngle >= 135) {
            relativeAngle = effectiveAngle - 135;
        } else {
            relativeAngle = (360 - 135) + effectiveAngle;
        }

        const totalRange = 270;
        let newVolume = Math.min(Math.max(relativeAngle / totalRange, 0), 1);
        setVolume(newVolume);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDraggingVolume(true);
        calculateVolumeFromEvent(e);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDraggingVolume) {
            calculateVolumeFromEvent(e);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDraggingVolume(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = x + r * Math.cos(startRad);
        const y1 = y + r * Math.sin(startRad);

        const x2 = x + r * Math.cos(endRad);
        const y2 = y + r * Math.sin(endRad);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", x1, y1,
            "A", r, r, 0, largeArcFlag, 1, x2, y2
        ].join(" ");
    };

    const ARC_START = 135;
    const ARC_END = 405;
    const ARC_CURRENT = ARC_START + (volume * (ARC_END - ARC_START));
    const knobPos = valueToPoint(volume);

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        seek(Number(e.target.value));
    };

    const handleSwipeStart = (e: React.TouchEvent) => {
        const target = e.target as Node;
        if (volumeRef.current?.contains(target)) return;
        if (target instanceof HTMLInputElement && target.type === 'range') return;
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
        touchEndX.current = null;
        touchEndY.current = null;
    };

    const handleSwipeMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        touchEndX.current = e.targetTouches[0].clientX;
        touchEndY.current = e.targetTouches[0].clientY;
    };

    const handleSwipeEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const endX = touchEndX.current ?? e.changedTouches[0]?.clientX ?? touchStartX.current;
        const endY = touchEndY.current ?? e.changedTouches[0]?.clientY ?? touchStartY.current;
        const dx = endX - touchStartX.current;
        const dy = endY - touchStartY.current;
        if (Math.abs(dy) > Math.abs(dx) && dy > SWIPE_THRESHOLD) {
            toggleExpanded();
        } else if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > SWIPE_THRESHOLD) nextTrack();
            else if (dx < -SWIPE_THRESHOLD) prevTrack();
        }
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        touchEndY.current = null;
    };

    return (
        <div
            className="fixed inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-bottom duration-500 h-[100dvh] overflow-hidden"
            style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
            role="application"
            aria-label="Player em tela cheia. Deslize para a direita: próxima faixa; esquerda: faixa anterior; para baixo: minimizar."
        >

            {/* Ambient color orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute rounded-full" style={{ width: '70vmax', height: '70vmax', top: '-25%', left: '-20%', background: 'radial-gradient(circle, #5B8CFF 0%, transparent 60%)', filter: 'blur(80px)', opacity: 0.18, animation: 'orb-drift-1 18s ease-in-out infinite alternate' }} />
                <div className="absolute rounded-full" style={{ width: '60vmax', height: '60vmax', bottom: '-25%', right: '-15%', background: 'radial-gradient(circle, #9B5CFF 0%, transparent 60%)', filter: 'blur(80px)', opacity: 0.15, animation: 'orb-drift-2 22s ease-in-out infinite alternate' }} />
                <div className="absolute rounded-full" style={{ width: '50vmax', height: '50vmax', top: '35%', left: '40%', background: 'radial-gradient(circle, #5B8CFF 0%, transparent 60%)', filter: 'blur(80px)', opacity: 0.12, animation: 'orb-drift-3 26s ease-in-out infinite alternate' }} />
            </div>

            {/* Album cover blur */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                    src={currentTrack.coverUrl}
                    className="w-full h-full object-cover opacity-20 blur-3xl scale-125"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90" />
            </div>

            {/* Header — barra no topo com safe-area à direita para o download não sair da tela */}
            <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 pb-3 shrink-0 min-w-0">
                <button
                    onClick={toggleExpanded}
                    className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label="Minimizar player"
                >
                    <ChevronDown size={22} className="sm:w-6 sm:h-6" />
                </button>
                {/* Tab Switcher — pode encolher em telas estreitas */}
                <div className="flex gap-1.5 sm:gap-2 bg-white/5 rounded-full p-1 min-w-0 shrink">
                    <button
                        onClick={() => setShowLyrics(false)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${!showLyrics ? 'bg-white text-black' : 'text-white/60'}`}
                    >
                        <Music2 size={14} className="sm:w-4 sm:h-4 inline mr-1" />
                        Player
                    </button>
                    <button
                        onClick={() => setShowLyrics(true)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${showLyrics ? 'bg-white text-black' : 'text-white/60'}`}
                    >
                        <FileText size={14} className="sm:w-4 sm:h-4 inline mr-1" />
                        Lyrics
                    </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {currentTrack?.mixes?.TRACK_MIX && onNavigate && (
                        <button
                            onClick={() => onNavigate('mix', currentTrack.mixes!.TRACK_MIX, { mixSourceTrack: currentTrack })}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            title="Abrir Mix desta faixa"
                        >
                            <Sparkles size={20} className="sm:w-6 sm:h-6" />
                        </button>
                    )}
                    <button
                        onClick={() => startRadioFromTrack(currentTrack)}
                        disabled={radioLoading}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
                        title="Radio — músicas do artista"
                    >
                        <Radio size={20} className={`sm:w-6 sm:h-6 ${radioLoading ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                        onClick={async () => {
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (isMobile) {
                                await DownloadService.downloadTrack(currentTrack, true);
                            } else {
                                const saveToBrowser = window.confirm('Salvar no navegador para uso offline? (Sim) ou Baixar ZIP? (Não)');
                                await DownloadService.downloadTrack(currentTrack, saveToBrowser);
                            }
                        }}
                        title="Download"
                    >
                        <Download size={20} className="sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content — painel central bem distribuído */}
            {showLyrics ? (
                <div className="relative z-10 flex-1 min-h-0 overflow-auto px-4">
                    <LyricsPanel
                        lyrics={currentLyrics}
                        currentTime={currentTime}
                        isLoading={lyricsLoading}
                    />
                </div>
            ) : (
                /* Player View — painel central centralizado */
                <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 py-2 overflow-auto">
                    {/* Album Art with Volume Orb */}
                    <div className="relative w-[30vh] h-[30vh] max-w-[260px] max-h-[260px] md:w-72 md:h-72 flex items-center justify-center select-none mb-4"
                        ref={volumeRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {/* SVG Volume Ring */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 320 320">
                            <path
                                d={describeArc(center, center, radius, ARC_START, ARC_END)}
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                            />
                            <path
                                d={describeArc(center, center, radius, ARC_START, ARC_CURRENT)}
                                fill="none"
                                stroke="#5B8CFF"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                className="drop-shadow-[0_0_10px_rgba(91,140,255,0.5)]"
                            />
                        </svg>

                        {/* Volume Icons */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isMuted ? (
                                <VolumeX size={48} className="text-white/20" />
                            ) : volume < 0.3 ? (
                                <Volume2 size={48} className="text-white/20" />
                            ) : (
                                <Volume2 size={48} className="text-white/20" />
                            )}
                        </div>

                        {/* Album Art */}
                        <div className="relative w-[60%] h-[60%] rounded-full overflow-hidden shadow-2xl">
                            <img
                                src={currentTrack.coverUrl}
                                alt={currentTrack.title}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Volume Knob */}
                        <div
                            className="absolute w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center justify-center z-20 cursor-grab active:cursor-grabbing transition-transform"
                            style={{
                                left: `calc(${(knobPos.x / 320) * 100}% - 16px)`,
                                top: `calc(${(knobPos.y / 320) * 100}% - 16px)`,
                                transform: isDraggingVolume ? 'scale(1.2)' : 'scale(1)',
                                backgroundColor: isMuted ? '#EF4444' : 'white'
                            }}
                        >
                            <span className="text-black text-[8px] md:text-[10px] font-bold font-mono">
                                {isMuted ? 'M' : Math.round(volume * 100)}
                            </span>
                        </div>

                        {/* Mute Button */}
                        <button
                            onClick={toggleMute}
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[180%] w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                                isMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/50' : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                        </button>
                    </div>

                    {/* Song Info with Lyrics — área de letras com altura fixa para não distorcer o layout */}
                    <div className="text-center max-w-md px-4 w-full flex flex-col items-center">
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-1 truncate w-full">
                            {currentTrack.title}
                        </h2>
                        <p className="text-sm text-zuno-muted mb-3 truncate w-full">
                            {currentTrack.artist}
                        </p>

                        {/* Lyrics Display — altura fixa (3 linhas) para não interferir nos elementos acima */}
                        {currentLyrics && !currentLyrics.instrumental && (
                            <div className="space-y-1 text-center min-h-[4.25rem] max-h-[4.25rem] flex flex-col justify-center overflow-hidden w-full">
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
                                                        <p className="text-sm md:text-base text-white/50 transition-all duration-300 truncate px-1">
                                                            {prevLine.text}
                                                        </p>
                                                    )}
                                                    <p className="text-base md:text-lg text-white font-bold transition-all duration-300 truncate px-1">
                                                        {currentLine.text}
                                                    </p>
                                                    {nextLine && (
                                                        <p className="text-sm md:text-base text-white/50 transition-all duration-300 truncate px-1">
                                                            {nextLine.text}
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        }
                                    }
                                    
                                    // Fallback to plain lyrics
                                    if (currentLyrics.plainLyrics) {
                                        const lines = currentLyrics.plainLyrics.split('\n').filter(l => l.trim()).slice(0, 3);
                                        return (
                                            <>
                                                {lines.map((line, idx) => (
                                                    <p 
                                                        key={idx} 
                                                        className={`text-sm md:text-base transition-all duration-300 truncate px-1 ${
                                                            idx === 1 ? 'text-white font-bold' : 'text-white/50'
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
                            <div className="min-h-[4.25rem] flex items-center justify-center">
                                <p className="text-sm text-white/40 animate-pulse">Carregando letra...</p>
                            </div>
                        )}
                        {(!currentLyrics || currentLyrics?.instrumental) && !lyricsLoading && (
                            <div className="min-h-[4.25rem]" aria-hidden />
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Controls — com safe-area horizontal para o tempo não sair da tela */}
            <div className="relative z-10 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 md:py-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-12 shrink-0" role="region" aria-label="Controles de reprodução">
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] md:rounded-[40px] p-4 md:p-8 shadow-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-zuno-accent/5 pointer-events-none mix-blend-overlay" />

                    {/* Time & Waveform — tempo com espaço fixo para não cortar */}
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 relative z-10 min-w-0">
                        <span className="text-xs font-mono font-medium text-white/60 min-w-[2.5rem] w-10 text-right shrink-0" aria-hidden="true">{formatTime(currentTime)}</span>

                        <div className="relative flex-1 min-w-0 h-12 flex items-center justify-center gap-[3px] group">
                            {Array.from({ length: 40 }).map((_, i) => {
                                const progress = (currentTime / (duration || 1));
                                const isPast = (i / 40) < progress;
                                return (
                                    <div
                                        key={i}
                                        className={`w-1 rounded-full transition-all duration-300 ${isPast ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/20'}`}
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
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none"
                                style={{ WebkitAppearance: 'none', touchAction: 'none' }}
                                aria-label="Posição na faixa"
                            />
                        </div>

                        <span className="text-xs font-mono font-medium text-white/60 min-w-[2.75rem] w-10 text-left shrink-0" aria-hidden="true">{formatTime(duration)}</span>
                    </div>

                    {/* Controles no padrão da barra flutuante: Shuffle | Play/Pause | Repeat (sem anterior/próximo) */}
                    <div className="flex items-center justify-center gap-8 md:gap-12 px-2 relative z-10">
                        <button
                            onClick={toggleShuffle}
                            className={`transition-colors p-2 rounded-full hover:bg-white/5 ${shuffleEnabled ? 'text-zuno-accent' : 'text-white/40 hover:text-white'}`}
                            aria-label={shuffleEnabled ? 'Desativar ordem aleatória' : 'Ativar ordem aleatória'}
                            aria-pressed={shuffleEnabled}
                        >
                            <Shuffle size={22} className="md:w-6 md:h-6" />
                        </button>

                        {/* Mesmo design da barra flutuante: anéis concêntricos + círculo central discreto */}
                        <button
                            onClick={togglePlay}
                            className="relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-full"
                            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                        >
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" aria-hidden>
                                <circle cx="50" cy="50" r="8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
                                <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                                <circle cx="50" cy="50" r="21" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
                                <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />
                                <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
                                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.3" />
                            </svg>
                            <span className="relative z-10 w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 group-hover:bg-white/15 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.06)]" />
                        </button>

                        <button
                            onClick={cycleRepeatMode}
                            className={`transition-colors p-2 rounded-full hover:bg-white/5 relative ${repeatMode !== 'off' ? 'text-zuno-accent' : 'text-white/40 hover:text-white'}`}
                            aria-label={repeatMode === 'off' ? 'Ativar repetição' : repeatMode === 'one' ? 'Repetir uma faixa' : 'Repetir todas'}
                            aria-pressed={repeatMode !== 'off'}
                        >
                            <Repeat size={22} className="md:w-6 md:h-6" />
                            {repeatMode === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold text-zuno-accent">1</span>}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
