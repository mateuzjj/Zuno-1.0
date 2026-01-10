import { SpotifyClient } from './spotifyClient';
import { SpotifyMatcher } from './spotifyMatcher';
import { LikedSongsService } from './likedSongsService';
import { FollowService } from './followService';
import { Track, Artist } from '../types';

export interface ImportProgress {
    phase: 'fetching' | 'matching' | 'saving';
    total: number;
    processed: number;
    matched: number;
    failed: number;
    currentItem: string;
}

export interface ImportResult {
    total: number;
    imported: number;
    failed: string[];
}

export interface ImportAllResult {
    likedSongs: ImportResult;
    followedArtists: ImportResult;
}

/**
 * Import liked songs from Spotify
 */
export async function importLikedSongs(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        total: 0,
        imported: 0,
        failed: [],
    };

    try {
        // Phase 1: Fetch from Spotify
        onProgress?.({
            phase: 'fetching',
            total: 0,
            processed: 0,
            matched: 0,
            failed: 0,
            currentItem: 'Buscando músicas do Spotify...',
        });

        const spotifyTracks = await SpotifyClient.getLikedTracks((current, total) => {
            onProgress?.({
                phase: 'fetching',
                total,
                processed: current,
                matched: 0,
                failed: 0,
                currentItem: `Carregando ${current}/${total} músicas...`,
            });
        });

        result.total = spotifyTracks.length;
        console.log(`[SpotifyImport] Fetched ${result.total} tracks from Spotify`);

        // Phase 2: Match and save
        for (let i = 0; i < spotifyTracks.length; i++) {
            const spotifyTrack = spotifyTracks[i];

            onProgress?.({
                phase: 'matching',
                total: result.total,
                processed: i,
                matched: result.imported,
                failed: result.failed.length,
                currentItem: `${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`,
            });

            try {
                console.log(`[SpotifyImport] Matching track ${i + 1}/${result.total}: ${spotifyTrack.name}`);
                const matchedTrack = await SpotifyMatcher.matchTrack(spotifyTrack);

                if (matchedTrack) {
                    console.log(`[SpotifyImport] Match found! Saving to IndexedDB...`);
                    await LikedSongsService.likeTrack(matchedTrack);
                    result.imported++;
                    console.log(`[SpotifyImport] Successfully imported ${result.imported}/${result.total}`);
                } else {
                    console.log(`[SpotifyImport] No match found for: ${spotifyTrack.name}`);
                    result.failed.push(`${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`);
                }
            } catch (error) {
                console.error('[SpotifyImport] Failed to import track:', spotifyTrack.name, error);
                result.failed.push(`${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`);
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        onProgress?.({
            phase: 'saving',
            total: result.total,
            processed: result.total,
            matched: result.imported,
            failed: result.failed.length,
            currentItem: 'Concluído!',
        });

    } catch (error) {
        console.error('Failed to import liked songs:', error);
        throw error;
    }

    return result;
}

/**
 * Import followed artists from Spotify
 */
export async function importFollowedArtists(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        total: 0,
        imported: 0,
        failed: [],
    };

    try {
        // Phase 1: Fetch
        onProgress?.({
            phase: 'fetching',
            total: 0,
            processed: 0,
            matched: 0,
            failed: 0,
            currentItem: 'Buscando artistas do Spotify...',
        });

        const spotifyArtists = await SpotifyClient.getFollowedArtists((current) => {
            onProgress?.({
                phase: 'fetching',
                total: 0,
                processed: current,
                matched: 0,
                failed: 0,
                currentItem: `Carregando ${current} artistas...`,
            });
        });

        result.total = spotifyArtists.length;

        // Phase 2: Match and save
        for (let i = 0; i < spotifyArtists.length; i++) {
            const spotifyArtist = spotifyArtists[i];

            onProgress?.({
                phase: 'matching',
                total: result.total,
                processed: i,
                matched: result.imported,
                failed: result.failed.length,
                currentItem: spotifyArtist.name,
            });

            try {
                const matchedArtist = await SpotifyMatcher.matchArtist(spotifyArtist);

                if (matchedArtist) {
                    await FollowService.followArtist(matchedArtist);
                    result.imported++;
                } else {
                    result.failed.push(spotifyArtist.name);
                }
            } catch (error) {
                console.error('Failed to import artist:', spotifyArtist.name, error);
                result.failed.push(spotifyArtist.name);
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        onProgress?.({
            phase: 'saving',
            total: result.total,
            processed: result.total,
            matched: result.imported,
            failed: result.failed.length,
            currentItem: 'Concluído!',
        });

    } catch (error) {
        console.error('Failed to import followed artists:', error);
        throw error;
    }

    return result;
}

/**
 * Import all data from Spotify
 */
export async function importAll(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportAllResult> {
    const likedSongs = await importLikedSongs(onProgress);
    const followedArtists = await importFollowedArtists(onProgress);

    return {
        likedSongs,
        followedArtists,
    };
}

export const SpotifyImportService = {
    importLikedSongs,
    importFollowedArtists,
    importAll,
};
