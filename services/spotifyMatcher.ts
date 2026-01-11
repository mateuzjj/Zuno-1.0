import { api } from './api';
import { SpotifyTrack, SpotifyArtist, Track, Artist } from '../types';

/**
 * Normalize string for comparison (remove accents, lowercase, trim)
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
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

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1, 1 = identical)
 */
function stringSimilarity(str1: string, str2: string): number {
    const normalized1 = normalizeString(str1);
    const normalized2 = normalizeString(str2);

    if (normalized1 === normalized2) return 1;

    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 1;

    const distance = levenshtein(normalized1, normalized2);
    return 1 - (distance / maxLength);
}

/**
 * Match Spotify track to Zuno track
 */
export async function matchTrack(spotifyTrack: SpotifyTrack): Promise<Track | null> {
    try {
        // Build search query
        const artistName = spotifyTrack.artists[0]?.name || '';
        const trackName = spotifyTrack.name;
        const searchQuery = `${trackName} ${artistName}`;

        console.log(`[SpotifyMatcher] Searching for: "${searchQuery}"`);

        // Search in Zuno
        const results = await api.search(searchQuery);

        if (results.length === 0) {
            console.warn(`[SpotifyMatcher] No results found for "${searchQuery}"`);
            return null;
        }

        // Calculate similarity scores
        const scored = results.map(track => {
            const titleSimilarity = stringSimilarity(track.title, trackName);
            const artistSimilarity = stringSimilarity(track.artist, artistName);

            // Duration match (±5 seconds tolerance)
            const spotifyDuration = spotifyTrack.duration_ms / 1000;
            const durationDiff = Math.abs(track.duration - spotifyDuration);
            const durationMatch = durationDiff <= 5 ? 1 : Math.max(0, 1 - (durationDiff / 30));

            // Weighted score
            const score = (
                titleSimilarity * 0.5 +    // Title is most important
                artistSimilarity * 0.35 +   // Artist is important
                durationMatch * 0.15        // Duration helps but isn't critical
            );

            return { track, score, titleSimilarity, artistSimilarity, durationMatch };
        });

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        const best = scored[0];

        // Detailed log for debugging matches
        console.debug(`[SpotifyMatcher] Matching "${trackName}" by ${artistName}:`, {
            bestMatch: `${best.track.title} by ${best.track.artist}`,
            score: best.score.toFixed(2),
            details: {
                titleSim: best.titleSimilarity.toFixed(2),
                artistSim: best.artistSimilarity.toFixed(2),
                durationMatch: best.durationMatch.toFixed(2)
            }
        });

        // Threshold: require at least 0.7 similarity
        if (best.score >= 0.7) {
            return best.track;
        }

        console.warn(`[SpotifyMatcher] Best match score too low (${best.score.toFixed(2)} < 0.7) for "${trackName}"`);
        return null;
    } catch (error) {
        console.error('[SpotifyMatcher] Match failed for track:', spotifyTrack.name, error);
        return null;
    }
}

/**
 * Match Spotify artist to Zuno artist
 */
export async function matchArtist(spotifyArtist: SpotifyArtist): Promise<Artist | null> {
    try {
        console.log(`[SpotifyMatcher] Searching for artist: "${spotifyArtist.name}"`);

        const results = await api.searchArtists(spotifyArtist.name);

        if (results.length === 0) {
            console.log(`[SpotifyMatcher] No artist results found`);
            return null;
        }

        // Find best match by name similarity
        const scored = results.map((artist: any) => {
            const similarity = stringSimilarity(artist.name, spotifyArtist.name);
            return { artist, similarity };
        });

        scored.sort((a, b) => b.similarity - a.similarity);

        const best = scored[0];

        if (best.similarity >= 0.85) {
            console.log(`[SpotifyMatcher] Matched artist: "${best.artist.name}" (similarity: ${best.similarity.toFixed(2)})`);
            return best.artist;
        }

        console.log(`[SpotifyMatcher] Artist match score too low (${best.similarity.toFixed(2)} < 0.85)`);
        return null;
    } catch (error) {
        console.error('[SpotifyMatcher] Artist match failed:', error);
        return null;
    }
}

export const SpotifyMatcher = {
    matchTrack,
    matchArtist,
};
