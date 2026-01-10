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

    // Find current line based on time
    useEffect(() => {
        if (!lyrics?.syncedLyrics) return;

        const index = lyrics.syncedLyrics.findIndex((line, idx) => {
            const nextLine = lyrics.syncedLyrics![idx + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });

        setCurrentLineIndex(index);
    }, [currentTime, lyrics]);

    // Auto-scroll to current line
    useEffect(() => {
        if (currentLineIndex < 0 || !lyricsContainerRef.current) return;

        const container = lyricsContainerRef.current;
        const currentElement = container.querySelector(`[data-line-index="${currentLineIndex}"]`);

        if (currentElement) {
            currentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
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
                <div className="max-w-2xl mx-auto space-y-4">
                    {lyrics.syncedLyrics.map((line, index) => (
                        <div
                            key={index}
                            data-line-index={index}
                            className={`transition-all duration-300 py-2 ${index === currentLineIndex
                                    ? 'text-white text-2xl md:text-3xl font-bold scale-105'
                                    : 'text-zuno-muted text-lg md:text-xl opacity-50'
                                }`}
                        >
                            {line.text}
                        </div>
                    ))}
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
