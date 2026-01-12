import { getDB } from './db';
import { Lyrics, LyricsLine } from '../types';

// Direct API call to LRCLIB (CORS is enabled on their API)
const LRCLIB_API_BASE = 'https://lrclib.net/api';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Normalize string for better matching (remove accents, lowercase, trim)
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
}

/**
 * Remove common suffixes and metadata from track titles for better search results
 */
function cleanTrackTitle(title: string): string {
    if (!title || typeof title !== 'string') return '';
    
    return title
        .replace(/\(.*?\)/g, '') // Remove content in parentheses e.g. (Remastered) - non-greedy
        .replace(/\[.*?\]/g, '') // Remove content in brackets e.g. [Live] - non-greedy
        .replace(/-.*live.*/i, '')
        .replace(/-.*remaster.*/i, '')
        .replace(/feat\..*/i, '')
        .replace(/ft\..*/i, '')
        .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple Levenshtein-like comparison
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const editDistance = getEditDistance(longer, shorter);
    return 1 - editDistance / longer.length;
}

/**
 * Calculate edit distance between two strings
 */
function getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse LRC format lyrics to structured format
 * Supports multiple LRC formats:
 * - [mm:ss.xx] or [mm:ss.xxx] (minutes:seconds.milliseconds)
 * - [mm:ss] (minutes:seconds, no milliseconds)
 * - [ss] (seconds only, less common)
 */
function parseLRC(lrcText: string): LyricsLine[] {
    if (!lrcText || typeof lrcText !== 'string') return [];

    const lines: LyricsLine[] = [];

    // Regex to match various LRC formats:
    // [mm:ss.xx] or [mm:ss.xxx] - standard format with milliseconds
    // [mm:ss] - format without milliseconds
    // Supports multiple tags on same line
    const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/g;

    let match;
    while ((match = lrcRegex.exec(lrcText)) !== null) {
        const minutes = parseInt(match[1], 10) || 0;
        const seconds = parseInt(match[2], 10) || 0;
        const milliseconds = match[3] ? parseFloat(`0.${match[3].padEnd(3, '0')}`) : 0;
        const text = match[4]?.trim() || '';

        // Skip empty lines and invalid times
        if (text && !isNaN(minutes) && !isNaN(seconds) && minutes >= 0 && seconds >= 0 && seconds < 60) {
            const time = minutes * 60 + seconds + milliseconds;
            lines.push({
                time,
                text,
            });
        }
    }

    // Remove duplicates and sort by time
    const uniqueLines = Array.from(
        new Map(lines.map(line => [line.time, line])).values()
    ).sort((a, b) => a.time - b.time);

    // Debug: log parsing results
    if (uniqueLines.length > 0) {
        console.log(`[parseLRC] Parsed ${uniqueLines.length} lines from LRC text`);
        console.log(`[parseLRC] Time range: ${uniqueLines[0].time.toFixed(2)}s - ${uniqueLines[uniqueLines.length - 1].time.toFixed(2)}s`);
    } else if (lrcText && lrcText.trim().length > 0) {
        console.warn('[parseLRC] No lines parsed from LRC text. Text length:', lrcText.length);
        console.warn('[parseLRC] First 100 chars:', lrcText.substring(0, 100));
    }

    return uniqueLines;
}

/**
 * Search for lyrics using LRCLib API with intelligent fallbacks
 */
