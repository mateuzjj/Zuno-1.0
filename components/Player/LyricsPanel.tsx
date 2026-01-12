import React, { useEffect, useRef, useState } from 'react';
import { Lyrics, LyricsLine } from '../../types';
import { Music, Loader } from 'lucide-react';

interface LyricsPanelProps {
    lyrics: Lyrics | null;
    currentTime: number;
    isLoading?: boolean;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({ lyrics, currentTime, isLoading }) => {
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset current line when lyrics change
    useEffect(() => {
        setCurrentLineIndex(-1);
        console.log('[LyricsPanel] Lyrics changed:', {
            hasLyrics: !!lyrics,
            isInstrumental: lyrics?.instrumental,
            hasSynced: !!lyrics?.syncedLyrics,
            syncedCount: lyrics?.syncedLyrics?.length || 0,
            hasPlain: !!lyrics?.plainLyrics,
            lyricsId: lyrics?.id
        });
        
        if (lyrics?.syncedLyrics && lyrics.syncedLyrics.length > 0) {
            console.log(`[LyricsPanel] Loaded ${lyrics.syncedLyrics.length} synced lines`);
            // Debug: show first few lines
            console.log('[LyricsPanel] First 3 lines:', lyrics.syncedLyrics.slice(0, 3).map(l => `${l.time.toFixed(2)}s: ${l.text.substring(0, 20)}`));
        } else if (lyrics?.plainLyrics) {
            console.log('[LyricsPanel] Has plain lyrics (non-synced)');
        } else if (lyrics?.instrumental) {
            console.log('[LyricsPanel] Track is instrumental');
        } else if (lyrics === null) {
            console.log('[LyricsPanel] No lyrics available (null)');
        }
    }, [lyrics?.id, lyrics?.syncedLyrics?.length, lyrics?.plainLyrics, lyrics?.instrumental]);

    // Find current line based on time
    useEffect(() => {
        if (!lyrics?.syncedLyrics || lyrics.syncedLyrics.length === 0) {
            setCurrentLineIndex(-1);
            return;
        }

        const syncedLyrics = lyrics.syncedLyrics;
        
        // Find the active line: the last line whose time we've passed
        let foundIndex = -1;
        
        // Search from end to beginning for better performance with longer lyrics
        for (let i = syncedLyrics.length - 1; i >= 0; i--) {
            const line = syncedLyrics[i];
            
            if (currentTime >= line.time) {
                foundIndex = i;
                break;
            }
        }

        // If we're before the first line, don't highlight anything
        if (foundIndex === -1 && syncedLyrics.length > 0 && currentTime < syncedLyrics[0].time) {
            foundIndex = -1;
        }

        // Always update state to ensure reactivity
        setCurrentLineIndex(prevIndex => {
            if (prevIndex !== foundIndex && foundIndex >= 0 && syncedLyrics[foundIndex]) {
                // Debug log (can be removed in production)
                console.log(`[Lyrics Sync] Line ${foundIndex + 1}/${syncedLyrics.length} at ${currentTime.toFixed(2)}s: "${syncedLyrics[foundIndex].text.substring(0, 30)}..."`);
            }
            return foundIndex;
        });
    }, [currentTime, lyrics]);

    // Auto-scroll to current line (throttled to avoid too frequent scrolling)
    useEffect(() => {
        if (currentLineIndex < 0 || !lyricsContainerRef.current) return;

        // Clear any pending scroll
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Throttle scroll updates
        scrollTimeoutRef.current = setTimeout(() => {
            const container = lyricsContainerRef.current;
            if (!container) return;

            const currentElement = container.querySelector(`[data-line-index="${currentLineIndex}"]`);

            if (currentElement) {
                currentElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }, 100); // Throttle to 100ms

        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [currentLineIndex]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-muted">
                <Loader className="animate-spin mb-4" size={40} />
                <p className="text-sm">Loading lyrics...</p>
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-muted">
                <Music size={48} className="mb-4 opacity-50" />
                <p className="text-sm">No lyrics available</p>
                <p className="text-xs mt-2 opacity-70">Lyrics will appear here when available</p>
            </div>
        );
    }

    if (lyrics.instrumental) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-muted">
                <Music size={48} className="mb-4 opacity-50" />
                <p className="text-sm font-medium">Instrumental Track</p>
                <p className="text-xs mt-2 opacity-70">This track has no lyrics</p>
            </div>
        );
    }

    // Render synced lyrics
    if (lyrics.syncedLyrics && lyrics.syncedLyrics.length > 0) {
        return (
            <div
                ref={lyricsContainerRef}
                className="h-full overflow-y-auto px-6 py-8 scroll-smooth"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}
            >
                {/* Debug info (can be removed) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="max-w-2xl mx-auto mb-4 p-2 bg-white/5 rounded text-xs text-zuno-muted font-mono">
                        Time: {currentTime.toFixed(2)}s | Active Line: {currentLineIndex >= 0 ? `${currentLineIndex + 1}/${lyrics.syncedLyrics.length}` : 'none'} | Total Lines: {lyrics.syncedLyrics.length}
                    </div>
                )}
                
                <div className="max-w-2xl mx-auto space-y-4">
                    {lyrics.syncedLyrics.map((line, index) => {
                        const isActive = index === currentLineIndex;
                        const isPast = currentLineIndex >= 0 && index < currentLineIndex;
                        const isFuture = currentLineIndex >= 0 && index > currentLineIndex;

                        return (
                            <div
                                key={`line-${index}-${line.time.toFixed(3)}`}
                                data-line-index={index}
                                data-line-time={line.time.toFixed(2)}
                                className={`transition-all duration-300 py-2 px-2 rounded-lg ${
                                    isActive
                                        ? 'text-white text-2xl md:text-3xl font-bold scale-105 bg-white/5 shadow-lg shadow-zuno-accent/20 border-l-2 border-zuno-accent'
                                        : isPast
                                        ? 'text-zuno-muted text-lg md:text-xl opacity-30'
                                        : 'text-zuno-muted text-lg md:text-xl opacity-40'
                                }`}
                                style={{
                                    transform: isActive ? 'scale(1.05) translateX(4px)' : 'scale(1)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                {line.text || '\u00A0'}
                            </div>
                        );
                    })}
                    {/* Spacer for better scrolling */}
                    <div className="h-64" />
                </div>
            </div>
        );
    }

    // Render plain lyrics (non-synced)
    if (lyrics.plainLyrics) {
        return (
            <div
                className="h-full overflow-y-auto px-6 py-8"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}
            >
                <div className="max-w-2xl mx-auto">
                    <p className="text-white whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                        {lyrics.plainLyrics}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full text-zuno-muted">
            <Music size={48} className="mb-4 opacity-50" />
            <p className="text-sm">No lyrics found</p>
        </div>
    );
};
