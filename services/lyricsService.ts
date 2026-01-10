import { getDB } from './db';
import { Lyrics, LyricsLine } from '../types';

const LRCLIB_API_BASE = 'https://lrclib.net/api';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Parse LRC format lyrics to structured format
 * LRC format: [mm:ss.xx]Lyrics text
 */
function parseLRC(lrcText: string): LyricsLine[] {
    if (!lrcText) return [];

    const lines: LyricsLine[] = [];
    const lrcRegex = /\[(\d{2}):(\d{2}\.\d{2})\](.*)/g;

    let match;
    while ((match = lrcRegex.exec(lrcText)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();

        if (text) { // Skip empty lines
            lines.push({
                time: minutes * 60 + seconds,
                text,
            });
        }
    }

    return lines.sort((a, b) => a.time - b.time);
}

/**
 * Search for lyrics using LRCLib API
 */
export async function searchLyrics(
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): Promise<Lyrics | null> {
    try {
        // Validate inputs
        if (!trackName || !artistName || trackName.trim() === '' || artistName.trim() === '') {
            console.warn('[LyricsService] Invalid search params:', { trackName, artistName });
            return null;
        }

        const params = new URLSearchParams({
            track_name: trackName.trim(),
            artist_name: artistName.trim(),
        });

        if (albumName && albumName.trim()) params.append('album_name', albumName.trim());
        if (duration && duration > 0) params.append('duration', Math.floor(duration).toString());

        const url = `${LRCLIB_API_BASE}/search?${params}`;
        console.log('[LyricsService] Searching:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Zuno-Music-App/1.0 (https://github.com/mateuzjj/Zuno)',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log('[LyricsService] No lyrics found (404)');
                return null;
            }
            throw new Error(`LRCLib API error: ${response.status}`);
        }

        const results = await response.json();

        if (!results || results.length === 0) {
            console.log('[LyricsService] No results found');
            return null;
        }

        const result = results[0];
        console.log('[LyricsService] Found lyrics:', result.trackName, '-', result.artistName);

        const lyrics: Lyrics = {
            id: result.id,
            trackName: result.trackName || trackName,
            artistName: result.artistName || artistName,
            albumName: result.albumName || albumName,
            duration: result.duration,
            plainLyrics: result.plainLyrics || undefined,
            syncedLyrics: result.syncedLyrics ? parseLRC(result.syncedLyrics) : undefined,
            instrumental: result.instrumental || false,
        };

        return lyrics;
    } catch (error) {
        console.error('[LyricsService] Search failed:', error);
        return null;
    }
}

/**
 * Get lyrics by ID from LRCLib
 */
export async function getLyricsById(id: number): Promise<Lyrics | null> {
    try {
        const response = await fetch(`${LRCLIB_API_BASE}/get/${id}`, {
            headers: {
                'User-Agent': 'Zuno-Music-App/1.0 (https://github.com/mateuzjj/Zuno)',
            },
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`LRCLib API error: ${response.status}`);
        }

        const result = await response.json();

        const lyrics: Lyrics = {
            id: result.id,
            trackName: result.trackName,
            artistName: result.artistName,
            albumName: result.albumName,
            duration: result.duration,
            plainLyrics: result.plainLyrics || undefined,
            syncedLyrics: result.syncedLyrics ? parseLRC(result.syncedLyrics) : undefined,
            instrumental: result.instrumental || false,
        };

        return lyrics;
    } catch (error) {
        console.error('Failed to get lyrics by ID:', error);
        return null;
    }
}

/**
 * Get lyrics for a track with caching
 */
export async function getLyricsForTrack(
    trackId: string,
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): Promise<Lyrics | null> {
    const db = await getDB();

    // Check cache first
    const cached = await db.get('lyricsCache', trackId);
    if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CACHE_DURATION_MS) {
            return cached.lyrics;
        }
        // Cache expired, delete it
        await db.delete('lyricsCache', trackId);
    }

    // Fetch from API
    const lyrics = await searchLyrics(trackName, artistName, albumName, duration);

    // Cache the result (even if null, to avoid repeated failed requests)
    await db.put('lyricsCache', {
        trackId,
        lyrics,
        timestamp: Date.now(),
        trackName,
        artistName,
    });

    return lyrics;
}

/**
 * Clear old cache entries (> 30 days)
 */
export async function cleanLyricsCache(): Promise<void> {
    const db = await getDB();
    const allEntries = await db.getAllFromIndex('lyricsCache', 'by-timestamp');

    const cutoffTime = Date.now() - CACHE_DURATION_MS;
    const oldEntries = allEntries.filter(entry => entry.timestamp < cutoffTime);

    for (const entry of oldEntries) {
        await db.delete('lyricsCache', entry.trackId);
    }

    console.log(`Cleaned ${oldEntries.length} old lyrics cache entries`);
}

export const LyricsService = {
    searchLyrics,
    getLyricsById,
    getLyricsForTrack,
    cleanLyricsCache,
    parseLRC,
};