export async function searchLyrics(
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): Promise<Lyrics | null> {
    // Validate inputs
    if (!trackName || !artistName || trackName.trim() === '' || artistName.trim() === '') {
        console.warn('[LyricsService] Invalid search params:', { trackName, artistName });
        return null;
    }

    const searchAttempts = [
        // First attempt: full search with all parameters
        { trackName, artistName, albumName, duration },
        // Second attempt: cleaned track name
        { trackName: cleanTrackTitle(trackName), artistName, albumName, duration },
        // Third attempt: without album
        { trackName, artistName, albumName: undefined, duration },
        // Fourth attempt: cleaned track name without album
        { trackName: cleanTrackTitle(trackName), artistName, albumName: undefined, duration },
        // Fifth attempt: only track and artist
        { trackName, artistName, albumName: undefined, duration: undefined },
        // Sixth attempt: cleaned track name only
        { trackName: cleanTrackTitle(trackName), artistName, albumName: undefined, duration: undefined },
    ];

    // Remove duplicates
    const uniqueAttempts = Array.from(
        new Map(
            searchAttempts.map(attempt => [
                `${attempt.trackName}|${attempt.artistName}|${attempt.albumName || ''}|${attempt.duration || ''}`,
                attempt
            ])
        ).values()
    );

    let bestResult: Lyrics | null = null;
    let bestScore = 0;

    for (const attempt of uniqueAttempts) {
        try {
            const result = await performSearch(attempt.trackName, attempt.artistName, attempt.albumName, attempt.duration);

            if (result) {
                // Calculate match score - use original trackName for comparison, not cleaned version
                const trackScore = calculateSimilarity(result.trackName, trackName);
                const artistScore = calculateSimilarity(result.artistName, artistName);
                const albumScore = attempt.albumName ? calculateSimilarity(result.albumName || '', attempt.albumName) : 1;
                const durationScore = attempt.duration && result.duration
                    ? 1 - Math.abs(result.duration - attempt.duration) / Math.max(result.duration, attempt.duration)
                    : 1;

                const totalScore = (trackScore * 0.4) + (artistScore * 0.4) + (albumScore * 0.1) + (durationScore * 0.1);

                // Prefer results with synced lyrics (result is already a Lyrics object with parsed syncedLyrics array)
                const hasSyncedLyrics = result.syncedLyrics && Array.isArray(result.syncedLyrics) && result.syncedLyrics.length > 0;
                const finalScore = totalScore * (hasSyncedLyrics ? 1.2 : 1.0);

                if (finalScore > bestScore) {
                    bestScore = finalScore;
                    bestResult = result;

                    // If we found a very good match (>0.9), stop searching
                    if (finalScore > 0.9) {
                        console.log('[LyricsService] Found excellent match, stopping search');
                        break;
                    }
                }
            }
        } catch (error) {
            console.warn('[LyricsService] Search attempt failed:', error);
            // Continue with next attempt
        }
    }

    if (bestResult) {
        console.log(`[LyricsService] Best match found (score: ${bestScore.toFixed(2)}):`, bestResult.trackName, '-', bestResult.artistName);
    } else {
        console.log('[LyricsService] No lyrics found after all attempts');
    }

    return bestResult;
}

/**
 * Perform a single search request with retry logic
 */
async function performSearch(
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): Promise<Lyrics | null> {
    const params = new URLSearchParams({
        track_name: trackName.trim(),
        artist_name: artistName.trim(),
    });

    if (albumName && albumName.trim()) {
        params.append('album_name', albumName.trim());
    }
    // Duration removed from API request queries as it is not a supported filter parameter
    // We still pass it to this function to use in result scoring later

    const url = `${LRCLIB_API_BASE}/search?${params}`;
    console.log('[LyricsService] Searching:', url);
    console.log('[LyricsService] Search params:', { trackName, artistName, albumName, duration });

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[LyricsService] Attempt ${attempt}/${MAX_RETRIES} - Fetching:`, url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(15000), // 15 second timeout
                mode: 'cors', // Explicitly set CORS mode
            });

            console.log('[LyricsService] Response status:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Not found, but not an error
                }
                if (response.status >= 500 && attempt < MAX_RETRIES) {
                    // Server error, retry
                    console.warn(`[LyricsService] Server error ${response.status}, retrying (${attempt}/${MAX_RETRIES})...`);
                    await sleep(RETRY_DELAY_MS * attempt);
                    continue;
                }
                throw new Error(`LRCLib API error: ${response.status}`);
            }

            let results;
            try {
                const responseText = await response.text();
                console.log('[LyricsService] Raw response (first 500 chars):', responseText.substring(0, 500));

                if (!responseText || responseText.trim() === '') {
                    console.warn('[LyricsService] Empty response body');
                    return null;
                }

                results = JSON.parse(responseText);
            } catch (parseError) {
                console.error('[LyricsService] Failed to parse JSON response:', parseError);
                return null;
            }

            console.log('[LyricsService] API response:', {
                isArray: Array.isArray(results),
                length: Array.isArray(results) ? results.length : 0,
                type: typeof results,
                firstResult: Array.isArray(results) && results.length > 0 ? results[0] : null
            });

            if (!results || !Array.isArray(results) || results.length === 0) {
                console.log('[LyricsService] No results found in API response');
                if (results && !Array.isArray(results)) {
                    console.warn('[LyricsService] Response is not an array:', typeof results, results);
                }
                return null;
            }

            // Select best result from multiple matches
            const bestMatch = selectBestResult(results, trackName, artistName, albumName, duration);

            if (!bestMatch) {
                console.error('[LyricsService] selectBestResult returned null/undefined');
                return null;
            }

            console.log('[LyricsService] Best match selected:', {
                id: bestMatch.id,
                trackName: bestMatch.track_name,
                artistName: bestMatch.artist_name,
                hasSynced: !!bestMatch.synced_lyrics,
                syncedLength: bestMatch.synced_lyrics ? (typeof bestMatch.synced_lyrics === 'string' ? bestMatch.synced_lyrics.length : 'not string') : 0,
                hasPlain: !!bestMatch.plain_lyrics,
                plainLength: bestMatch.plain_lyrics ? (typeof bestMatch.plain_lyrics === 'string' ? bestMatch.plain_lyrics.length : 'not string') : 0,
                instrumental: bestMatch.instrumental
            });

            // Parse synced lyrics if available
            const syncedLyricsRaw = bestMatch.synced_lyrics || bestMatch.syncedLyrics;
            let parsedSynced: LyricsLine[] | undefined;
            if (syncedLyricsRaw && typeof syncedLyricsRaw === 'string') {
                try {
                    parsedSynced = parseLRC(syncedLyricsRaw);
                    console.log('[LyricsService] Parsed synced lyrics:', parsedSynced.length, 'lines');
                } catch (parseError) {
                    console.error('[LyricsService] Failed to parse LRC:', parseError);
                    parsedSynced = undefined;
                }
            } else if (syncedLyricsRaw) {
                console.warn('[LyricsService] synced_lyrics is not a string:', typeof syncedLyricsRaw);
            }

            const lyrics: Lyrics = {
                id: bestMatch.id,
                trackName: bestMatch.track_name || bestMatch.trackName || trackName,
                artistName: bestMatch.artist_name || bestMatch.artistName || artistName,
                albumName: bestMatch.album_name || bestMatch.albumName || albumName,
                duration: bestMatch.duration,
                plainLyrics: bestMatch.plain_lyrics || bestMatch.plainLyrics || undefined,
                syncedLyrics: parsedSynced,
                instrumental: bestMatch.instrumental || false,
            };

            console.log('[LyricsService] Final lyrics object:', {
                id: lyrics.id,
                hasSynced: !!lyrics.syncedLyrics,
                syncedCount: lyrics.syncedLyrics?.length || 0,
                hasPlain: !!lyrics.plainLyrics,
                instrumental: lyrics.instrumental
            });

            return lyrics;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Log detailed error information
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                console.error(`[LyricsService] Network/CORS error (attempt ${attempt}):`, error.message);
                console.error('[LyricsService] This might be a CORS issue. The API may not allow direct browser requests.');
                console.error('[LyricsService] Consider using a proxy server or CORS extension for development.');
            } else if (error instanceof DOMException && error.name === 'AbortError') {
                console.error(`[LyricsService] Request timeout (attempt ${attempt})`);
            } else {
                console.error(`[LyricsService] Request error (attempt ${attempt}):`, error);
            }

            if (attempt < MAX_RETRIES && !(error instanceof DOMException && error.name === 'AbortError')) {
                // Retry on network errors, but not on abort
                console.warn(`[LyricsService] Retrying in ${RETRY_DELAY_MS * attempt}ms...`);
                await sleep(RETRY_DELAY_MS * attempt);
            } else {
                break;
            }
        }
    }

    if (lastError) {
        console.error('[LyricsService] Search failed after all retries:', lastError);
        console.error('[LyricsService] Last error details:', {
            name: lastError.name,
            message: lastError.message,
            stack: lastError.stack
        });
    }

    return null;
}

/**
 * Select the best result from multiple search results
 */
function selectBestResult(
    results: any[],
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): any {
    if (results.length === 1) return results[0];

    // Score each result
    const scoredResults = results.map(result => {
        const itemTrackName = result.track_name || result.trackName || '';
        const itemArtistName = result.artist_name || result.artistName || '';
        const itemAlbumName = result.album_name || result.albumName || '';

        const trackScore = calculateSimilarity(itemTrackName, trackName);
        const artistScore = calculateSimilarity(itemArtistName, artistName);
        const albumScore = albumName ? calculateSimilarity(itemAlbumName, albumName) : 1;
        const durationScore = duration && result.duration
            ? 1 - Math.abs(result.duration - duration) / Math.max(result.duration, duration)
            : 1;

        // Prefer results with synced lyrics
        const syncedRaw = result.synced_lyrics || result.syncedLyrics;
        const plainRaw = result.plain_lyrics || result.plainLyrics;

        // Ensure syncedRaw and plainRaw are strings before calling trim()
        const hasSynced = syncedRaw && typeof syncedRaw === 'string' && syncedRaw.trim().length > 0;
        const hasPlain = plainRaw && typeof plainRaw === 'string' && plainRaw.trim().length > 0;
        const contentScore = hasSynced ? 1.2 : (hasPlain ? 1.0 : 0.5);

        const totalScore =
            (trackScore * 0.4) +
            (artistScore * 0.4) +
            (albumScore * 0.1) +
            (durationScore * 0.1) +
            (contentScore * 0.1);

        return { result, score: totalScore };
    });

    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);

    // Safety check: ensure we have at least one result
    if (scoredResults.length === 0) {
        console.warn('[LyricsService] selectBestResult: No scored results available');
        return null;
    }

    return scoredResults[0].result;
}

/**
 * Get lyrics by ID from LRCLib with retry logic
 */
export async function getLyricsById(id: number): Promise<Lyrics | null> {
    if (!id || isNaN(id)) {
        console.warn('[LyricsService] Invalid lyrics ID:', id);
        return null;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const url = `${LRCLIB_API_BASE}/get/${id}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(15000), // 15 second timeout
                mode: 'cors',
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                if (response.status >= 500 && attempt < MAX_RETRIES) {
                    console.warn(`[LyricsService] Server error ${response.status}, retrying (${attempt}/${MAX_RETRIES})...`);
                    await sleep(RETRY_DELAY_MS * attempt);
                    continue;
                }
                throw new Error(`LRCLib API error: ${response.status}`);
            }

            const result = await response.json();

            // Handle both camelCase and snake_case response formats
            const syncedRaw = result.synced_lyrics || result.syncedLyrics;
            const syncedParsed = (syncedRaw && typeof syncedRaw === 'string') 
                ? parseLRC(syncedRaw) 
                : undefined;

            const lyrics: Lyrics = {
                id: result.id,
                trackName: result.track_name || result.trackName,
                artistName: result.artist_name || result.artistName,
                albumName: result.album_name || result.albumName,
                duration: result.duration,
                plainLyrics: result.plain_lyrics || result.plainLyrics || undefined,
                syncedLyrics: syncedParsed,
                instrumental: result.instrumental || false,
            };

            return lyrics;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < MAX_RETRIES && !(error instanceof DOMException && error.name === 'AbortError')) {
                console.warn(`[LyricsService] Request failed, retrying (${attempt}/${MAX_RETRIES})...`, error);
                await sleep(RETRY_DELAY_MS * attempt);
            } else {
                break;
            }
        }
    }

    if (lastError) {
        console.error('[LyricsService] Failed to get lyrics by ID after retries:', lastError);
    }

    return null;
}

/**
 * Get lyrics for a track with intelligent caching
 */
export async function getLyricsForTrack(
    trackId: string,
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number
): Promise<Lyrics | null> {
    if (!trackId || !trackName || !artistName) {
        console.warn('[LyricsService] Invalid parameters for getLyricsForTrack');
        return null;
    }

    try {
        const db = await getDB();

        // Check cache first
        const cached = await db.get('lyricsCache', trackId);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            // Use shorter cache duration for null results (5 days vs 30 days)
            const maxAge = cached.lyrics ? CACHE_DURATION_MS : CACHE_DURATION_MS / 6;
            
            if (age < maxAge) {
                console.log('[LyricsService] Returning cached lyrics');
                return cached.lyrics;
            }
            // Cache expired, delete it
            console.log('[LyricsService] Cache expired, fetching fresh lyrics');
            await db.delete('lyricsCache', trackId);
        }

        // Fetch from API with intelligent search
        const lyrics = await searchLyrics(trackName, artistName, albumName, duration);

        // Cache the result (even if null, but cache nulls for shorter time)
        const cacheDuration = lyrics
            ? CACHE_DURATION_MS
            : CACHE_DURATION_MS / 6; // Cache nulls for only 5 days

        await db.put('lyricsCache', {
            trackId,
            lyrics,
            timestamp: Date.now(),
            trackName,
            artistName,
        });

        return lyrics;
    } catch (error) {
        console.error('[LyricsService] Error in getLyricsForTrack:', error);
        return null;
    }
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
